'use client';

import React from 'react';
import type { Produk } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Coffee, 
  Sparkles, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';

export interface CustomerCartItem {
  produk: Produk;
  jumlah: number;
  catatan?: string;
}

interface CustomerCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CustomerCartItem[];
  branchStockMap: Record<string, number>;
  onUpdateQty: (produkId: string, newQty: number) => void;
  onRemoveItem: (produkId: string) => void;
  onClearCart: () => void;
  nomorMeja: string;
  onNomorMejaChange: (meja: string) => void;
  namaPelanggan: string;
  onNamaPelangganChange: (nama: string) => void;
  catatanPesanan: string;
  onCatatanPesananChange: (catatan: string) => void;
  onCheckout: () => void;
  isSubmitting: boolean;
}

export default function CustomerCartDrawer({
  isOpen,
  onClose,
  cart,
  branchStockMap,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  nomorMeja,
  onNomorMejaChange,
  namaPelanggan,
  onNamaPelangganChange,
  catatanPesanan,
  onCatatanPesananChange,
  onCheckout,
  isSubmitting,
}: CustomerCartDrawerProps) {
  if (!isOpen) return null;

  const total = cart.reduce(
    (acc, item) => acc + item.produk.harga_jual * item.jumlah,
    0
  );

  const isCheckoutDisabled =
    cart.length === 0 ||
    isSubmitting ||
    !nomorMeja.trim() ||
    !namaPelanggan.trim();

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
              {cart.reduce((s, i) => s + i.jumlah, 0)}
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Pesanan Meja Anda</h3>
              <p className="text-[11px] text-stone-500">Periksa kembali item & nomor meja</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-stone-400 hover:text-red-600 text-xs font-semibold p-1.5 rounded-lg hover:bg-red-50 transition"
                title="Kosongkan Keranjang"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Form Identitas Pelanggan & Meja */}
          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
            <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
              Identitas Pemesan di Meja
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] font-semibold text-stone-600 flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-amber-600" />
                  Nama Anda *
                </label>
                <input
                  type="text"
                  required
                  value={namaPelanggan}
                  onChange={(e) => onNamaPelangganChange(e.target.value)}
                  placeholder="Cth: Budi"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-stone-600 flex items-center gap-1 mb-1">
                  <Coffee className="w-3 h-3 text-amber-600" />
                  Nomor Meja *
                </label>
                <input
                  type="text"
                  required
                  value={nomorMeja}
                  onChange={(e) => onNomorMejaChange(e.target.value)}
                  placeholder="Cth: 05"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-stone-600 flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3 text-stone-400" />
                Catatan Pesanan (Opsional)
              </label>
              <input
                type="text"
                value={catatanPesanan}
                onChange={(e) => onCatatanPesananChange(e.target.value)}
                placeholder="Cth: Kopi less sugar, es dipisah"
                className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Daftar Produk */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Daftar Pesanan ({cart.length} macam)
            </span>

            {cart.map((item) => {
              const maxStock = item.produk.lacak_stok
                ? branchStockMap[item.produk.id] ?? 99
                : 99;

              return (
                <div
                  key={item.produk.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-stone-900 truncate">
                      {item.produk.nama}
                    </h4>
                    <p className="text-[11px] font-mono font-semibold text-stone-600">
                      {formatRupiah(item.produk.harga_jual)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-stone-200 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.produk.id, item.jumlah - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-6 text-center font-bold text-xs font-mono text-stone-900">
                      {item.jumlah}
                    </span>

                    <button
                      type="button"
                      disabled={item.jumlah >= maxStock || item.jumlah >= 99}
                      onClick={() => onUpdateQty(item.produk.id, item.jumlah + 1)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        item.jumlah >= maxStock || item.jumlah >= 99
                          ? 'text-stone-300 cursor-not-allowed'
                          : 'text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal Item */}
                  <div className="text-right min-w-[70px]">
                    <span className="font-mono font-extrabold text-xs text-stone-950">
                      {formatRupiah(item.produk.harga_jual * item.jumlah)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer & Checkout Button */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/70 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">Total Pembayaran</span>
            <span className="text-base font-black font-mono text-stone-950">
              {formatRupiah(total)}
            </span>
          </div>

          <button
            type="button"
            disabled={isCheckoutDisabled}
            onClick={onCheckout}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition ${
              isCheckoutDisabled
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                : 'bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-white shadow-amber-950/20 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyiapkan QRIS Mayar...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Bayar Sekarang via QRIS · {formatRupiah(total)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
