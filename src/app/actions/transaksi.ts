'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';

export interface VoidActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Pembatalan Transaksi Penjualan (Void)
 * Menerapkan aturan bisnis:
 * - BR-08: Hanya Kepala Toko cabang terkait atau Owner yang berhak void
 * - BR-08: Hanya transaksi berstatus 'lunas' yang dibuat hari ini (WIB)
 * - BR-08: Shift kasir masih harus berstatus 'buka'
 * - BR-08: Alasan void wajib diisi minimal 10 karakter
 * - BR-08: Mengembalikan stok produk yang dilacak ke stok_cabang
 * - BR-12: Mencatat aksi ke audit_log
 */
export async function voidTransaksiAction(formData: FormData): Promise<VoidActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return {
      success: false,
      error: 'Sesi Anda tidak valid atau akun dinonaktifkan.',
    };
  }

  // Validasi wewenang (TC-11 / BR-08)
  if (profile.peran !== 'kepala_toko' && profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Kasir tidak memiliki wewenang untuk membatalkan (void) transaksi. Hubungi Kepala Toko atau Owner (BR-08).',
    };
  }

  const transaksiId = formData.get('transaksi_id') as string;
  const alasanVoid = ((formData.get('alasan_void') as string) || '').trim();

  if (!transaksiId) {
    return {
      success: false,
      error: 'ID Transaksi tidak ditemukan.',
    };
  }

  if (alasanVoid.length < 10) {
    return {
      success: false,
      error: `Alasan void harus memiliki panjang minimal 10 karakter (Saat ini: ${alasanVoid.length} karakter) (BR-08).`,
    };
  }

  const supabase = await createClient();

  // Panggil Stored Procedure Atomic di Supabase
  const { data, error } = await (supabase.rpc as any)('void_transaksi_atomic', {
    p_transaksi_id: transaksiId,
    p_alasan_void: alasanVoid,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Gagal membatalkan transaksi pada database.',
    };
  }

  revalidatePath('/transaksi');
  revalidatePath('/stok');
  revalidatePath('/shift');
  revalidatePath('/shift-cabang');
  revalidatePath('/kasir');

  return {
    success: true,
    message: data?.message || 'Transaksi berhasil di-void dan stok produk dikembalikan ke cabang.',
  };
}
