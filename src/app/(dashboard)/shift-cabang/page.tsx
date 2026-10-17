import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Users, AlertCircle, CheckCircle2, Clock, ShieldCheck, Filter } from 'lucide-react';
import VerifikasiShiftDialog from '@/components/shift/VerifikasiShiftDialog';

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function ShiftCabangPage({ searchParams }: PageProps) {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const filterStatus = params.status;

  let query = supabase
    .from('shift_kasir')
    .select('*, cabang:cabang_id(kode, nama), kasir:kasir_id(nama_lengkap), verifikator:diverifikasi_oleh(nama_lengkap)')
    .order('dibuka_pada', { ascending: false })
    .limit(30);

  if (filterStatus && filterStatus !== 'semua') {
    query = query.eq('status', filterStatus);
  }

  const { data: shiftList } = await query;

  // Hitung jumlah shift yang butuh verifikasi
  const pendingCount = (shiftList || []).filter((s: any) => s.status === 'ditutup').length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Rekonsiliasi & Verifikasi Kasir (US-05, BR-10)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Shift Cabang
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Supervisor: <strong className="text-stone-800">{profile?.nama_lengkap}</strong> ({profile?.peran === 'owner' ? 'Owner Pusat' : 'Kepala Toko'})
            {profile?.cabang && ` · Wilayah: ${profile.cabang.nama}`}
          </p>
        </div>

        {/* Filter Quick Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/shift-cabang"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              !filterStatus || filterStatus === 'semua'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
            }`}
          >
            Semua Shift
          </a>
          <a
            href="/shift-cabang?status=ditutup"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
              filterStatus === 'ditutup'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200'
            }`}
          >
            <span>Butuh Verifikasi</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </a>
          <a
            href="/shift-cabang?status=buka"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterStatus === 'buka'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            Sedang Berjalan
          </a>
          <a
            href="/shift-cabang?status=diverifikasi"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              filterStatus === 'diverifikasi'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border-indigo-200'
            }`}
          >
            Diverifikasi
          </a>
        </div>
      </div>

      {/* Tabel Data Shift */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Daftar Sesi Shift Kasir (RLS Protected)
          </span>
          <span className="text-xs text-stone-500 font-medium">
            Total Ditemukan: {shiftList?.length || 0} Sesi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Waktu Buka & Tutup</th>
                <th className="py-3 px-4 text-right">Kas Awal</th>
                <th className="py-3 px-4 text-right">Tunai Masuk</th>
                <th className="py-3 px-4 text-right">Kas Seharusnya</th>
                <th className="py-3 px-4 text-right">Uang Fisik</th>
                <th className="py-3 px-4 text-right">Selisih</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi / Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {shiftList && shiftList.length > 0 ? (
                shiftList.map((s: any) => {
                  const selisih = s.selisih || 0;
                  const hasLargeDiff = Math.abs(selisih) > 20000;
                  const canVerify = (profile?.peran === 'owner' || profile?.peran === 'kepala_toko') && s.status === 'ditutup';

                  return (
                    <tr
                      key={s.id}
                      className={
                        s.status === 'ditutup'
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : hasLargeDiff
                          ? 'bg-red-50/30 hover:bg-red-50/60'
                          : 'hover:bg-stone-50'
                      }
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 text-xs block">
                          {s.cabang?.kode}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {s.cabang?.nama}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800 text-xs">
                        {s.kasir?.nama_lengkap}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-stone-800 font-medium">
                          {formatDateWIB(s.dibuka_pada)}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {s.ditutup_pada ? `Tutup: ${formatDateWIB(s.ditutup_pada)}` : 'Masih Buka'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700 text-xs">
                        {formatRupiah(s.kas_awal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700 text-xs">
                        {formatRupiah(s.total_tunai)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-800 text-xs">
                        {formatRupiah(s.kas_seharusnya)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 text-xs">
                        {s.uang_fisik == null ? '-' : formatRupiah(s.uang_fisik)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                        {s.selisih == null ? (
                          <span className="text-stone-400 font-normal">-</span>
                        ) : hasLargeDiff ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded text-[11px]">
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
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : s.status === 'ditutup'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canVerify ? (
                          <VerifikasiShiftDialog shift={s} />
                        ) : s.status === 'diverifikasi' ? (
                          <span className="text-[11px] text-stone-500 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{s.verifikator?.nama_lengkap || 'Supervisor'}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-500 text-sm">
                    Tidak ada data shift yang cocok dengan filter.
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
