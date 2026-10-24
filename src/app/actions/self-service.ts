'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createMayarInvoice, getMayarInvoice, type MayarInvoiceResponse } from '@/lib/mayar';
import type { Cabang, Produk, Transaksi } from '@/types/database';

export interface PublicMenuResponse {
  success: boolean;
  error?: string;
  cabang?: Cabang;
  cabangs?: Cabang[];
  products?: Produk[];
  branchStockMap?: Record<string, number>;
  isOpen?: boolean;
}

export interface SelfServiceCheckoutPayload {
  cabang_id: string;
  nomor_meja: string;
  nama_pelanggan: string;
  catatan?: string | null;
  items: {
    produk_id: string;
    jumlah: number;
  }[];
}

export interface SelfServiceOrderResult {
  success: boolean;
  message?: string;
  error?: string;
  transaksiId?: string;
  nomorStruk?: string;
  invoice?: MayarInvoiceResponse;
  total?: number;
}

export interface SelfServiceStatusResult {
  success: boolean;
  status: 'lunas' | 'menunggu_bayar' | 'batal' | 'void';
  transaksi?: Transaksi;
}

/**
 * Mengambil informasi cabang dan daftar menu produk aktif beserta stok cabang secara publik
 */
export async function getPublicCabangAndMenu(cabangParam?: string): Promise<PublicMenuResponse> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil semua cabang aktif
    const { data: allCabangs, error: cabangError } = await (supabase
      .from('cabang') as any)
      .select('*')
      .eq('aktif', true)
      .order('nama');

    if (cabangError || !allCabangs || allCabangs.length === 0) {
      return { success: false, error: 'Tidak ada cabang cafe yang aktif saat ini.' };
    }

    const cabangsList = allCabangs as Cabang[];

    // 2. Tentukan cabang yang dipilih
    let selectedCabang: Cabang | undefined;
    if (cabangParam) {
      const cleanParam = cabangParam.trim().toUpperCase();
      selectedCabang = cabangsList.find(
        (c) => c.kode.toUpperCase() === cleanParam || c.id === cabangParam
      );
    }

    if (!selectedCabang) {
      selectedCabang = cabangsList[0];
    }

    // 3. Cek apakah ada shift kasir yang buka di cabang ini
    const { data: openShift } = await (supabase
      .from('shift_kasir') as any)
      .select('id, status, kasir_id')
      .eq('cabang_id', selectedCabang.id)
      .eq('status', 'buka')
      .order('dibuka_pada', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isOpen = !!openShift;

    // 4. Ambil semua produk aktif
    const { data: products, error: prodError } = await (supabase
      .from('produk') as any)
      .select('*')
      .eq('aktif', true)
      .order('nama');

    if (prodError || !products) {
      return { success: false, error: 'Gagal memuat katalog menu produk.' };
    }

    const productsList = products as Produk[];

    // 5. Ambil stok cabang untuk cabang ini
    const { data: stockList } = await (supabase
      .from('stok_cabang') as any)
      .select('produk_id, jumlah')
      .eq('cabang_id', selectedCabang.id);

    const branchStockMap: Record<string, number> = {};
    if (stockList) {
      for (const item of (stockList as any[])) {
        branchStockMap[item.produk_id] = item.jumlah;
      }
    }

    return {
      success: true,
      cabang: selectedCabang,
      cabangs: cabangsList,
      products: productsList,
      branchStockMap,
      isOpen,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal memuat data menu: ${err?.message || err}`,
    };
  }
}

/**
 * Membuat transaksi pemesanan self-service dari meja pelanggan via QRIS Mayar
 */
export async function buatPesananSelfServiceAction(
  payload: SelfServiceCheckoutPayload
): Promise<SelfServiceOrderResult> {
  try {
    const supabase = createAdminClient();

    // 1. Validasi Input Dasar
    if (!payload.cabang_id) {
      return { success: false, error: 'Cabang cafe tidak valid.' };
    }

    const nomorMeja = payload.nomor_meja?.trim();
    if (!nomorMeja) {
      return { success: false, error: 'Nomor meja wajib diisi.' };
    }

    const namaPelanggan = payload.nama_pelanggan?.trim() || 'Pelanggan Meja';

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'Keranjang pesanan masih kosong.' };
    }

    for (const item of payload.items) {
      if (!item.produk_id || isNaN(item.jumlah) || item.jumlah < 1 || item.jumlah > 99) {
        return { success: false, error: 'Jumlah produk tidak valid (1-99 per item).' };
      }
    }

    // 2. Validasi Shift Kasir yang sedang buka di cabang ini (BR-02)
    const { data: openShift, error: shiftError } = await (supabase
      .from('shift_kasir') as any)
      .select('id, status, kasir_id')
      .eq('cabang_id', payload.cabang_id)
      .eq('status', 'buka')
      .order('dibuka_pada', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftError || !openShift) {
      return {
        success: false,
        error: 'Maaf, cafe saat ini belum buka atau tidak ada kasir yang standby.',
      };
    }

    // 3. Verifikasi harga resmi produk dari database (BR-05)
    const productIds = payload.items.map((i) => i.produk_id);
    const { data: products, error: prodError } = await (supabase
      .from('produk') as any)
      .select('id, nama, harga_jual, lacak_stok, aktif')
      .in('id', productIds);

    if (prodError || !products || products.length !== productIds.length) {
      return { success: false, error: 'Beberapa menu pesanan tidak valid atau sudah tidak aktif.' };
    }

    const productsList = products as Produk[];
    const prodMap = new Map(productsList.map((p) => [p.id, p]));
    let verifiedSubtotal = 0;

    for (const item of payload.items) {
      const p = prodMap.get(item.produk_id)!;
      verifiedSubtotal += p.harga_jual * item.jumlah;
    }

    // 4. Buat Tagihan ke Mayar API V2
    const invoiceItems = payload.items.map((it) => {
      const p = prodMap.get(it.produk_id)!;
      return {
        description: p.nama,
        quantity: it.jumlah,
        rate: p.harga_jual,
      };
    });

    let mayarInvoice: MayarInvoiceResponse;
    try {
      mayarInvoice = await createMayarInvoice({
        name: `${namaPelanggan} (Meja ${nomorMeja})`,
        description: `Pemesanan Meja ${nomorMeja} Lumbung Kopi (${new Date().toLocaleTimeString('id-ID')})`,
        items: invoiceItems,
      });
    } catch (err: any) {
      return {
        success: false,
        error: `Gagal membuat tagihan QRIS Mayar: ${err?.message || err}`,
      };
    }

    // 5. Panggil create_transaksi_atomic via service role (Kunci stok & buat nomor struk)
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
      'create_transaksi_atomic',
      {
        p_shift_id: openShift.id,
        p_subtotal: verifiedSubtotal,
        p_diskon: 0,
        p_alasan_diskon: null,
        p_total: verifiedSubtotal,
        p_metode_bayar: 'qris',
        p_uang_diterima: verifiedSubtotal,
        p_kembalian: 0,
        p_items: payload.items,
        p_nomor_meja: nomorMeja,
        p_nama_pelanggan: namaPelanggan,
        p_sumber_pesanan: 'self_service',
      }
    );

    if (rpcError) {
      return {
        success: false,
        error: rpcError.message || 'Gagal menyimpan pesanan ke sistem cafe.',
      };
    }

    const transaksiId = rpcResult?.transaksi_id;

    // 6. Set status awal menjadi 'menunggu_bayar' dan simpan mayar_invoice_id
    const { error: updateError } = await (supabase
      .from('transaksi') as any)
      .update({
        status: 'menunggu_bayar',
        mayar_invoice_id: mayarInvoice.id,
        dibayar_pada: null,
      })
      .eq('id', transaksiId);

    if (updateError) {
      return {
        success: false,
        error: `Gagal memperbarui status transaksi: ${updateError.message}`,
      };
    }

    return {
      success: true,
      message: 'Tagihan QRIS berhasil dibuat. Silakan selesaikan pembayaran.',
      transaksiId,
      nomorStruk: rpcResult.nomor_struk,
      invoice: mayarInvoice,
      total: verifiedSubtotal,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Terjadi kendala saat memproses pesanan: ${err?.message || err}`,
    };
  }
}

