'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { 
  createMayarInvoice, 
  getMayarInvoice, 
  getMayarInvoicesList,
  type MayarInvoiceResponse,
  type MayarInvoiceListItem 
} from '@/lib/mayar';
import type { Transaksi } from '@/types/database';
import type { CheckoutPayload } from '@/app/actions/pos';

export interface MayarCheckoutResult {
  success: boolean;
  message?: string;
  error?: string;
  transaksi?: Transaksi;
  invoice?: MayarInvoiceResponse;
}

export interface MayarStatusCheckResult {
  success: boolean;
  status: 'lunas' | 'menunggu_bayar' | 'batal' | 'void';
  message?: string;
  transaksi?: Transaksi;
  remainingSeconds?: number;
}

/**
 * Server Action: Inisiasi Transaksi QRIS Dinamis Mayar Sandbox (PRD Bagian 11)
 * Alur:
 * 1. Validasi kasir & shift aktif (BR-02)
 * 2. Hitung & validasi subtotal resmi server, diskon <= 10% (BR-05, BR-06)
 * 3. Buat Tagihan ke Mayar API V2 (POST /invoices/create)
 * 4. Panggil create_transaksi_atomic untuk mengamankan stok produk (anti-minus) dan dapatkan nomor struk
 * 5. Set status transaksi ke 'menunggu_bayar' dan simpan mayar_invoice_id
 */
