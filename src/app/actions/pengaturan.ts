'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';
import type { PeranUser } from '@/types/database';

export interface StafActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * US-10: Tambah Akun Staf Baru (Khusus Owner)
 */
export async function tambahStafAction(formData: FormData): Promise<StafActionResult> {
  const currentProfile = await getCurrentUserProfile();
  if (!currentProfile || !currentProfile.aktif || currentProfile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Owner yang memiliki wewenang mengelola akun staf.',
    };
  }

  const namaLengkap = (formData.get('nama_lengkap') as string || '').trim();
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string;
  const peran = formData.get('peran') as PeranUser;
  const rawCabangId = formData.get('cabang_id') as string;
  const cabangId = peran === 'owner' ? null : rawCabangId || null;

  if (!namaLengkap || !email || !password || !peran) {
    return { success: false, error: 'Semua kolom formulir akun wajib diisi.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password minimal harus 6 karakter.' };
  }

  if (peran !== 'owner' && !cabangId) {
    return { success: false, error: 'Kasir dan Kepala Toko wajib ditugaskan ke salah satu cabang.' };
  }

  const adminClient = createAdminClient();

  // Validasi: 1 Kepala Toko aktif per cabang
  if (peran === 'kepala_toko' && cabangId) {
    const { data: existingKt } = await (adminClient
      .from('profiles') as any)
      .select('id, nama_lengkap')
      .eq('cabang_id', cabangId)
      .eq('peran', 'kepala_toko')
      .eq('aktif', true)
      .maybeSingle();

    if (existingKt) {
      return {
        success: false,
        error: `Cabang ini sudah memiliki Kepala Toko aktif (${existingKt.nama_lengkap}). Nonaktifkan terlebih dahulu sebelum menugaskan yang baru.`,
      };
    }
  }

  // Buat User di Supabase Auth via Admin Client
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nama_lengkap: namaLengkap,
      peran,
      cabang_id: cabangId,
      aktif: true,
    },
  });

  if (authError || !newUser.user) {
    return {
      success: false,
      error: `Gagal membuat akun auth: ${authError?.message || 'Error tidak diketahui'}`,
    };
  }

  // Pastikan profile tercatat di public.profiles
  await (adminClient.from('profiles') as any).upsert({
    id: newUser.user.id,
    nama_lengkap: namaLengkap,
    email,
    peran,
    cabang_id: cabangId,
    aktif: true,
  });

  // Catat Audit Log (BR-12)
  await (adminClient.from('audit_log') as any).insert({
    pelaku_id: currentProfile.id,
    aksi: 'ubah_akun',
    tabel: 'profiles',
    data_id: newUser.user.id,
    nilai_sebelum: null,
    nilai_sesudah: {
      nama_lengkap: namaLengkap,
      email,
      peran,
      cabang_id: cabangId,
      aktif: true,
    },
  });

  revalidatePath('/pengaturan');

  return {
    success: true,
    message: `Akun staf "${namaLengkap}" (${email}) berhasil didaftarkan.`,
  };
}

/**
 * US-10: Update Status Aktif / Nonaktif & Cabang Staf (Khusus Owner)
 */
export async function updateStafStatusAction(formData: FormData): Promise<StafActionResult> {
  const currentProfile = await getCurrentUserProfile();
  if (!currentProfile || !currentProfile.aktif || currentProfile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Owner yang berhak mengubah status akun staf.',
    };
  }

  const profileId = formData.get('profile_id') as string;
  const aktif = formData.get('aktif') === 'true';
  const cabangId = (formData.get('cabang_id') as string) || null;

  if (!profileId) {
    return { success: false, error: 'ID staf tidak ditemukan.' };
  }

  // Lindungi akun diri sendiri (Owner) agar tidak menonaktifkan diri sendiri
  if (profileId === currentProfile.id && !aktif) {
    return {
      success: false,
      error: 'Anda tidak dapat menonaktifkan akun Owner yang sedang login.',
    };
  }

  const adminClient = createAdminClient();

  // Ambil profil lama
  const { data: oldProfile, error: fetchError } = await (adminClient
    .from('profiles') as any)
    .select('*')
    .eq('id', profileId)
    .single();

  if (fetchError || !oldProfile) {
    return { success: false, error: 'Akun staf tidak ditemukan.' };
  }

  // Jika mengaktifkan sebagai kepala toko, periksa aturan 1 kepala toko per cabang
  const targetCabangId = oldProfile.peran === 'owner' ? null : (cabangId || oldProfile.cabang_id);
  if (aktif && oldProfile.peran === 'kepala_toko' && targetCabangId) {
    const { data: existingKt } = await (adminClient
      .from('profiles') as any)
      .select('id, nama_lengkap')
      .eq('cabang_id', targetCabangId)
      .eq('peran', 'kepala_toko')
      .eq('aktif', true)
      .neq('id', profileId)
      .maybeSingle();

    if (existingKt) {
      return {
        success: false,
        error: `Cabang ini sudah memiliki Kepala Toko aktif (${existingKt.nama_lengkap}). Nonaktifkan staf tersebut terlebih dahulu.`,
      };
    }
  }

  // Update profil
  const updatePayload: any = {
    aktif,
    cabang_id: targetCabangId,
  };

  const { error: updateError } = await (adminClient
    .from('profiles') as any)
    .update(updatePayload)
    .eq('id', profileId);

  if (updateError) {
    return { success: false, error: `Gagal memperbarui staf: ${updateError.message}` };
  }

  // Update juga user_metadata di auth.users
  await adminClient.auth.admin.updateUserById(profileId, {
    user_metadata: {
      nama_lengkap: oldProfile.nama_lengkap,
      peran: oldProfile.peran,
      aktif,
      cabang_id: targetCabangId,
    },
  });

  // Catat Audit Log (BR-12)
  const auditAksi = oldProfile.aktif === true && aktif === false ? 'nonaktifkan_akun' : 'ubah_akun';
  await (adminClient.from('audit_log') as any).insert({
    pelaku_id: currentProfile.id,
    aksi: auditAksi,
    tabel: 'profiles',
    data_id: profileId,
    nilai_sebelum: {
      nama_lengkap: oldProfile.nama_lengkap,
      aktif: oldProfile.aktif,
      cabang_id: oldProfile.cabang_id,
    },
    nilai_sesudah: {
      nama_lengkap: oldProfile.nama_lengkap,
      aktif,
      cabang_id: targetCabangId,
    },
  });

  revalidatePath('/pengaturan');

  return {
    success: true,
    message: `Status akun staf "${oldProfile.nama_lengkap}" berhasil diubah menjadi ${aktif ? 'Aktif' : 'Nonaktif'}.`,
  };
}
