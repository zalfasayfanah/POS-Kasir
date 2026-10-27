'use client';

import React, { useState, useTransition } from 'react';
import { bukaShiftAction } from '@/app/actions/shift';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/utils';
import { Clock, Banknote, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface BukaShiftFormProps {
  cabangNama?: string;
  kasirNama?: string;
}

const PRESET_AMOUNTS = [0, 100000, 200000, 300000, 500000, 1000000, 2000000];

export default function BukaShiftForm({ cabangNama, kasirNama }: BukaShiftFormProps) {
  const [isPending, startTransition] = useTransition();
  const [kasAwal, setKasAwal] = useState<number>(200000);
  const [errorInput, setErrorInput] = useState<string | null>(null);

  const handleKasChange = (val: number) => {
    setKasAwal(val);
    if (val < 0 || val > 2000000) {
      setErrorInput('Kas awal wajib berada di antara Rp 0 dan Rp 2.000.000');
    } else {
      setErrorInput(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (kasAwal < 0 || kasAwal > 2000000) {
      toast.error('Kas awal tidak valid (Rp 0 - Rp 2.000.000)');
      return;
    }

    const formData = new FormData();
    formData.append('kas_awal', kasAwal.toString());

    startTransition(async () => {
      const res = await bukaShiftAction(formData);
      if (res.success) {
        toast.success('Shift Berhasil Dibuka!', {
          description: res.message,
        });
      } else {
        toast.error('Gagal Membuka Shift', {
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xl overflow-hidden max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Clock className="w-3.5 h-3.5" />
            Pembukaan Shift Kasir
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Mulai Sesi Shift Baru
          </h2>
          <p className="text-stone-300 text-sm mt-1.5 leading-relaxed">
            Pastikan menghitung uang modal awal di laci kasir secara teliti sebelum memulai transaksi penjualan.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {/* Detail Staf & Cabang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs">
          <div>
            <span className="text-stone-400 block font-medium">Petugas Kasir:</span>
            <span className="text-stone-800 font-bold text-sm">{kasirNama || 'Kasir'}</span>
          </div>
          <div>
            <span className="text-stone-400 block font-medium">Lokasi Cabang:</span>
            <span className="text-stone-800 font-bold text-sm">{cabangNama || '-'}</span>
          </div>
        </div>

        {/* Input Kas Awal */}
        <div>
          <label htmlFor="kas_awal" className="block text-sm font-bold text-stone-800 mb-2">
            Uang Modal Kas Awal di Laci (Rp)
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 font-bold">
              Rp
            </div>
            <input
              id="kas_awal"
              type="number"
              min={0}
              max={2000000}
              step={1000}
              value={kasAwal}
              onChange={(e) => handleKasChange(Number(e.target.value))}
              disabled={isPending}
              className="w-full pl-12 pr-4 py-3.5 text-xl font-bold font-mono rounded-2xl border border-stone-300 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-600 transition bg-stone-50/50 text-stone-900"
              placeholder="0"
              required
            />
          </div>

          {/* Format Display & Error */}
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-stone-500 font-medium">
              Terbaca: <strong className="text-amber-800 font-mono">{formatRupiah(kasAwal || 0)}</strong>
            </span>
            <span className="text-stone-400 font-medium">
              Batas: Rp 0 s/d Rp 2.000.000
            </span>
          </div>

          {errorInput && (
            <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {errorInput}
            </p>
          )}
        </div>

        {/* Preset Cepat Kas Awal */}
        <div>
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Pilihan Nominal Cepat:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((nominal) => (
              <button
                key={nominal}
                type="button"
                onClick={() => handleKasChange(nominal)}
                className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition border ${
                  kasAwal === nominal
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                }`}
              >
                {nominal === 0 ? 'Rp 0 (Kosong)' : formatRupiah(nominal)}
              </button>
            ))}
          </div>
        </div>

        {/* Ketentuan Bisnis Alert */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <Banknote className="w-4 h-4" />
            Ketentuan Shift Kasir:
          </div>
          <p className="leading-relaxed text-amber-950/80">
            • Transaksi POS hanya dapat diproses saat shift berstatus <strong>Buka</strong>.<br />
            • Anda tidak dapat membuka shift kedua sebelum shift saat ini resmi ditutup (rekonsiliasi kas).
          </p>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isPending || !!errorInput}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 text-white font-bold text-base shadow-lg shadow-amber-900/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Buka Shift Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
