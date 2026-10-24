'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';
import type { Transaksi, MetodeBayar } from '@/types/database';

export interface CheckoutItemPayload {
  produk_id: string;
  jumlah: number;
}

export interface CheckoutPayload {
  shift_id: string;
  subtotal: number;
  diskon: number;
  alasan_diskon?: string | null;
  total: number;
  metode_bayar: MetodeBayar;
  uang_diterima: number;
  kembalian: number;
  items: CheckoutItemPayload[];
  nomor_meja?: string | null;
  nama_pelanggan?: string | null;
}

export interface CheckoutActionResult {
  success: boolean;
  message?: string;
  error?: string;
  transaksi?: Transaksi;
}

/**
 * Server Action: Proses Transaksi Penjualan Kasir POS (US-02, US-03)
 * Menerapkan aturan bisnis:
 * - BR-02: Shift kasir wajib berstatus 'buka'
 * - BR-03: Kunci baris stok produk & anti minus (all-or-nothing rollback)
 * - BR-04: Nomor struk urut unik harian per cabang (KODE-YYYYMMDD-NNNN)
 * - BR-05: Validasi harga resmi server & qty 1-99 per item
 * - BR-06: Diskon maksimal 10% dari subtotal & wajib alasan jika diskon > 0
 * - BR-07: Pembayaran tunai uang_diterima >= total & kembalian pas; QRIS uang_diterima == total & kembalian 0
 */
