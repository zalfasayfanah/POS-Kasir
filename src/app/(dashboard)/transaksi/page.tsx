import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Receipt, Search, Filter, Ban } from 'lucide-react';

export default async function TransaksiPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  // Query transaksi terlindungi RLS otomatis:
  // - Kasir hanya dapat melihat transaksi miliknya
  // - Kepala Toko hanya dapat melihat transaksi cabangnya
  // - Owner dapat melihat semua cabang
  const { data: transaksiList, error } = await supabase
    .from('transaksi')
    .select('*, cabang:cabang_id(kode, nama), kasir:kasir_id(nama_lengkap)')
    .order('dibuat_pada', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            Riwayat Penjualan & Struk (US-03, US-06)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Daftar Transaksi
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Akses: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.peran}) · {profile?.cabang ? profile.cabang.nama : 'Semua Cabang'}
          </p>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            20 Transaksi Terakhir (RLS Protected)
          </span>
          <span className="text-xs text-stone-500 font-medium">
            Total Ditemukan: {transaksiList?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Nomor Struk</th>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {transaksiList && transaksiList.length > 0 ? (
                transaksiList.map((t: any) => (
                  <tr key={t.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      {t.nomor_struk}
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-xs">
                      {formatDateWIB(t.dibuat_pada)}
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium text-xs">
                      {t.cabang?.kode} · {t.cabang?.nama}
                    </td>
                    <td className="py-3 px-4 text-stone-700 text-xs">
                      {t.kasir?.nama_lengkap || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                        {t.metode_bayar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      {formatRupiah(t.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          t.status === 'lunas'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : t.status === 'void'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500 text-sm">
                    Belum ada data transaksi yang dapat diakses oleh peran Anda.
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