/**
 * Memeriksa status transaksi pesanan self-service (apakah sudah lunas dibayar via Mayar)
 */
export async function cekStatusPesananSelfServiceAction(
  transaksiId: string
): Promise<SelfServiceStatusResult> {
  try {
    const supabase = createAdminClient();

    const { data: trx, error } = await (supabase
      .from('transaksi') as any)
      .select('*, cabang:cabang(*), items:transaksi_item(*)')
      .eq('id', transaksiId)
      .maybeSingle();

    if (error || !trx) {
      return { success: false, status: 'batal' };
    }

    // Jika sudah lunas, langsung return
    if (trx.status === 'lunas') {
      return { success: true, status: 'lunas', transaksi: trx };
    }

    // Jika masih menunggu_bayar dan ada mayar_invoice_id, cek ke Mayar API secara aktif
    if (trx.status === 'menunggu_bayar' && trx.mayar_invoice_id) {
      try {
        const mayarInvoice = await getMayarInvoice(trx.mayar_invoice_id);

        if (mayarInvoice.status === 'paid' || mayarInvoice.status === 'closed') {
          // Update database menjadi lunas
          const nowWib = new Date().toISOString();
          await (supabase.from('transaksi') as any)
            .update({
              status: 'lunas',
              dibayar_pada: nowWib,
            })
            .eq('id', trx.id);

          // Update total QRIS pada shift kasir
          if (trx.shift_id) {
            const { data: shift } = await (supabase
              .from('shift_kasir') as any)
              .select('total_qris')
              .eq('id', trx.shift_id)
              .maybeSingle();

            if (shift) {
              await (supabase.from('shift_kasir') as any)
                .update({
                  total_qris: (shift.total_qris || 0) + trx.total,
                })
                .eq('id', trx.shift_id);
            }
          }

          trx.status = 'lunas';
          trx.dibayar_pada = nowWib;
          return { success: true, status: 'lunas', transaksi: trx };
        }
      } catch (e) {
        // Abaikan error koneksi Mayar sementara, tetap return status menunggu_bayar
      }
    }

    return {
      success: true,
      status: trx.status as any,
      transaksi: trx,
    };
  } catch (err) {
    return { success: false, status: 'batal' };
  }
}
