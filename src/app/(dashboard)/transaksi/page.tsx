import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { redirect } from 'next/navigation';
import TransaksiClient from '@/components/transaksi/TransaksiClient';
import type { Transaksi, Cabang } from '@/types/database';

export const metadata = {
  title: 'Riwayat Transaksi - Lumbung Kopi dan Roti',
  description: 'Daftar transaksi penjualan, pencetakan struk, dan pembatalan (void) transaksi',
};

export default async function TransaksiPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Query transaksi terlindungi RLS:
  // - Kasir hanya melihat transaksi miliknya (BR-01)
  // - Kepala Toko hanya melihat transaksi cabangnya (BR-01)
  // - Owner dapat melihat transaksi semua cabang (BR-01)
  const { data: rawTransaksi } = await (supabase
    .from('transaksi') as any)
    .select(`
      *,
      cabang:cabang(*),
      kasir:profiles(*),
      items:transaksi_item(*)
    `)
    .order('dibuat_pada', { ascending: false })
    .limit(100);

  const initialTransactions: Transaksi[] = rawTransaksi || [];

  // Ambil daftar cabang (untuk filter Owner)
  const { data: rawBranches } = await (supabase
    .from('cabang') as any)
    .select('*')
    .eq('aktif', true)
    .order('nama', { ascending: true });

  const branches: Cabang[] = rawBranches || [];

  return (
    <TransaksiClient
      profile={profile}
      initialTransactions={initialTransactions}
      branches={branches}
    />
  );
}
