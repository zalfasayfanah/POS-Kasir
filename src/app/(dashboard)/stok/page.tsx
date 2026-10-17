import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { redirect } from 'next/navigation';
import StokClient from '@/components/stok/StokClient';
import type { StokCabang, Cabang } from '@/types/database';

export const metadata = {
  title: 'Stok Cabang - Lumbung Kopi dan Roti',
  description: 'Manajemen inventori, stok minimum, dan penyesuaian stok produk cabang',
};

export default async function StokCabangPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  // Hanya Kepala Toko dan Owner yang diizinkan mengakses halaman stok cabang (BR-01)
  if (profile.peran !== 'kepala_toko' && profile.peran !== 'owner') {
    redirect('/kasir');
  }

  const supabase = await createClient();

  // Query stok cabang terlindungi RLS:
  // - Kepala Toko hanya dapat melihat cabangnya
  // - Owner dapat melihat semua cabang
  const { data: rawStock } = await (supabase
    .from('stok_cabang') as any)
    .select(`
      *,
      cabang:cabang(*),
      produk:produk(*)
    `)
    .order('jumlah', { ascending: true });

  const initialStock: StokCabang[] = rawStock || [];

  // Ambil daftar cabang (untuk filter Owner)
  const { data: rawBranches } = await (supabase
    .from('cabang') as any)
    .select('*')
    .eq('aktif', true)
    .order('nama', { ascending: true });

  const branches: Cabang[] = rawBranches || [];

  return (
    <StokClient
      profile={profile}
      initialStock={initialStock}
      branches={branches}
    />
  );
}
