import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { redirect } from 'next/navigation';
import ProdukClient from '@/components/produk/ProdukClient';
import type { Produk, RiwayatHargaModal } from '@/types/database';

export const metadata = {
  title: 'Katalog Produk & Modal - Lumbung Kopi dan Roti',
  description: 'Manajemen katalog produk, harga jual, dan riwayat harga modal',
};

export default async function ProdukPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  // Kasir dilarang mengakses katalog manajemen produk (BR-01)
  if (profile.peran === 'kasir') {
    redirect('/kasir');
  }

  const supabase = await createClient();

  // Query seluruh produk
  const { data: rawProduk } = await (supabase
    .from('produk') as any)
    .select('*')
    .order('kategori', { ascending: true })
    .order('sku', { ascending: true });

  const initialProducts: Produk[] = rawProduk || [];
  const isOwner = profile.peran === 'owner';

  // Khusus Owner: Ambil data riwayat harga modal (BR-11 / RLS Protected)
  let latestModalMap: Record<string, number> = {};
  let allModalHistory: RiwayatHargaModal[] = [];

  if (isOwner) {
    const { data: rawModal } = await (supabase
      .from('riwayat_harga_modal') as any)
      .select('*')
      .order('berlaku_mulai', { ascending: false });

    allModalHistory = rawModal || [];

    for (const m of allModalHistory) {
      if (!latestModalMap[m.produk_id]) {
        latestModalMap[m.produk_id] = m.harga_modal;
      }
    }
  }

  return (
    <ProdukClient
      profile={profile}
      initialProducts={initialProducts}
      latestModalMap={latestModalMap}
      allModalHistory={allModalHistory}
    />
  );
}
