'use client';

import React, { useState, useMemo } from 'react';
import type { Produk, MetodeBayar } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  Banknote, 
  QrCode, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Percent
} from 'lucide-react';

export interface CartItem {
  produk: Produk;
  jumlah: number;
  stokTersedia: number | null;
}

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQty: (produkId: string, newQty: number) => void;
  onRemoveItem: (produkId: string) => void;
  onClearCart: () => void;
  diskon: number;
  onDiskonChange: (diskon: number) => void;
  alasanDiskon: string;
  onAlasanDiskonChange: (alasan: string) => void;
  metodeBayar: MetodeBayar;
  onMetodeBayarChange: (metode: MetodeBayar) => void;
  uangDiterima: number;
  onUangDiterimaChange: (uang: number) => void;
  onCheckout: () => void;
  isSubmitting: boolean;
}

export default function CartPanel({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  diskon,
  onDiskonChange,
  alasanDiskon,
  onAlasanDiskonChange,
  metodeBayar,
  onMetodeBayarChange,
  uangDiterima,
  onUangDiterimaChange,
  onCheckout,
  isSubmitting,
}: CartPanelProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Kalkulasi Subtotal
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produk.harga_jual * item.jumlah, 0);
  }, [cart]);

  // Batas Maksimal Diskon 10% (BR-06)
  const maxDiskon = useMemo(() => {
    return Math.round(subtotal * 0.10);
  }, [subtotal]);

  // Total Akhir
  const total = useMemo(() => {
    return Math.max(0, subtotal - diskon);
  }, [subtotal, diskon]);

  // Kalkulasi Kembalian (BR-07)
  const kembalian = useMemo(() => {
    if (metodeBayar === 'qris') return 0;
    return Math.max(0, uangDiterima - total);
  }, [metodeBayar, uangDiterima, total]);

  // Validasi Kelayakan Checkout
  const isCashInsufficient = metodeBayar === 'tunai' && uangDiterima < total;
  const isDiscountReasonMissing = diskon > 0 && alasanDiskon.trim().length === 0;
  const isCheckoutDisabled =
    cart.length === 0 ||
    isSubmitting ||
    isCashInsufficient ||
    isDiscountReasonMissing;

  // Shortcut tombol uang pas dan pecahan lazim (Tunai)
  const quickCashOptions = useMemo(() => {
    const list = [total];
    const standardBills = [20000, 50000, 100000, 150000, 200000];
    for (const bill of standardBills) {
      if (bill > total && !list.includes(bill)) {
        list.push(bill);
      }
    }
    return list.slice(0, 4);
  }, [total]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-md flex flex-col h-full overflow-hidden">
      {/* Top Header Keranjang */}
      <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-stone-900 text-base">Keranjang Belanja</h2>
            <p className="text-xs text-stone-500 font-medium">
              {cart.reduce((sum, item) => sum + item.jumlah, 0)} item dipilih
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            disabled={isSubmitting}
            className="text-xs text-stone-400 hover:text-red-600 font-semibold flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Daftar Item Keranjang (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[320px] lg:max-h-none">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-stone-600">Keranjang masih kosong</p>
            <p className="text-xs text-stone-400 max-w-[200px]">
              Klik kartu produk di katalog untuk menambahkan pesanan ke keranjang
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const isStockMax =
              item.produk.lacak_stok &&
              item.stokTersedia !== null &&
              item.jumlah >= item.stokTersedia;

            return (
              <div
                key={item.produk.id}
                className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200/60 flex flex-col gap-2 hover:border-amber-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                      {item.produk.nama}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-mono">
                      {formatRupiah(item.produk.harga_jual)} / unit
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.produk.id)}
                    className="text-stone-300 hover:text-red-500 p-1 rounded-lg transition"
                    title="Hapus dari keranjang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Counter & Subtotal Row */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-stone-200 p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.produk.id, item.jumlah - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition"
                      title="Kurangi"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-8 text-center font-bold text-xs font-mono text-stone-900">
                      {item.jumlah}
                    </span>

                    <button
                      type="button"
                      disabled={isStockMax || item.jumlah >= 99}
                      onClick={() => onUpdateQty(item.produk.id, item.jumlah + 1)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        isStockMax || item.jumlah >= 99
                          ? 'text-stone-300 cursor-not-allowed'
                          : 'text-stone-700 hover:bg-stone-100 active:bg-stone-200'
                      }`}
                      title={isStockMax ? 'Batas stok tercapai' : 'Tambah'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal Item */}
                  <div className="text-right">
                    <span className="font-extrabold text-stone-900 text-xs sm:text-sm font-mono">
                      {formatRupiah(item.produk.harga_jual * item.jumlah)}
                    </span>
                  </div>
                </div>

                {/* Sisa Stok Warning if near maximum */}
                {isStockMax && (
                  <p className="text-[10px] text-amber-700 font-medium">
                    Maksimal stok tercapai ({item.stokTersedia} unit).
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bagian Perhitungan & Pembayaran */}
      {cart.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/50 space-y-4 shrink-0">
          {/* Subtotal & Diskon Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Subtotal Belanja</span>
              <span className="font-mono font-bold text-stone-800">
                {formatRupiah(subtotal)}
              </span>
            </div>

            {/* Tombol Diskon Toggle */}
            <div className="pt-1">
              {!showDiscountInput && diskon === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>+ Beri Diskon (Maks. 10% - BR-06)</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-amber-700" />
                      Diskon Transaksi (Maks. 10%)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDiskonChange(0);
                        onAlasanDiskonChange('');
                        setShowDiscountInput(false);
                      }}
                      className="text-[10px] text-amber-800 hover:text-red-600 font-bold"
                    >
                      Batal Diskon
                    </button>
                  </div>

                  {/* Preset Diskon: 5% & 10% */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDiskonChange(Math.round(subtotal * 0.05))}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
                        diskon === Math.round(subtotal * 0.05)
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      5% ({formatRupiah(Math.round(subtotal * 0.05))})
                    </button>
                    <button
                      type="button"
                      onClick={() => onDiskonChange(maxDiskon)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
                        diskon === maxDiskon
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      10% ({formatRupiah(maxDiskon)})
                    </button>
                  </div>

                  {/* Input Alasan Diskon (BR-06: Wajib diisi jika diskon > 0) */}
                  {diskon > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-900 block">
                        Alasan Diskon (Wajib Diisi - BR-06):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Promo Grand Opening / Anggota Komunitas"
                        value={alasanDiskon}
                        onChange={(e) => onAlasanDiskonChange(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-xl text-xs bg-white border focus:outline-none transition ${
                          alasanDiskon.trim().length === 0
                            ? 'border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-400'
                            : 'border-amber-300 focus:border-amber-600'
                        }`}
                      />
                      {alasanDiskon.trim().length === 0 && (
                        <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Alasan diskon tidak boleh kosong (BR-06).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total Akhir */}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
              <span className="text-sm font-extrabold text-stone-900 uppercase tracking-tight">
                Total Tagihan
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-800 font-mono tracking-tight">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          {/* Pemilihan Metode Pembayaran (BR-07) */}
          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-bold text-stone-700 block">
              Metode Pembayaran (BR-07)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onMetodeBayarChange('tunai');
                  onUangDiterimaChange(total);
                }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  metodeBayar === 'tunai'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onMetodeBayarChange('qris');
                  onUangDiterimaChange(total);
                }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  metodeBayar === 'qris'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS Manual</span>
              </button>
            </div>

            {/* Form Input Sesuai Metode Bayar */}
            {metodeBayar === 'tunai' ? (
              <div className="space-y-2 pt-1">
                {/* Tombol Pecahan Uang Cepat */}
                <div className="flex flex-wrap gap-1.5">
                  {quickCashOptions.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => onUangDiterimaChange(amount)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border font-mono transition ${
                        uangDiterima === amount
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {amount === total ? 'Uang Pas' : formatRupiah(amount)}
                    </button>
                  ))}
                </div>

                {/* Input Manual Uang Diterima */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-medium">Uang Diterima:</span>
                    <span className="text-stone-400 text-[10px]">Rp</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={uangDiterima || ''}
                    onChange={(e) => onUangDiterimaChange(Number(e.target.value) || 0)}
                    placeholder="Masukkan nominal uang tunai"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono font-bold text-sm text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                {/* Status Kembalian / Kekurangan */}
                {isCashInsufficient ? (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>
                      Uang kurang:{' '}
                      <strong className="font-mono">
                        {formatRupiah(total - uangDiterima)}
                      </strong>{' '}
                      (BR-07).
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Kembalian:
                    </span>
                    <strong className="font-mono text-sm font-extrabold text-emerald-950">
                      {formatRupiah(kembalian)}
                    </strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-stone-100/80 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span>Nominal QRIS:</span>
                  <span className="font-bold font-mono text-stone-900">{formatRupiah(total)}</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Tunjukkan barcode QRIS statis kasir ke pelanggan. Pastikan bukti transfer terverifikasi lunas sebelum menekan tombol bayar (BR-07: nominal pas, kembalian Rp0).
                </p>
              </div>
            )}
          </div>

          {/* Tombol Eksekusi Checkout */}
          <button
            type="button"
            disabled={isCheckoutDisabled}
            onClick={onCheckout}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition ${
              isCheckoutDisabled
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-950/20 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan Transaksi...</span>
              </div>
            ) : (
              <>
                <span>Bayar Sekarang · {formatRupiah(total)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
