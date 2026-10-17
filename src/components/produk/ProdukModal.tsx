'use client';

import React, { useState, useTransition } from 'react';
import type { Produk, KategoriProduk } from '@/types/database';
import { tambahProdukAction, updateProdukAction } from '@/app/actions/produk';
import { toast } from 'sonner';
import { Coffee, Plus, Edit3, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProdukModalProps {
  produk?: Produk | null; // null jika mode tambah, objek jika mode edit
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ProdukModal({ produk, onClose, onSuccess }: ProdukModalProps) {
  const isEdit = Boolean(produk);

  const [sku, setSku] = useState(produk?.sku || '');
  const [nama, setNama] = useState(produk?.nama || '');
  const [kategori, setKategori] = useState<KategoriProduk>(produk?.kategori || 'kopi');
  const [hargaJual, setHargaJual] = useState<number | ''>(produk?.harga_jual ?? '');
  const [lacakStok, setLacakStok] = useState<boolean>(produk?.lacak_stok ?? false);
  const [aktif, setAktif] = useState<boolean>(produk?.aktif ?? true);
  const [hargaModalAwal, setHargaModalAwal] = useState<number | ''>('');

  const [isPending, startTransition] = useTransition();

  const isFormValid =
    nama.trim().length > 0 &&
    (isEdit || sku.trim().length >= 3) &&
    hargaJual !== '' &&
    Number(hargaJual) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Periksa kembali kolom isian formulir produk.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('nama', nama.trim());
      formData.set('kategori', kategori);
      formData.set('harga_jual', String(Math.round(Number(hargaJual))));

      if (isEdit) {
        formData.set('id', produk!.id);
        formData.set('aktif', String(aktif));
        const res = await updateProdukAction(formData);

        if (!res.success) {
          toast.error(res.error || 'Gagal mengubah produk.');
          return;
        }

        toast.success(res.message || 'Produk berhasil diperbarui.');
      } else {
        formData.set('sku', sku.trim().toUpperCase());
        formData.set('lacak_stok', String(lacakStok));
        if (hargaModalAwal !== '') {
          formData.set('harga_modal_awal', String(Math.round(Number(hargaModalAwal))));
        }

        const res = await tambahProdukAction(formData);

        if (!res.success) {
          toast.error(res.error || 'Gagal membuat produk baru.');
          return;
        }

        toast.success(res.message || 'Produk baru berhasil ditambahkan.');
      }

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
              {isEdit ? <Edit3 className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                {isEdit ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-xs text-amber-100">
                {isEdit ? `SKU: ${produk?.sku}` : 'Katalog Lumbung Kopi dan Roti (US-08)'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* SKU */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                Kode SKU (Unik):
              </label>
              <input
                type="text"
                required
                disabled={isEdit || isPending}
                placeholder="Contoh: KOP-009 / ROT-005"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                  isEdit
                    ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                    : 'bg-white border-stone-300 focus:outline-none focus:border-amber-600 text-stone-900'
                }`}
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                Kategori Produk:
              </label>
              <select
                disabled={isPending}
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriProduk)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:border-amber-600 transition"
              >
                <option value="kopi">Kopi</option>
                <option value="non_kopi">Non Kopi</option>
                <option value="roti">Roti & Pastry</option>
                <option value="snack">Snack</option>
                <option value="kemasan">Kemasan / Biji Kopi</option>
              </select>
            </div>
          </div>

          {/* Nama Produk */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 block">
              Nama Produk:
            </label>
            <input
              type="text"
              required
              disabled={isPending}
              placeholder="Contoh: Caramel Macchiato Panas"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-600 transition"
            />
          </div>

          {/* Harga Jual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-800 block">
                Harga Jual Kasir (Rp):
              </label>
              <input
                type="number"
                min={1000}
                step={500}
                required
                disabled={isPending}
                placeholder="Contoh: 28000"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-amber-600 transition"
              />
            </div>

            {/* Input Tambahan Berdasarkan Mode */}
            {!isEdit ? (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-800 block">
                  Harga Modal Awal (Opsional):
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  disabled={isPending}
                  placeholder="Contoh: 14000"
                  value={hargaModalAwal}
                  onChange={(e) => setHargaModalAwal(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 font-mono font-semibold text-xs text-stone-900 focus:outline-none focus:border-amber-600 transition"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-800 block">
                  Status Penjualan:
                </label>
                <select
                  disabled={isPending}
                  value={aktif ? 'true' : 'false'}
                  onChange={(e) => setAktif(e.target.value === 'true')}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-600 transition"
                >
                  <option value="true">Aktif (Dijual di Kasir)</option>
                  <option value="false">Nonaktif (Sembunyikan dari POS)</option>
                </select>
              </div>
            )}
          </div>

          {/* Opsi Pelacakan Stok (Hanya Saat Tambah Produk Baru) */}
          {!isEdit && (
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lacakStok}
                  onChange={(e) => setLacakStok(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <span className="text-xs font-bold text-stone-800">
                  Lacak Stok Fisik di Cabang (Inventori)
                </span>
              </label>
              <p className="text-[11px] text-stone-500 pl-6 leading-relaxed">
                Centang untuk roti, snack, atau biji kopi kemasan. Kosongkan untuk produk racikan bar (kopi & minuman).
              </p>
            </div>
          )}

          {/* Modal Actions */}
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
              {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
