import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Users, AlertCircle, CheckCircle2, Clock, ShieldCheck, Filter } from 'lucide-react';
import VerifikasiShiftDialog from '@/components/shift/VerifikasiShiftDialog';
import ShiftCabangTable from '@/components/shift/ShiftCabangTable';

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function ShiftCabangPage({ searchParams }: PageProps) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  // Kasir tidak boleh mengakses halaman Shift Cabang (hanya Shift Saya)
  if (profile.peran === 'kasir') {
    redirect('/shift');
  }

  const supabase = await createClient();
  const params = await searchParams;
  const filterStatus = params.status;

  let query = supabase
    .from('shift_kasir')
    .select('*, cabang:cabang_id(kode, nama), kasir:kasir_id(nama_lengkap), verifikator:diverifikasi_oleh(nama_lengkap)')
    .order('dibuka_pada', { ascending: false })
    .limit(100);

  // BR-01: Kepala Toko hanya dapat melihat data cabangnya sendiri
  if (profile.peran === 'kepala_toko' && profile.cabang_id) {
    query = query.eq('cabang_id', profile.cabang_id);
  }

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
            Rekonsiliasi & Verifikasi Kasir
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

      {/* Tabel Data Shift dengan Pagination (Maks 20 data per slide) */}
      <ShiftCabangTable shiftList={shiftList || []} profile={profile} />
    </div>
  );
}
