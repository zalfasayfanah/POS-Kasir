import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah } from '@/lib/utils';
import { Coffee, Lock, CheckCircle2, XCircle } from 'lucide-react';

export default async function ProdukPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  // Query produk
  const { data: produkList } = await supabase
    .from('produk')
    .select('*')
    .order('kategori', { ascending: true })
    .order('sku', { ascending: true });

  const isOwner = profile?.peran === 'owner';

  // Jika owner, ambil harga modal terkini per produk
  let modalMap: Record<string, number> = {};
  if (isOwner) {
    const { data: modalList } = await supabase
      .from('riwayat_harga_modal')
      .select('produk_id, harga_modal, berlaku_mulai')
      .order('berlaku_mulai', { ascending: false });

    if (modalList) {
      for (const m of (modalList as any[])) {
        if (!modalMap[m.produk_id]) {
          modalMap[m.produk_id] = m.harga_modal;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Coffee className="w-4 h-4" />
            Manajemen Produk & Harga (US-08)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Katalog Produk
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Akses: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.peran})
            {!isOwner && ' · Harga modal dirahasiakan oleh sistem RLS'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Daftar 18 Produk Lumbung Kopi dan Roti
          </span>
          <span className="text-xs text-stone-500">
            Total Produk: {produkList?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                {isOwner && (
                  <th className="py-3 px-4 text-right text-amber-800 bg-amber-50/50">
                    Harga Modal (Rahasia)
                  </th>
                )}
                <th className="py-3 px-4 text-center">Lacak Stok</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {produkList && produkList.length > 0 ? (
                produkList.map((p: any) => (
                  <tr key={p.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-stone-700 text-xs">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {p.nama}
                    </td>
                    <td className="py-3 px-4 text-xs capitalize text-stone-600">
                      {p.kategori}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      {formatRupiah(p.harga_jual)}
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 text-right font-mono font-semibold text-amber-900 bg-amber-50/30">
                        {modalMap[p.id] ? formatRupiah(modalMap[p.id]) : '-'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        p.lacak_stok ? 'bg-stone-100 text-stone-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {p.lacak_stok ? 'Fisik' : 'Racikan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.aktif ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-400 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} className="py-8 text-center text-stone-500 text-sm">
                    Tidak ada data produk.
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
