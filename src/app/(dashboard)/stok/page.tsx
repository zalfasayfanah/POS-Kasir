import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default async function StokCabangPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  // Query stok cabang terlindungi RLS
  const { data: stokList } = await supabase
    .from('stok_cabang')
    .select('*, cabang:cabang_id(kode, nama), produk:produk_id(sku, nama, kategori, harga_jual)')
    .order('jumlah', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            Inventori & Stok Real-Time (US-07)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Stok Cabang
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Petugas: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.peran}) · {profile?.cabang ? profile.cabang.nama : 'Semua Cabang'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Daftar Stok Produk per Cabang
          </span>
          <span className="text-xs text-stone-500">
            Total Item: {stokList?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Batas Minimum</th>
                <th className="py-3 px-4 text-right">Stok Fisik</th>
                <th className="py-3 px-4 text-center">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {stokList && stokList.length > 0 ? (
                stokList.map((s: any) => {
                  const isLow = s.jumlah <= s.stok_minimum;
                  return (
                    <tr key={s.id} className={isLow ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-stone-50'}>
                      <td className="py-3 px-4 font-semibold text-xs text-stone-800">
                        {s.cabang?.kode} · {s.cabang?.nama}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-stone-600">
                        {s.produk?.sku}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {s.produk?.nama}
                      </td>
                      <td className="py-3 px-4 text-xs capitalize text-stone-600">
                        {s.produk?.kategori}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-500 text-xs">
                        {s.stok_minimum}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-base text-stone-900">
                        {s.jumlah}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500 text-sm">
                    Tidak ada data stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
