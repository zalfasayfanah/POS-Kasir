'use client';

import React, { useState, useTransition, useMemo } from 'react';
import type { StokCabang } from '@/types/database';
import { sesuaikanStokAction } from '@/app/actions/stok';
import { toast } from 'sonner';
import { Package, ArrowRight, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StokModalProps {
  stokItem: StokCabang;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StokModal({ stokItem, onClose, onSuccess }: StokModalProps) {
  const [tipe, setTipe] = useState<'masuk' | 'rusak' | 'opname'>('masuk');
  const [jumlah, setJumlah] = useState<number>(1);
  const [alasan, setAlasan] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentStok = stokItem.jumlah;

  // Kalkulasi Stok Akhir Berdasarkan Pilihan
  const calculatedNewStok = useMemo(() => {
    const qty = Math.max(0, Math.round(Number(jumlah) || 0));
    if (tipe === 'masuk') {
      return currentStok + qty;
    } else if (tipe === 'rusak') {
      return Math.max(0, currentStok - qty);
    } else {
      // opname
      return qty;
    }
  }, [currentStok, tipe, jumlah]);

  const isExceeding = tipe === 'rusak' && Number(jumlah) > currentStok;
  const isReasonValid = alasan.trim().length >= 5;
  const isFormValid =
    !isExceeding &&
    isReasonValid &&
    (tipe === 'opname' ? Number(jumlah) >= 0 : Number(jumlah) > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Periksa kembali input jumlah dan alasan penyesuaian stok.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('cabang_id', stokItem.cabang_id);
      formData.set('produk_id', stokItem.produk_id);
      formData.set('tipe', tipe);
      formData.set('jumlah', String(Math.round(Number(jumlah))));
      formData.set('alasan', alasan.trim());

      const res = await sesuaikanStokAction(formData);

      if (!res.success) {
        toast.error(res.error || 'Gagal menyesuaikan stok.');
        return;
      }

      toast.success(res.message || 'Stok berhasil diperbarui.');
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
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Penyesuaian Stok Cabang</h3>
              <p className="text-xs text-amber-100 font-mono">
                {stokItem.produk?.sku} · {stokItem.produk?.nama}
              </p>
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
          {/* Info Singkat Cabang & Produk */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-400 block font-medium">Cabang Tugas:</span>
              <span className="font-bold text-stone-800 text-sm">
                {stokItem.cabang?.kode} · {stokItem.cabang?.nama}
              </span>
            </div>
            <div className="text-right">
              <span className="text-stone-400 block font-medium">Stok Saat Ini:</span>
              <span className="font-mono font-black text-amber-900 text-lg">
                {currentStok} unit
              </span>
            </div>
          </div>

          {/* Pilihan Tipe Penyesuaian */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 block">
              Tipe Penyesuaian Stok:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipe('masuk')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  tipe === 'masuk'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>Barang Masuk</span>
                <span className="text-[10px] opacity-80">(+ Tambah)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipe('rusak')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  tipe === 'rusak'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>Barang Rusak</span>
                <span className="text-[10px] opacity-80">(- Kurangi)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipe('opname')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  tipe === 'opname'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>Stock Opname</span>
                <span className="text-[10px] opacity-80">(= Set Nilai)</span>
              </button>
            </div>
          </div>

          {/* Input Jumlah & Pratinjau Perubahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                {tipe === 'opname' ? 'Jumlah Fisik Hasil Opname:' : 'Kuantitas Penyesuaian:'}
              </label>
              <input
                type="number"
                min={0}
                required
                disabled={isPending}
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono font-bold text-sm text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              />
            </div>

            {/* Kotak Pratinjau Nilai Akhir */}
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Stok Akhir:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <span className="text-stone-400">{currentStok}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-base text-amber-950 font-black">{calculatedNewStok} unit</span>
              </div>
            </div>
          </div>

          {/* Warning Jika Melebihi Stok */}
          {isExceeding && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                Jumlah barang rusak ({jumlah}) tidak boleh melebihi stok yang ada ({currentStok}).
              </span>
            </div>
          )}

          {/* Input Alasan Penyesuaian (Wajib Diisi - US-07 & BR-12) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 block">
                Alasan Penyesuaian (Wajib Diisi - Minimal 5 Karakter):
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  isReasonValid ? 'text-emerald-700' : 'text-stone-400'
                }`}
              >
                {alasan.trim().length} / 5 karakter
              </span>
            </div>

            <textarea
              rows={2}
              required
              disabled={isPending}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Pengiriman stok baru dari supplier / Roti kedaluwarsa 2 pcs / Hasil opname mingguan"
              className={`w-full p-3 rounded-2xl text-xs bg-white border focus:outline-none transition ${
                alasan.length > 0 && !isReasonValid
                  ? 'border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-400'
                  : 'border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
              }`}
            />
          </div>

          {/* Banner Audit Log Permanen (BR-12) */}
          <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded-xl border border-stone-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Setiap penyesuaian stok akan dicatat permanen dalam Audit Log sistem.</span>
          </div>

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
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </div>
              ) : (
                <span>Simpan Penyesuaian Stok</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
