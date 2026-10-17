import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default async function ShiftCabangPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const { data: shiftList } = await supabase
    .from('shift_kasir')
    .select('*, cabang:cabang_id(kode, nama), kasir:kasir_id(nama_lengkap)')
    .order('dibuka_pada', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Rekonsiliasi & Verifikasi Kasir (US-05)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Shift Cabang
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Penanggung Jawab: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.peran})
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Daftar Sesi Shift Kasir (RLS Protected)
          </span>
          <span className="text-xs text-stone-500">
            Total Ditemukan: {shiftList?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Waktu Buka</th>
                <th className="py-3 px-4 text-right">Kas Awal</th>
                <th className="py-3 px-4 text-right">Total Tunai</th>
                <th className="py-3 px-4 text-right">Selisih Kas</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {shiftList && shiftList.length > 0 ? (
                shiftList.map((s: any) => {
                  const selisih = s.selisih || 0;
                  const hasLargeDiff = Math.abs(selisih) > 20000;
                  return (
                    <tr key={s.id} className={hasLargeDiff ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-stone-50'}>
                      <td className="py-3 px-4 font-semibold text-xs text-stone-800">
                        {s.cabang?.kode} · {s.cabang?.nama}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-900">
                        {s.kasir?.nama_lengkap}
                      </td>
                      <td className="py-3 px-4 text-stone-600 text-xs">
                        {formatDateWIB(s.dibuka_pada)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">
                        {formatRupiah(s.kas_awal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-stone-900">
                        {formatRupiah(s.total_tunai)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {s.selisih == null ? (
                          <span className="text-stone-400 font-normal">-</span>
                        ) : hasLargeDiff ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            {formatRupiah(selisih)}
                          </span>
                        ) : selisih === 0 ? (
                          <span className="text-emerald-700 text-xs">Rp0 (Cocok)</span>
                        ) : (
                          <span className="text-stone-700 text-xs">{formatRupiah(selisih)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            s.status === 'diverifikasi'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : s.status === 'ditutup'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500 text-sm">
                    Tidak ada data shift.
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
