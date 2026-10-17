'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { tutupShiftAction } from '@/app/actions/shift';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Clock,
  Banknote,
  QrCode,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  X,
  FileText,
  Lock,
  ArrowRight,
  Receipt
} from 'lucide-react';

interface ShiftAktifPanelProps {
  shift: any;
  transaksiList: any[];
}

export default function ShiftAktifPanel({ shift, transaksiList }: ShiftAktifPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uangFisik, setUangFisik] = useState<number>(0);
  const [catatanTutup, setCatatanTutup] = useState<string>('');

  // Perhitungan live dari transaksi lunas
  const totalTunai = transaksiList
    .filter((t) => t.metode_bayar === 'tunai' && t.status === 'lunas')
    .reduce((sum, t) => sum + t.total, 0);

  const totalQris = transaksiList
    .filter((t) => t.metode_bayar === 'qris' && t.status === 'lunas')
    .reduce((sum, t) => sum + t.total, 0);

  const kasSeharusnya = shift.kas_awal + totalTunai;
  const selisih = uangFisik - kasSeharusnya;
  const isLargeDiff = Math.abs(selisih) > 20000;

  const handleOpenCloseModal = () => {
    // Default nilai uang fisik disamakan dengan kas seharusnya agar memudahkan kasir
    setUangFisik(kasSeharusnya);
    setIsModalOpen(true);
  };

  const handleTutupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLargeDiff && (!catatanTutup || catatanTutup.trim().length < 3)) {
      toast.error('Catatan Wajib Diisi (BR-09)', {
        description: 'Karena selisih kas melebihi Rp 20.000, Anda wajib menyertakan alasan penutupan.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('shift_id', shift.id);
    formData.append('uang_fisik', uangFisik.toString());
    formData.append('catatan_tutup', catatanTutup);

    startTransition(async () => {
      const res = await tutupShiftAction(formData);
      if (res.success) {
        toast.success('Shift Berhasil Ditutup!', {
          description: res.message,
        });
        setIsModalOpen(false);
      } else {
        toast.error('Gagal Menutup Shift', {
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Shift Aktif */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-md p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sesi Shift Sedang Berjalan (Aktif)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Shift Aktif Kasir
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm">
              Dibuka pada: <strong className="text-stone-800 font-semibold">{formatDateWIB(shift.dibuka_pada)}</strong> · Cabang: {shift.cabang?.nama} ({shift.cabang?.kode})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/kasir"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md shadow-amber-950/20 flex items-center gap-2 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Kasir POS</span>
            </Link>

            <button
              onClick={handleOpenCloseModal}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Tutup Shift (Rekonsiliasi)</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Kas & Transaksi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Kas Awal */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/70">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Kas Awal (Modal)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-stone-900">
              {formatRupiah(shift.kas_awal)}
            </p>
            <span className="text-[11px] text-stone-400 mt-1 block">Uang awal di laci</span>
          </div>

          {/* Penjualan Tunai */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Penjualan Tunai</span>
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-900">
              {formatRupiah(totalTunai)}
            </p>
            <span className="text-[11px] text-emerald-600 mt-1 block">Masuk ke kas laci</span>
          </div>

          {/* Penjualan QRIS */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/60">
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Penjualan QRIS</span>
              <QrCode className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-blue-900">
              {formatRupiah(totalQris)}
            </p>
            <span className="text-[11px] text-blue-600 mt-1 block">Langsung masuk rekening</span>
          </div>

          {/* Kas Seharusnya di Laci */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Kas Seharusnya</span>
              <Calculator className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-950">
              {formatRupiah(kasSeharusnya)}
            </p>
            <span className="text-[11px] text-amber-700 mt-1 block">Modal Awal + Total Tunai</span>
          </div>
        </div>
      </div>

      {/* Tabel Transaksi Shift Ini */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-md overflow-hidden">
        <div className="p-5 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900">
              Transaksi pada Shift Ini ({transaksiList.length})
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            Akumulasi Omzet: <strong className="text-stone-800 font-mono">{formatRupiah(totalTunai + totalQris)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">No. Struk</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Diskon</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {transaksiList.length > 0 ? (
                transaksiList.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-stone-900">
                      {t.nomor_struk}
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-xs">
                      {formatDateWIB(t.dibuat_pada)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          t.metode_bayar === 'tunai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.metode_bayar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-700">
                      {formatRupiah(t.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-500">
                      {t.diskon > 0 ? `- ${formatRupiah(t.diskon)}` : 'Rp 0'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      {formatRupiah(t.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'void'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500 text-sm">
                    Belum ada transaksi pada shift ini. Klik <strong>Buka Kasir POS</strong> untuk mulai melayani pelanggan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TUTUP SHIFT (REKONSILIASI KAS BR-09) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  Rekonsiliasi Kas (BR-09)
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  Penutupan Shift Kasir
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleTutupSubmit} className="p-6 space-y-5">
              {/* Ringkasan Kas Seharusnya */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Modal Kas Awal:</span>
                  <strong className="font-mono text-stone-900">{formatRupiah(shift.kas_awal)}</strong>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total Penjualan Tunai:</span>
                  <strong className="font-mono text-emerald-700">+ {formatRupiah(totalTunai)}</strong>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900">
                  <span>Kas Seharusnya di Laci:</span>
                  <span className="font-mono text-amber-900 text-base">{formatRupiah(kasSeharusnya)}</span>
                </div>
              </div>

              {/* Input Uang Fisik */}
              <div>
                <label htmlFor="uang_fisik" className="block text-sm font-bold text-stone-900 mb-1.5">
                  Hitungan Uang Fisik Aktual di Laci (Rp)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 font-bold">
                    Rp
                  </div>
                  <input
                    id="uang_fisik"
                    type="number"
                    min={0}
                    step={1000}
                    value={uangFisik}
                    onChange={(e) => setUangFisik(Number(e.target.value))}
                    disabled={isPending}
                    className="w-full pl-12 pr-4 py-3 text-lg font-bold font-mono rounded-2xl border border-stone-300 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-600 transition bg-stone-50/50 text-stone-900"
                    placeholder="0"
                    required
                  />
                </div>
                <span className="text-xs text-stone-500 mt-1 block">
                  Terbaca: <strong className="text-stone-800 font-mono">{formatRupiah(uangFisik || 0)}</strong>
                </span>
              </div>

              {/* Status Selisih Kas */}
              <div
                className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
                  selisih === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isLargeDiff
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Selisih Kas:
                  </span>
                  <span className="font-bold">
                    {selisih === 0
                      ? 'Pas (Tidak Ada Selisih)'
                      : selisih > 0
                      ? `Kelebihan Uang (+${formatRupiah(selisih)})`
                      : `Kekurangan Uang (${formatRupiah(selisih)})`}
                  </span>
                </div>
                <div className="text-right font-mono font-bold text-lg">
                  {selisih > 0 ? `+${formatRupiah(selisih)}` : formatRupiah(selisih)}
                </div>
              </div>

              {/* Alert & Input Catatan jika Selisih > Rp 20.000 (BR-09) */}
              {isLargeDiff && (
                <div className="space-y-2 p-4 rounded-2xl bg-red-50/80 border border-red-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    Wajib Catatan Alasan Selisih (BR-09):
                  </div>
                  <p className="text-red-700 leading-relaxed">
                    Selisih kas melebihi batas toleransi <strong>Rp 20.000</strong>. Anda wajib menjelaskan penyebab selisih uang pada kolom di bawah ini.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="catatan_tutup"
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isLargeDiff ? 'text-red-700' : 'text-stone-700'
                  }`}
                >
                  Catatan Penutupan Kasir {isLargeDiff ? '(Wajib Diisi)' : '(Opsional)'}
                </label>
                <textarea
                  id="catatan_tutup"
                  rows={3}
                  value={catatanTutup}
                  onChange={(e) => setCatatanTutup(e.target.value)}
                  disabled={isPending}
                  required={isLargeDiff}
                  placeholder={
                    isLargeDiff
                      ? 'Jelaskan mengapa ada selisih kas fisik di atas Rp 20.000...'
                      : 'Catatan tambahan kondisi shift, sisa kembalian, dll...'
                  }
                  className={`w-full p-3 rounded-2xl border text-sm transition focus:ring-4 ${
                    isLargeDiff
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20'
                      : 'border-stone-300 focus:border-amber-600 focus:ring-amber-500/20 bg-stone-50/40'
                  }`}
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || (isLargeDiff && catatanTutup.trim().length < 3)}
                  className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold text-sm shadow-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Konfirmasi & Tutup Shift</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
