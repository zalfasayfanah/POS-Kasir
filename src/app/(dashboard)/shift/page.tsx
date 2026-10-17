import React from 'react';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { Clock, ShieldCheck } from 'lucide-react';

export default async function ShiftSayaPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
          <Clock className="w-4 h-4" />
          Manajemen Shift Kasir (US-01, US-04)
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Shift Saya</h1>
        <p className="text-sm text-stone-500 mt-1">
          Kasir: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> · Cabang: {profile?.cabang?.nama}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm text-stone-600 text-sm">
        <p>Halaman pembukaan shift dengan kas awal (Rp0 - Rp2.000.000, BR-02) dan penutupan shift rekonsiliasi kas (BR-09) akan diaktifkan secara penuh pada <strong>Fase 3</strong>.</p>
      </div>
    </div>
  );
}
