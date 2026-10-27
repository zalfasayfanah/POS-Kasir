'use client';

import React, { useState, useTransition } from 'react';
import type { Transaksi } from '@/types/database';
import { voidTransaksiAction } from '@/app/actions/transaksi';
import { toast } from 'sonner';
import { Ban, AlertTriangle, X, CheckCircle2, Clock } from 'lucide-react';
import { formatRupiah, formatDateWIB } from '@/lib/utils';

interface VoidModalProps {
  transaksi: Transaksi;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VoidModal({ transaksi, onClose, onSuccess }: VoidModalProps) {
  const [alasanVoid, setAlasanVoid] = useState('');
  const [isPending, startTransition] = useTransition();

  const charCount = alasanVoid.trim().length;
  const isReasonValid = charCount >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isReasonValid) {
      toast.error('Alasan void wajib diisi minimal 10 karakter.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('transaksi_id', transaksi.id);
      formData.set('alasan_void', alasanVoid.trim());

      const res = await voidTransaksiAction(formData);

      if (!res.success) {
        toast.error(res.error || 'Gagal membatalkan transaksi.');
        return;
      }

      toast.success(res.message || 'Transaksi berhasil di-void.');
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-red-500/30">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Void Transaksi Penjualan</h3>
              <p className="text-xs text-red-100 font-mono">{transaksi.nomor_struk}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-full hover:bg-red-700/50 text-red-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning Banner Ketentuan */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Aturan Operasional Void</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-800 text-[11px]">
              <li>Hanya Kepala Toko cabang terkait atau Owner yang berhak melakukan void.</li>
              <li>Hanya transaksi yang dibuat pada hari yang sama (WIB) yang dapat dibatalkan.</li>
              <li>Shift kasir bersangkutan masih harus berstatus <strong>buka</strong>.</li>
              <li>Stok produk yang dilacak akan <strong>otomatis dikembalikan</strong> ke cabang.</li>
              <li>Tindakan ini akan <strong>tercatat permanen</strong> di audit log sistem.</li>
            </ul>
          </div>

          {/* Rincian Transaksi */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Waktu Dibuat:</span>
              <span className="font-semibold text-stone-800">
                {formatDateWIB(transaksi.dibuat_pada)}
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Total Tagihan:</span>
              <span className="font-mono font-bold text-stone-900 text-sm">
                {formatRupiah(transaksi.total)}
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Metode Pembayaran:</span>
              <span className="uppercase font-bold text-stone-800">
                {transaksi.metode_bayar}
              </span>
            </div>
          </div>

          {/* Input Alasan Void */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 block">
                Alasan Pembatalan / Void (Wajib Minimal 10 Karakter):
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  charCount >= 10 ? 'text-emerald-700' : 'text-stone-400'
                }`}
              >
                {charCount} / 10 karakter
              </span>
            </div>

            <textarea
              rows={3}
              required
              disabled={isPending}
              value={alasanVoid}
              onChange={(e) => setAlasanVoid(e.target.value)}
              placeholder="Contoh: Salah input pesanan meja oleh kasir, pelanggan minta ganti menu"
              className={`w-full p-3 rounded-2xl text-xs bg-white border focus:outline-none transition ${
                charCount > 0 && charCount < 10
                  ? 'border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-400'
                  : 'border-stone-300 focus:border-red-600 focus:ring-1 focus:ring-red-600'
              }`}
            />

            {charCount > 0 && charCount < 10 && (
              <p className="text-[10px] text-red-600 font-semibold">
                Alasan masih kurang {10 - charCount} karakter lagi.
              </p>
            )}
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
              disabled={!isReasonValid || isPending}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 ${
                !isReasonValid || isPending
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-red-950/20'
              }`}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Void...</span>
                </div>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  <span>Konfirmasi Void Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
