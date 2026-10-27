import React from 'react';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { ShoppingCart, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PosClient from '@/components/pos/PosClient';
import type { Produk, StokCabang, ShiftKasir } from '@/types/database';

export const metadata = {
  title: 'Kasir POS - Lumbung Kopi dan Roti',
  description: 'Antarmuka Penjualan Kasir POS Multi-Cabang',
};

export default async function KasirPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  // Hanya kasir dan owner yang diizinkan mengakses halaman kasir POS (BR-01)
  if (profile.peran !== 'kasir' && profile.peran !== 'owner') {
    redirect('/transaksi');
  }

  const supabase = await createClient();

  // Cek apakah ada shift aktif untuk kasir ini (BR-02)
  const { data: activeShift } = await (supabase
    .from('shift_kasir') as any)
    .select(`
      *,
      cabang:cabang(*)
    `)
    .eq('kasir_id', profile.id)
    .eq('status', 'buka')
    .maybeSingle();

  // Jika shift belum dibuka, tampilkan peringatan wajib buka shift (BR-02)
  if (!activeShift) {
    return (
      <div className="space-y-6">
        {/* Header Halaman */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-md">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
              <ShoppingCart className="w-4 h-4" />
              Halaman Kasir POS
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Penjualan Kasir · {profile?.cabang?.nama || 'Pusat'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Petugas bertugas: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shift"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <Clock className="w-4 h-4 text-amber-700" />
              Kelola Shift Kasir
            </Link>
          </div>
        </div>

        {/* Banner Wajib Buka Shift */}
        <div className="bg-amber-500/10 border border-amber-400/50 rounded-3xl p-6 sm:p-8 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-800 shrink-0 mt-0.5">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
                Shift Belum Dibuka
              </div>
              <h2 className="text-xl font-bold text-stone-900">
                Buka Shift Terlebih Dahulu Sebelum Melayani Transaksi
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Berdasarkan aturan operasional, setiap petugas kasir wajib membuka shift dengan mencatat uang modal awal di laci kasir (Rp 0 s/d Rp 2.000.000) sebelum memproses transaksi penjualan POS.
              </p>
            </div>
          </div>

          <Link
            href="/shift"
            className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 transition shrink-0"
          >
            <span>Buka Shift Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Tentukan Cabang Tugas
  const cabangId = profile.cabang_id || activeShift.cabang_id;

  // Ambil Data Produk Aktif (Katalog)
  const { data: rawProducts } = await (supabase
    .from('produk') as any)
    .select('*')
    .eq('aktif', true)
    .order('kategori', { ascending: true })
    .order('nama', { ascending: true });

  const products: Produk[] = rawProducts || [];

  // Ambil Stok Cabang Terkini
  const { data: rawStock } = await (supabase
    .from('stok_cabang') as any)
    .select('produk_id, jumlah, stok_minimum')
    .eq('cabang_id', cabangId);

  const branchStockMap: Record<string, number> = {};
  const stockMinMap: Record<string, number> = {};

  for (const item of (rawStock || []) as any[]) {
    branchStockMap[item.produk_id] = item.jumlah;
    stockMinMap[item.produk_id] = item.stok_minimum;
  }

  return (
    <PosClient
      profile={profile}
      activeShift={activeShift as ShiftKasir}
      products={products}
      branchStockMap={branchStockMap}
      stockMinMap={stockMinMap}
    />
  );
}
