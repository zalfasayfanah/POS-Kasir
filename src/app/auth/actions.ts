'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email dan kata sandi wajib diisi.' };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError) {
    return { 
      success: false, 
      error: authError.message.includes('Invalid login credentials')
        ? 'Email atau kata sandi tidak cocok.'
        : authError.message 
    };
  }

  if (!authData.user) {
    return { success: false, error: 'Gagal melakukan otentikasi.' };
  }

  // Ambil profil akun
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*, cabang:cabang_id(*)')
    .eq('id', authData.user.id)
    .single();

  const prof = profile as any;

  if (profError || !prof) {
    await supabase.auth.signOut();
    return { success: false, error: 'Profil pengguna tidak ditemukan di database.' };
  }

  // BR-01: Akun nonaktif tidak dapat masuk ke data apa pun
  if (!prof.aktif) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Akun Anda telah dinonaktifkan oleh Owner. Akses ditolak.',
    };
  }

  // Tentukan rute redirect berdasarkan peran (PRD Bagian 7)
  let redirectTo = '/kasir';
  if (prof.peran === 'kepala_toko') {
    redirectTo = '/transaksi';
  } else if (prof.peran === 'owner') {
    redirectTo = '/laporan';
  }

  return { success: true, redirectTo };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, cabang:cabang_id(*)')
    .eq('id', user.id)
    .single();

  return (profile as unknown as Profile) || null;
}
