'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';

export interface StokActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Penyesuaian Stok Cabang (US-07, BR-12)
 * Menerapkan aturan bisnis:
 * - Hanya Kepala Toko cabang terkait atau Owner
 * - Tipe: 'masuk', 'rusak', 'opname'
 * - Alasan wajib diisi
 * - Tercatat ke audit_log
 */
export async function sesuaikanStokAction(formData: FormData): Promise<StokActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return {
      success: false,
      error: 'Sesi Anda tidak valid atau akun dinonaktifkan.',
    };
  }

  if (profile.peran !== 'kepala_toko' && profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Kepala Toko atau Owner yang berhak melakukan penyesuaian stok (US-07).',
    };
  }

  const cabangId = formData.get('cabang_id') as string;
  const produkId = formData.get('produk_id') as string;
  const tipe = formData.get('tipe') as string;
  const rawJumlah = formData.get('jumlah');
  const alasan = ((formData.get('alasan') as string) || '').trim();

  if (!cabangId || !produkId || !tipe) {
    return {
      success: false,
      error: 'Data cabang, produk, atau tipe penyesuaian tidak lengkap.',
    };
  }

  const jumlah = Math.round(Number(rawJumlah));
  if (isNaN(jumlah) || jumlah < 0) {
    return {
      success: false,
      error: 'Jumlah penyesuaian stok harus berupa angka positif.',
    };
  }

  if (alasan.length < 5) {
    return {
      success: false,
      error: 'Alasan penyesuaian stok wajib diisi minimal 5 karakter (US-07).',
    };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase.rpc as any)('penyesuaian_stok_atomic', {
    p_cabang_id: cabangId,
    p_produk_id: produkId,
    p_tipe: tipe,
    p_jumlah: jumlah,
    p_alasan: alasan,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Gagal menyimpan penyesuaian stok pada database.',
    };
  }

  revalidatePath('/stok');
  revalidatePath('/kasir');

  return {
    success: true,
    message: data?.message || 'Penyesuaian stok berhasil disimpan dan tercatat di audit log.',
  };
}