export async function buatTransaksiMayarAction(payload: CheckoutPayload): Promise<MayarCheckoutResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi Anda tidak valid atau akun dinonaktifkan.' };
  }

  if (profile.peran !== 'kasir' && profile.peran !== 'owner') {
    return { success: false, error: 'Hanya Kasir atau Owner yang berhak memproses transaksi QRIS.' };
  }

  const supabase = await createClient();

  // 1. Validasi Shift
  const { data: shift, error: shiftError } = await (supabase
    .from('shift_kasir') as any)
    .select('id, status, kasir_id, cabang_id')
    .eq('id', payload.shift_id)
    .eq('kasir_id', profile.id)
    .maybeSingle();

  if (shiftError || !shift || shift.status !== 'buka') {
    return { success: false, error: 'Shift kasir tidak ditemukan atau tidak berstatus buka.' };
  }

  // 2. Validasi Keranjang & Verifikasi Harga Resmi
  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: 'Keranjang belanja masih kosong.' };
  }

  const productIds = payload.items.map((i) => i.produk_id);
  const { data: products, error: prodError } = await (supabase
    .from('produk') as any)
    .select('id, nama, harga_jual, aktif')
    .in('id', productIds);

  if (prodError || !products || products.length !== productIds.length) {
    return { success: false, error: 'Beberapa produk tidak ditemukan di database.' };
  }

  const prodMap = new Map<string, any>();
  for (const p of products) {
    if (!p.aktif) {
      return { success: false, error: `Produk "${p.nama}" nonaktif dan tidak dapat dijual.` };
    }
    prodMap.set(p.id, p);
  }

  let verifiedSubtotal = 0;
  for (const item of payload.items) {
    const p = prodMap.get(item.produk_id);
    verifiedSubtotal += p.harga_jual * item.jumlah;
  }

  const maxDiskon = Math.round(verifiedSubtotal * 0.10);
  const diskon = Math.round(Number(payload.diskon) || 0);
  const alasanDiskon = (payload.alasan_diskon || '').trim();

  if (diskon < 0 || diskon > maxDiskon) {
    return { success: false, error: `Diskon tidak boleh melebihi 10% (Rp ${maxDiskon.toLocaleString('id-ID')}).` };
  }

  if (diskon > 0 && alasanDiskon.length === 0) {
    return { success: false, error: 'Alasan diskon wajib diisi jika diskon diberikan.' };
  }

  const expectedTotal = verifiedSubtotal - diskon;

  // 3. Request Pembuatan Invoice ke Mayar API V2
  let mayarInvoice: MayarInvoiceResponse;
  try {
    const invoiceItems = payload.items.map((it) => {
      const p = prodMap.get(it.produk_id);
      return {
        description: p.nama,
        quantity: it.jumlah,
        rate: p.harga_jual,
      };
    });

    // Jika ada diskon, tambahkan adjustment line item atau sesuaikan
    if (diskon > 0) {
      invoiceItems.push({
        description: `Diskon (${alasanDiskon})`,
        quantity: 1,
        rate: -diskon,
      });
    }

    const customerLabel = payload.nama_pelanggan?.trim() || 'Pelanggan';
    const tableLabel = payload.nomor_meja?.trim() ? ` (Meja ${payload.nomor_meja.trim()})` : '';

    mayarInvoice = await createMayarInvoice({
      name: `${customerLabel}${tableLabel} - Kasir ${profile.nama_lengkap}`,
      description: `Tagihan POS Kasir Lumbung Kopi (${new Date().toLocaleTimeString('id-ID')})`,
      items: invoiceItems,
    });
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal membuat tagihan QRIS Mayar: ${err?.message || err}`,
    };
  }

  // 4. Buat Transaksi Atomik di Database (Kunci Stok & Generate Nomor Struk)
  const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
    'create_transaksi_atomic',
    {
      p_shift_id: payload.shift_id,
      p_subtotal: verifiedSubtotal,
      p_diskon: diskon,
      p_alasan_diskon: diskon > 0 ? alasanDiskon : null,
      p_total: expectedTotal,
      p_metode_bayar: 'qris',
      p_uang_diterima: expectedTotal,
      p_kembalian: 0,
      p_items: payload.items,
      p_nomor_meja: payload.nomor_meja?.trim() || null,
      p_nama_pelanggan: payload.nama_pelanggan?.trim() || 'Pelanggan',
      p_sumber_pesanan: 'kasir',
    }
  );

  if (rpcError) {
    return {
      success: false,
      error: rpcError.message || 'Gagal menyimpan transaksi ke database.',
    };
  }

  const transaksiId = rpcResult?.transaksi_id;

  // 5. Update Status Transaksi menjadi 'menunggu_bayar' dan simpan mayar_invoice_id (PRD Bagian 11)
  const { error: updateTrxError } = await (supabase
    .from('transaksi') as any)
    .update({
      status: 'menunggu_bayar',
      mayar_invoice_id: mayarInvoice.id,
      dibayar_pada: null,
    })
    .eq('id', transaksiId);

  if (updateTrxError) {
    return {
      success: false,
      error: `Gagal memperbarui status transaksi Mayar: ${updateTrxError.message}`,
    };
  }

  // 6. Ambil data transaksi lengkap
  const { data: fullTransaksi } = await (supabase
    .from('transaksi') as any)
    .select(`
      *,
      cabang:cabang(*),
      kasir:profiles!transaksi_kasir_id_fkey(*),
      items:transaksi_item(*)
    `)
    .eq('id', transaksiId)
    .single();

  revalidatePath('/kasir');
  revalidatePath('/shift');
  revalidatePath('/transaksi');

  return {
    success: true,
    message: `Tagihan QRIS Mayar berhasil dibuat (Invoice: ${mayarInvoice.invoiceCode || mayarInvoice.id}).`,
    transaksi: fullTransaksi as Transaksi,
    invoice: mayarInvoice,
  };
}

/**
 * Server Action: Cek Status Pembayaran QRIS Mayar & Auto Timeout 10 Menit
 */
export async function cekStatusTransaksiMayarAction(transaksiId: string): Promise<MayarStatusCheckResult> {
  const supabase = await createClient();

  const { data: trx, error: fetchError } = await (supabase
    .from('transaksi') as any)
    .select(`
      *,
      cabang:cabang(*),
      kasir:profiles!transaksi_kasir_id_fkey(*),
      items:transaksi_item(*)
    `)
    .eq('id', transaksiId)
    .maybeSingle();

  if (fetchError || !trx) {
    return { success: false, status: 'void', message: 'Transaksi tidak ditemukan.' };
  }

  // 1. Jika sudah lunas
  if (trx.status === 'lunas') {
    return {
      success: true,
      status: 'lunas',
      transaksi: trx as Transaksi,
      message: 'Pembayaran QRIS telah lunas terverifikasi.',
    };
  }

  // 2. Jika sudah batal atau void
  if (trx.status === 'batal' || trx.status === 'void') {
    return {
      success: true,
      status: trx.status,
      transaksi: trx as Transaksi,
      message: `Transaksi berstatus '${trx.status}'.`,
    };
  }

  // 3. Status 'menunggu_bayar': Cek aturan batas waktu 10 menit (PRD Bagian 11 poin 4)
  const dibuatTime = new Date(trx.dibuat_pada).getTime();
  const now = Date.now();
  const sepuluhMenitMs = 10 * 60 * 1000;
  const elapsedMs = now - dibuatTime;

  if (elapsedMs > sepuluhMenitMs) {
    // Timeout otomatis: batalkan transaksi dan kembalikan stok
    await batalkanTransaksiInternal(supabase, trx, 'Kedaluwarsa otomatis (melebihi batas waktu 10 menit)');
    revalidatePath('/kasir');
    revalidatePath('/shift');
    revalidatePath('/transaksi');
    return {
      success: true,
      status: 'batal',
      message: 'Batas waktu pembayaran 10 menit telah habis. Transaksi otomatis dibatalkan dan stok dikembalikan.',
    };
  }

  const remainingSeconds = Math.max(0, Math.floor((sepuluhMenitMs - elapsedMs) / 1000));

  // 4. Periksa ke Mayar API secara real-time
  if (trx.mayar_invoice_id) {
    try {
      const mayarInv = await getMayarInvoice(trx.mayar_invoice_id);
      if (mayarInv.status === 'paid' || mayarInv.status === 'closed') {
        // Pembayaran sukses terverifikasi!
        await (supabase
          .from('transaksi') as any)
          .update({
            status: 'lunas',
            dibayar_pada: new Date().toISOString(),
          })
          .eq('id', trx.id);

        trx.status = 'lunas';
        trx.dibayar_pada = new Date().toISOString();

        revalidatePath('/kasir');
        revalidatePath('/shift');
        revalidatePath('/transaksi');
        revalidatePath('/laporan');

        return {
          success: true,
          status: 'lunas',
          transaksi: trx as Transaksi,
          message: 'Pembayaran QRIS Mayar berhasil diterima!',
        };
      }
    } catch (err) {
      // Jika error network/api Mayar, tetap kembalikan status saat ini
    }
  }

  return {
    success: true,
    status: 'menunggu_bayar',
    transaksi: trx as Transaksi,
    remainingSeconds,
  };
}

/**
 * Server Action: Kasir Membatalkan Transaksi QRIS Menunggu Bayar (Kembalikan Stok)
 */
export async function batalkanTransaksiMayarAction(
  transaksiId: string,
  alasan: string = 'Dibatalkan oleh kasir'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi tidak valid.' };
  }

  const supabase = await createClient();

  const { data: trx, error } = await (supabase
    .from('transaksi') as any)
    .select('*, items:transaksi_item(*)')
    .eq('id', transaksiId)
    .maybeSingle();

  if (error || !trx) {
    return { success: false, error: 'Transaksi tidak ditemukan.' };
  }

  if (trx.status !== 'menunggu_bayar') {
    return { success: false, error: `Hanya transaksi berstatus 'menunggu_bayar' yang dapat dibatalkan (Status: ${trx.status}).` };
  }

  await batalkanTransaksiInternal(supabase, trx, alasan);

  revalidatePath('/kasir');
  revalidatePath('/shift');
  revalidatePath('/transaksi');

  return {
    success: true,
    message: 'Transaksi QRIS berhasil dibatalkan dan seluruh stok produk telah dikembalikan.',
  };
}

/**
 * Helper internal untuk membatalkan transaksi dan mengembalikan stok cabang
 */
async function batalkanTransaksiInternal(supabase: any, trx: any, alasan: string) {
  // 1. Kembalikan stok produk untuk tiap item
  if (trx.items && trx.items.length > 0) {
    for (const item of trx.items) {
      // Ambil stok sekarang
      const { data: currentStock } = await supabase
        .from('stok_cabang')
        .select('jumlah_stok')
        .eq('cabang_id', trx.cabang_id)
        .eq('produk_id', item.produk_id)
        .maybeSingle();

      if (currentStock) {
        await supabase
          .from('stok_cabang')
          .update({
            jumlah_stok: currentStock.jumlah_stok + item.jumlah,
            diperbarui_pada: new Date().toISOString(),
          })
          .eq('cabang_id', trx.cabang_id)
          .eq('produk_id', item.produk_id);
      }
    }
  }

  // 2. Ubah status transaksi menjadi 'batal'
  await supabase
    .from('transaksi')
    .update({
      status: 'batal',
      alasan_void: alasan,
    })
    .eq('id', trx.id);
}

/**
 * Server Action: Ambil Riwayat Transaksi Mayar (Khusus Role Owner)
 */
export async function getMayarTransactionsHistoryAction(): Promise<{
  success: boolean;
  data?: MayarInvoiceListItem[];
  error?: string;
}> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi Anda tidak valid atau akun dinonaktifkan.' };
  }

  // Khusus role Owner sesuai permintaan pengguna dan BR-01 / BR-12
  if (profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Akses ditolak. Riwayat transaksi Mayar hanya boleh diakses oleh akun Owner.',
    };
  }

  try {
    const invoices = await getMayarInvoicesList(100);

    // Cross-reference dengan tabel transaksi di Supabase untuk mendeteksi nomor struk & cabang
    const supabase = await createClient();
    const invoiceIds = invoices.map((inv) => inv.id);

    if (invoiceIds.length > 0) {
      const { data: matchedTrx } = await (supabase
        .from('transaksi') as any)
        .select(`
          id,
          nomor_struk,
          mayar_invoice_id,
          status,
          cabang:cabang(nama),
          kasir:profiles!transaksi_kasir_id_fkey(nama_lengkap)
        `)
        .in('mayar_invoice_id', invoiceIds);

      if (matchedTrx && matchedTrx.length > 0) {
        const trxMap = new Map<string, any>();
        matchedTrx.forEach((t: any) => {
          if (t.mayar_invoice_id) {
            trxMap.set(t.mayar_invoice_id, t);
          }
        });

        invoices.forEach((inv) => {
          const matched = trxMap.get(inv.id);
          if (matched) {
            inv.nomor_struk = matched.nomor_struk;
            inv.cabang_nama = matched.cabang?.nama;
            inv.kasir_nama = matched.kasir?.nama_lengkap;
          }
        });
      }
    }

    return {
      success: true,
      data: invoices,
    };
  } catch (err: any) {
    console.error('[Mayar] Gagal memuat daftar transaksi:', err);
    return {
      success: false,
      error: err.message || 'Gagal memuat riwayat transaksi dari Mayar API.',
    };
  }
}

