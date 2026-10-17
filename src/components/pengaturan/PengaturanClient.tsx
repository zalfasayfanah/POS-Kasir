'use client';

import React, { useState, useTransition } from 'react';
import type { Profile, AuditLog, Cabang } from '@/types/database';
import { updateStafStatusAction } from '@/app/actions/pengaturan';
import { toast } from 'sonner';
import { 
  Settings, 
  Users, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Power, 
  Building2,
  Lock,
  UserCheck
} from 'lucide-react';
import StafModal from './StafModal';
import AuditLogViewer from './AuditLogViewer';

interface PengaturanClientProps {
  currentProfile: Profile;
  staffList: Profile[];
  auditLogs: AuditLog[];
  branches: Cabang[];
}

export default function PengaturanClient({
  currentProfile,
  staffList,
  auditLogs,
  branches,
}: PengaturanClientProps) {
  const [activeTab, setActiveTab] = useState<'staf' | 'audit'>('staf');
  const [isAddStafOpen, setIsAddStafOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Metrics
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.aktif).length;
  const kasirCount = staffList.filter((s) => s.peran === 'kasir').length;
  const ktCount = staffList.filter((s) => s.peran === 'kepala_toko').length;

  // Toggle status aktif staf
  const handleToggleAktif = (targetStaff: Profile) => {
    if (targetStaff.id === currentProfile.id) {
      toast.error('Anda tidak dapat menonaktifkan akun Owner yang sedang login.');
      return;
    }

    const nextState = !targetStaff.aktif;
    const confirmMsg = nextState
      ? `Aktifkan kembali akun "${targetStaff.nama_lengkap}"?`
      : `Nonaktifkan akun "${targetStaff.nama_lengkap}"? Staf tidak akan dapat login ke sistem.`;

    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set('profile_id', targetStaff.id);
      formData.set('aktif', String(nextState));

      const res = await updateStafStatusAction(formData);

      if (!res.success) {
        toast.error(res.error || 'Gagal mengubah status staf.');
        return;
      }

      toast.success(res.message || 'Status staf berhasil diperbarui.');
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            Pengaturan Sistem & Hak Akses (US-10, BR-12)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Pengaturan & Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Khusus Owner: <span className="font-semibold text-stone-800">{currentProfile.nama_lengkap}</span> ({currentProfile.email})
          </p>
        </div>

        {activeTab === 'staf' && (
          <button
            type="button"
            onClick={() => setIsAddStafOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-950/20 inline-flex items-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Staf Baru</span>
          </button>
        )}
      </div>

      {/* Tabs Navigasi */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('staf')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'staf'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Akun Staf ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Audit Log Keamanan ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Manajemen Staf Cabang (US-10) */}
      {activeTab === 'staf' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-stone-500">Total Akun Staf</span>
              <p className="text-2xl font-black text-stone-900 font-mono">{totalStaff}</p>
              <p className="text-[11px] text-stone-400">Seluruh cabang</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-emerald-700">Akun Aktif</span>
              <p className="text-2xl font-black text-emerald-800 font-mono">{activeStaff}</p>
              <p className="text-[11px] text-emerald-600">Dapat login & bertugas</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-blue-700">Petugas Kasir</span>
              <p className="text-2xl font-black text-blue-800 font-mono">{kasirCount}</p>
              <p className="text-[11px] text-blue-600">Pelayanan POS</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-amber-800">Kepala Toko</span>
              <p className="text-2xl font-black text-amber-900 font-mono">{ktCount}</p>
              <p className="text-[11px] text-amber-700">1 per cabang aktif</p>
            </div>
          </div>

          {/* Tabel Akun Staf */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Daftar Staf Lumbung Kopi dan Roti
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                {staffList.length} Akun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-500 font-bold text-[11px] uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-4">Nama Lengkap</th>
                    <th className="py-3.5 px-4">Email Login</th>
                    <th className="py-3.5 px-4">Peran (Role)</th>
                    <th className="py-3.5 px-4">Cabang Penugasan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {staffList.map((staf) => {
                    const isSelf = staf.id === currentProfile.id;
                    return (
                      <tr key={staf.id} className="hover:bg-stone-50/70 transition">
                        {/* Nama */}
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {staf.nama_lengkap}
                          {isSelf && (
                            <span className="ml-2 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">
                              Anda
                            </span>
                          )}
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 font-mono text-xs text-stone-600">
                          {staf.email}
                        </td>

                        {/* Peran */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              staf.peran === 'owner'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : staf.peran === 'kepala_toko'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {staf.peran.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Cabang */}
                        <td className="py-3 px-4 text-stone-700 text-xs font-medium">
                          {staf.cabang ? (
                            <span>{staf.cabang.kode} · {staf.cabang.nama}</span>
                          ) : (
                            <span className="text-stone-400 italic">Pusat / Semua Cabang</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {staf.aktif ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Aksi Toggle Aktif */}
                        <td className="py-3 px-4 text-center">
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleToggleAktif(staf)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 mx-auto ${
                                staf.aktif
                                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{staf.aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Log Viewer (BR-12) */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Audit Trail Permanen (Immutable)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Merekam otomatis setiap aksi pembatalan transaksi, verifikasi shift, penyesuaian stok, perubahan harga, dan modifikasi akun staf (BR-12).
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
              Total {auditLogs.length} Catatan
            </span>
          </div>

          <AuditLogViewer logs={auditLogs} />
        </div>
      )}

      {/* Modal Tambah Staf Baru */}
      {isAddStafOpen && (
        <StafModal
          branches={branches}
          onClose={() => setIsAddStafOpen(false)}
        />
      )}
    </div>
  );
}
