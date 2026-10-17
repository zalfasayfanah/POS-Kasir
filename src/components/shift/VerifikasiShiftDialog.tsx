'use client';

import React, { useState, useTransition } from 'react';
import { verifikasiShiftAction } from '@/app/actions/shift';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface VerifikasiShiftDialogProps {
  shift: any;
}

export default function VerifikasiShiftDialog({ shift }: VerifikasiShiftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [catatanVerifikasi, setCatatanVerifikasi] = useState('');

  const selisih = shift.selisih || 0;
  const isLargeDiff = Math.abs(selisih) > 20000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('shift_id', shift.id);
    if (catatanVerifikasi) {
      formData.append('catatan_verifikasi', catatanVerifikasi);
    }

    startTransition(async () => {
      const res = await verifikasiShiftAction(formData);
      if (res.success) {
        toast.success('Shift Berhasil Diverifikasi (BR-10)', {
          description: res.message,
        });
        setIsOpen(false);
      } else {
        toast.error('Gagal Verifikasi Shift', {
          description: res.error,
        });
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        title="Verifikasi Rekonsiliasi Shift Ini"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Verifikasi</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  Verifikasi Pengawas (BR-10)
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  Verifikasi Rekonsiliasi Shift
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Detail Info Shift */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Cabang:</span>
                  <span className="font-bold text-stone-900">{shift.cabang?.nama} ({shift.cabang?.kode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Kasir Bertugas:</span>
                  <span className="font-bold text-stone-900">{shift.kasir?.nama_lengkap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Waktu Buka:</span>
                  <span className="text-stone-800">{formatDateWIB(shift.dibuka_pada)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Waktu Tutup:</span>
                  <span className="text-stone-800">{shift.ditutup_pada ? formatDateWIB(shift.ditutup_pada) : '-'}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between">
                  <span className="text-stone-500">Kas Seharusnya:</span>
                  <span className="font-mono font-bold text-stone-900">{formatRupiah(shift.kas_seharusnya || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Uang Fisik Dihitung:</span>
                  <span className="font-mono font-bold text-stone-900">{formatRupiah(shift.uang_fisik || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                  <span className="font-bold text-stone-700">Selisih Kas:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      isLargeDiff
                        ? 'bg-red-100 text-red-700'
                        : selisih === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selisih > 0 ? `+${formatRupiah(selisih)}` : formatRupiah(selisih)}
                  </span>
                </div>
              </div>

              {/* Catatan dari Kasir jika ada */}
              {shift.catatan_tutup && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">Catatan Penutupan Kasir:</span>
                  <p className="text-amber-950 italic">"{shift.catatan_tutup}"</p>
                </div>
              )}

              {/* Input Catatan Verifikator */}
              <div>
                <label htmlFor="catatan_verifikasi" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Catatan Verifikasi Supervisor (Opsional)
                </label>
                <textarea
                  id="catatan_verifikasi"
                  rows={2}
                  value={catatanVerifikasi}
                  onChange={(e) => setCatatanVerifikasi(e.target.value)}
                  disabled={isPending}
                  placeholder="Misal: Sudah dicek fisik laci kasir dan bukti penerimaan..."
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs transition focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 bg-stone-50/50"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui & Verifikasi Shift</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
