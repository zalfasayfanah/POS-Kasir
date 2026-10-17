import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import BukaShiftForm from '@/components/shift/BukaShiftForm';
import ShiftAktifPanel from '@/components/shift/ShiftAktifPanel';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Clock, History, AlertCircle, CheckCircle2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default async function ShiftSayaPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  // 1. Ambil shift yang sedang berstatus 'buka' untuk kasir ini
  const { data: activeShift } = await (supabase
    .from('shift_kasir') as any)
    .select('*, cabang:cabang_id(*)')
    .eq('kasir_id', profile.id)
    .eq('status', 'buka')
    .maybeSingle();

  // 2. Jika ada shift aktif, ambil transaksi-transaksi yang terkait dengan shift tersebut
  let transaksiList: any[] = [];
  if (activeShift) {
    const { data: trxs } = await (supabase
      .from('transaksi') as any)
      .select('*')
      .eq('shift_id', activeShift.id)
      .order('dibuat_pada', { ascending: false });
    transaksiList = trxs || [];
  }

  // 3. Ambil riwayat shift sebelumnya milik kasir ini (ditutup / diverifikasi)
  const { data: pastShifts } = await (supabase
    .from('shift_kasir') as any)
    .select('*, cabang:cabang_id(kode, nama)')
    .eq('kasir_id', profile.id)
    .neq('status', 'buka')
    .order('dibuka_pada', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      {/* Jika ada shift aktif, tampilkan panel aktif + tombol tutup shift */}
      {activeShift ? (
        <ShiftAktifPanel shift={activeShift} transaksiList={transaksiList} />
      ) : (
        /* Jika belum ada shift aktif, tampilkan form pembukaan shift */
        <div className="space-y-6">
          <BukaShiftForm
            cabangNama={profile.cabang?.nama}
            kasirNama={profile.nama_lengkap}
          />
        </div>
      )}

      {/* Riwayat Shift Saya Sebelumnya */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-md overflow-hidden">
        <div className="p-5 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-500" />
            <h3 className="text-sm font-bold text-stone-900">
              Riwayat Shift Saya Sebelumnya
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            Maks. 10 sesi terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Waktu Buka & Tutup</th>
                <th className="py-3 px-4 text-right">Kas Awal</th>
                <th className="py-3 px-4 text-right">Penjualan Tunai</th>
                <th className="py-3 px-4 text-right">Kas Seharusnya</th>
                <th className="py-3 px-4 text-right">Uang Fisik</th>
                <th className="py-3 px-4 text-right">Selisih</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {pastShifts && pastShifts.length > 0 ? (
                pastShifts.map((s: any) => {
                  const selisih = s.selisih || 0;
                  const isLargeDiff = Math.abs(selisih) > 20000;
                  return (
                    <tr key={s.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 text-xs">
                          {formatDateWIB(s.dibuka_pada)}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          s/d {s.ditutup_pada ? formatDateWIB(s.ditutup_pada) : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700">
                        {formatRupiah(s.kas_awal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {formatRupiah(s.total_tunai)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-900 font-medium">
                        {formatRupiah(s.kas_seharusnya)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {formatRupiah(s.uang_fisik || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isLargeDiff ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            {formatRupiah(selisih)}
                          </span>
                        ) : selisih === 0 ? (
                          <span className="text-emerald-700 text-xs">Rp 0</span>
                        ) : (
                          <span className="text-stone-700 text-xs">{formatRupiah(selisih)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.status === 'diverifikasi'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
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
                    Belum ada riwayat shift yang ditutup.
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
