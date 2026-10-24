'use client';

import React, { useState } from 'react';
import type { Profile } from '@/types/database';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import VerifikasiShiftDialog from './VerifikasiShiftDialog';
import Pagination from '@/components/ui/Pagination';

interface ShiftCabangTableProps {
  shiftList: any[];
  profile: Profile;
}

export default function ShiftCabangTable({
  shiftList,
  profile,
}: ShiftCabangTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const paginatedShifts = shiftList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
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
            {paginatedShifts.length > 0 ? (
              paginatedShifts.map((s: any) => {
                const selisih = s.selisih || 0;
                const hasLargeDiff = Math.abs(selisih) > 20000;
                const canVerify =
                  (profile?.peran === 'owner' || profile?.peran === 'kepala_toko') &&
                  s.status === 'ditutup';

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
                        {s.ditutup_pada
                          ? `Tutup: ${formatDateWIB(s.ditutup_pada)}`
                          : 'Masih Buka'}
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
                        <span className="text-stone-700 text-xs">
                          {formatRupiah(selisih)}
                        </span>
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
                          <span>
                            {s.verifikator?.nama_lengkap || 'Supervisor'}
                          </span>
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
                <td
                  colSpan={10}
                  className="py-8 text-center text-stone-500 text-sm"
                >
                  Tidak ada data shift yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Kontrol Pagination (Maks 20 data per slide) */}
      <Pagination
        currentPage={currentPage}
        totalItems={shiftList.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