export async function prosesTransaksiAction(payload: CheckoutPayload): Promise<CheckoutActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return {
      success: false,
      error: 'Sesi Anda tidak valid atau akun staf dinonaktifkan.',
    };
  }

  // Wewenang: Kasir bertugas atau Owner
  if (profile.peran !== 'kasir' && profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Kasir atau Owner yang berhak memproses transaksi penjualan POS.',
    };
  }

  const supabase = await createClient();

  // 1. Validasi Shift Kasir (BR-02)
  if (!payload.shift_id) {
    return {
      success: false,
      error: 'ID Shift tidak ditemukan. Anda wajib membuka shift kasir terlebih dahulu (BR-02).',
    };
  }

  const { data: shift, error: shiftError } = await (supabase
    .from('shift_kasir') as any)
    .select('id, status, kasir_id, cabang_id')
    .eq('id', payload.shift_id)
    .eq('kasir_id', profile.id)
    .maybeSingle();

  if (shiftError || !shift) {
    return {
      success: false,
      error: 'Shift kasir tidak ditemukan atau bukan milik akun Anda (BR-02).',
    };
  }

  if (shift.status !== 'buka') {
    return {
      success: false,
      error: `Shift kasir ini berstatus '${shift.status}'. Transaksi hanya dapat diproses saat shift berstatus 'buka' (BR-02).`,
    };
  }

  // 2. Validasi Item Keranjang (BR-05)
  if (!payload.items || payload.items.length === 0) {
    return {
      success: false,
      error: 'Keranjang belanja kosong. Silakan pilih minimal 1 produk.',
    };
  }

  for (const item of payload.items) {
    if (!item.produk_id || isNaN(item.jumlah) || item.jumlah < 1 || item.jumlah > 99) {
      return {
        success: false,
        error: 'Jumlah per item harus berada di antara 1 sampai 99 (BR-05).',
      };
    }
  }

  // 3. Ambil data produk resmi dari database untuk verifikasi harga server (BR-05)
  const productIds = payload.items.map((i) => i.produk_id);
  const { data: products, error: prodError } = await (supabase
    .from('produk') as any)
    .select('id, nama, harga_jual, lacak_stok, aktif')
    .in('id', productIds);

  if (prodError || !products || products.length !== productIds.length) {
    return {
      success: false,
      error: 'Beberapa produk di keranjang tidak valid atau telah dihapus.',
    };
  }

  const prodMap = new Map<string, any>();
  for (const p of products) {
    if (!p.aktif) {
      return {
        success: false,
        error: `Produk "${p.nama}" saat ini nonaktif dan tidak dapat dijual.`,
      };
    }
    prodMap.set(p.id, p);
  }

  // Hitung subtotal resmi di sisi server
  let verifiedSubtotal = 0;
  for (const item of payload.items) {
    const prod = prodMap.get(item.produk_id);
    if (!prod) {
      return {
        success: false,
        error: 'Produk tidak ditemukan di database.',
      };
    }
    verifiedSubtotal += prod.harga_jual * item.jumlah;
  }

  if (verifiedSubtotal !== payload.subtotal) {
    return {
      success: false,
      error: `Subtotal keranjang tidak valid (Server: Rp ${verifiedSubtotal.toLocaleString('id-ID')}, Client: Rp ${payload.subtotal.toLocaleString('id-ID')}).`,
    };
  }

  // 4. Validasi Diskon (BR-06)
  const maxDiskon = Math.round(verifiedSubtotal * 0.10);
  const diskon = Math.round(Number(payload.diskon) || 0);
  const alasanDiskon = (payload.alasan_diskon || '').trim();

  if (diskon < 0 || diskon > maxDiskon) {
    return {
      success: false,
      error: `Diskon tidak boleh melebihi 10% dari subtotal (Maksimal: Rp ${maxDiskon.toLocaleString('id-ID')}) (BR-06).`,
    };
  }

  if (diskon > 0 && alasanDiskon.length === 0) {
    return {
      success: false,
      error: 'Alasan diskon wajib diisi jika diskon diberikan (BR-06).',
    };
  }

  // 5. Validasi Total Akhir
  const expectedTotal = verifiedSubtotal - diskon;
  if (payload.total !== expectedTotal) {
    return {
      success: false,
      error: `Total akhir tidak valid (Harus: Subtotal - Diskon = Rp ${expectedTotal.toLocaleString('id-ID')}).`,
    };
  }

  // 6. Validasi Metode Pembayaran (BR-07)
  const uangDiterima = Math.round(Number(payload.uang_diterima) || 0);
  const kembalian = Math.round(Number(payload.kembalian) || 0);

  if (payload.metode_bayar === 'tunai') {
    if (uangDiterima < expectedTotal) {
      return {
        success: false,
        error: `Uang tunai yang diterima (Rp ${uangDiterima.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${expectedTotal.toLocaleString('id-ID')}) (BR-07).`,
      };
    }
    const expectedKembalian = uangDiterima - expectedTotal;
    if (kembalian !== expectedKembalian) {
      return {
        success: false,
        error: `Perhitungan kembalian tidak valid (Harus: Rp ${expectedKembalian.toLocaleString('id-ID')}) (BR-07).`,
      };
    }
  } else if (payload.metode_bayar === 'qris') {
    if (uangDiterima !== expectedTotal) {
      return {
        success: false,
        error: `Pembayaran QRIS harus tepat sesuai total belanja (Rp ${expectedTotal.toLocaleString('id-ID')}) (BR-07).`,
      };
    }
    if (kembalian !== 0) {
      return {
        success: false,
        error: 'Kembalian untuk metode QRIS harus Rp 0 (BR-07).',
      };
    }
  } else {
    return {
      success: false,
      error: `Metode bayar '${payload.metode_bayar}' tidak didukung.`,
    };
  }

  // 7. Panggil Stored Procedure Atomic Supabase (BR-03, BR-04)
  const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
    'create_transaksi_atomic',
    {
      p_shift_id: payload.shift_id,
      p_subtotal: verifiedSubtotal,
      p_diskon: diskon,
      p_alasan_diskon: diskon > 0 ? alasanDiskon : null,
      p_total: expectedTotal,
      p_metode_bayar: payload.metode_bayar,
      p_uang_diterima: uangDiterima,
      p_kembalian: kembalian,
      p_items: payload.items,
      p_nomor_meja: payload.nomor_meja?.trim() || null,
      p_nama_pelanggan: payload.nama_pelanggan?.trim() || 'Pelanggan',
      p_sumber_pesanan: 'kasir',
    }
  );

  if (rpcError) {
    return {
      success: false,
      error: rpcError.message || 'Gagal memproses transaksi pada database.',
    };
  }

  const transaksiId = rpcResult?.transaksi_id;
  if (!transaksiId) {
    return {
      success: false,
      error: 'ID Transaksi tidak dikembalikan oleh server database.',
    };
  }

  // 8. Ambil data transaksi lengkap beserta relasi items & cabang untuk struk
  const { data: fullTransaksi, error: fetchTrxError } = await (supabase
    .from('transaksi') as any)
    .select(`
      *,
      cabang:cabang(*),
      kasir:profiles!transaksi_kasir_id_fkey(*),
      items:transaksi_item(*)
    `)
    .eq('id', transaksiId)
    .single();

  if (fetchTrxError || !fullTransaksi) {
    return {
      success: true,
      message: `Transaksi berhasil disimpan dengan Nomor Struk: ${rpcResult.nomor_struk}.`,
    };
  }

  // Revalidasi halaman
  revalidatePath('/kasir');
  revalidatePath('/shift');
  revalidatePath('/transaksi');

  return {
    success: true,
    message: `Transaksi berhasil disimpan. Struk: ${fullTransaksi.nomor_struk}`,
    transaksi: fullTransaksi as Transaksi,
  };
}
