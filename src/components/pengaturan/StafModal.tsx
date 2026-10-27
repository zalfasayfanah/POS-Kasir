'use client';

import React, { useState, useTransition } from 'react';
import type { Cabang, PeranUser } from '@/types/database';
import { tambahStafAction } from '@/app/actions/pengaturan';
import { toast } from 'sonner';
import { Users, Plus, X, ShieldAlert, Building2 } from 'lucide-react';

interface StafModalProps {
  branches: Cabang[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StafModal({ branches, onClose, onSuccess }: StafModalProps) {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [peran, setPeran] = useState<PeranUser>('kasir');
  const [cabangId, setCabangId] = useState<string>(branches[0]?.id || '');

  const [isPending, startTransition] = useTransition();

  const isFormValid =
    namaLengkap.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes('@') &&
    password.length >= 6 &&
    (peran === 'owner' || Boolean(cabangId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Periksa kembali kolom isian formulir akun staf.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('nama_lengkap', namaLengkap.trim());
      formData.set('email', email.trim().toLowerCase());
      formData.set('password', password);
      formData.set('peran', peran);
      if (peran !== 'owner') {
        formData.set('cabang_id', cabangId);
      }

      const res = await tambahStafAction(formData);

      if (!res.success) {
        toast.error(res.error || 'Gagal mendaftarkan akun staf.');
        return;
      }

      toast.success(res.message || 'Akun staf berhasil dibuat.');
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-amber-500/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Tambah Akun Staf Baru</h3>
              <p className="text-xs text-amber-100">Manajemen Pengguna & Hak Akses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-full hover:bg-amber-700/50 text-amber-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 block">
              Nama Lengkap Staf:
            </label>
            <input
              type="text"
              required
              disabled={isPending}
              placeholder="Contoh: Budi Santoso"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-600 transition"
            />
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                Email Login:
              </label>
              <input
                type="email"
                required
                disabled={isPending}
                placeholder="budi.kasir@lumbung.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                Password (Min. 6 Karakter):
              </label>
              <input
                type="password"
                required
                minLength={6}
                disabled={isPending}
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:border-amber-600 transition"
              />
            </div>
          </div>

          {/* Peran Staf */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 block">
              Peran Akun (Role):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPeran('kasir')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  peran === 'kasir'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                Kasir
              </button>

              <button
                type="button"
                onClick={() => setPeran('kepala_toko')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  peran === 'kepala_toko'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                Kepala Toko
              </button>

              <button
                type="button"
                onClick={() => setPeran('owner')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  peran === 'owner'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                Owner
              </button>
            </div>
          </div>

          {/* Cabang Penugasan (Khusus Kasir & Kepala Toko) */}
          {peran !== 'owner' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-stone-500" />
                Cabang Penugasan:
              </label>
              <select
                disabled={isPending}
                value={cabangId}
                onChange={(e) => setCabangId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-600 transition"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.kode} · {b.nama}
                  </option>
                ))}
              </select>
              {peran === 'kepala_toko' && (
                <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                  Catatan: Hanya 1 akun Kepala Toko aktif yang diizinkan per cabang.
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs">
              <p className="font-semibold">Akun Owner memiliki akses ke semua cabang dan seluruh data rahasia.</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isPending}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 ${
                !isFormValid || isPending
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                  : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-950/20'
              }`}
            >
              {isPending ? 'Mendaftarkan...' : 'Buat Akun Staf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
