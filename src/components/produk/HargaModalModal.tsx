'use client';

import React, { useState, useTransition } from 'react';
import type { Produk, RiwayatHargaModal } from '@/types/database';
import { tambahHargaModalAction } from '@/app/actions/produk';
import { toast } from 'sonner';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { DollarSign, Plus, X, Calendar, AlertCircle, History, ShieldAlert } from 'lucide-react';

interface HargaModalModalProps {
  produk: Produk;
  riwayatList: RiwayatHargaModal[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HargaModalModal({
  produk,
  riwayatList,
  onClose,
  onSuccess,
}: HargaModalModalProps) {
  // Tanggal hari ini di WIB (format YYYY-MM-DD)
  const todayWIB = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  const [hargaModal, setHargaModal] = useState<number | ''>('');
  const [berlakuMulai, setBerlakuMulai] = useState<string>(todayWIB);
  const [isPending, startTransition] = useTransition();

  const isDateInPast = berlakuMulai < todayWIB;
  const isFormValid =
    hargaModal !== '' &&
    Number(hargaModal) >= 0 &&
    berlakuMulai.length > 0 &&
    !isDateInPast;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      if (isDateInPast) {
        toast.error('Tanggal mulai berlaku tidak boleh di masa lalu.');
      } else {
        toast.error('Periksa kembali input harga modal.');
      }
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('produk_id', produk.id);
      formData.set('harga_modal', String(Math.round(Number(hargaModal))));
      formData.set('berlaku_mulai', berlakuMulai);

      const res = await tambahHargaModalAction(formData);

      if (!res.success) {
        toast.error(res.error || 'Gagal menambahkan harga modal.');
        return;
      }

      toast.success(res.message || 'Harga modal baru berhasil ditambahkan.');
      setHargaModal('');
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-amber-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-amber-700/50">
              <DollarSign className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Riwayat Harga Modal (Rahasia)</h3>
              <p className="text-xs text-amber-200 font-mono">
                {produk.sku} · {produk.nama}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-full hover:bg-amber-900/50 text-amber-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Banner Kerahasiaan */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="leading-relaxed">
              Data harga modal dilindungi RLS database dan <strong>hanya dapat diakses oleh Owner</strong> untuk keperluan HPP dan laba kotor.
            </p>
          </div>

          {/* Form Tambah Harga Modal Baru */}
          <form onSubmit={handleSubmit} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              Tetapkan Harga Modal Baru
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Harga Modal (Rp):
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  placeholder="Contoh: 12000"
                  value={hargaModal}
                  onChange={(e) => setHargaModal(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Berlaku Mulai:
                </label>
                <input
                  type="date"
                  required
                  min={todayWIB}
                  value={berlakuMulai}
                  onChange={(e) => setBerlakuMulai(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-white border text-xs font-mono font-bold focus:outline-none transition ${
                    isDateInPast ? 'border-red-400 text-red-700' : 'border-stone-300 text-stone-900 focus:border-amber-600'
                  }`}
                />
              </div>
            </div>

            {isDateInPast && (
              <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Tanggal mulai berlaku tidak boleh di masa lalu.
              </p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isPending}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                !isFormValid || isPending
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  : 'bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white shadow-sm'
              }`}
            >
              {isPending ? 'Menyimpan...' : 'Simpan Harga Modal Baru'}
            </button>
          </form>

          {/* Daftar Riwayat Modal Sebelumnya */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-stone-500" />
              Riwayat Perubahan Modal Sebelumnya:
            </span>

            {riwayatList.length === 0 ? (
              <p className="text-xs text-stone-400 italic p-3 text-center bg-stone-50 rounded-xl">
                Belum ada data riwayat harga modal untuk produk ini.
              </p>
            ) : (
              <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 text-xs">
                {riwayatList.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 flex items-center justify-between hover:bg-stone-50">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-sm">
                        {formatRupiah(item.harga_modal)}
                      </span>
                      <p className="text-[10px] text-stone-500">
                        Mulai berlaku: {formatDateWIB(item.berlaku_mulai)}
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Aktif Terkini
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
