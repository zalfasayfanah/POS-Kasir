'use client';

import React from 'react';
import type { Produk } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { Plus, Coffee, Sparkles, AlertTriangle, Check, Layers } from 'lucide-react';

interface ProductCardProps {
  produk: Produk;
  stokCabang: number | null;
  stokMinimum?: number;
  qtyInCart: number;
  onAddToCart: (produk: Produk) => void;
}

export default function ProductCard({
  produk,
  stokCabang,
  stokMinimum = 5,
  qtyInCart,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = produk.lacak_stok && (stokCabang === null || stokCabang <= 0);
  const isLowStock = produk.lacak_stok && stokCabang !== null && stokCabang > 0 && stokCabang <= stokMinimum;
  const isStockExceeded = produk.lacak_stok && stokCabang !== null && qtyInCart >= stokCabang;

  // Format kategori
  const getCategoryBadge = () => {
    switch (produk.kategori) {
      case 'kopi':
        return { label: 'Kopi', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'non_kopi':
        return { label: 'Non Kopi', bg: 'bg-orange-100 text-orange-900 border-orange-300' };
      case 'roti':
        return { label: 'Roti / Pastry', bg: 'bg-yellow-100 text-yellow-900 border-yellow-300' };
      case 'snack':
        return { label: 'Snack', bg: 'bg-stone-100 text-stone-800 border-stone-300' };
      case 'kemasan':
        return { label: 'Kemasan', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      default:
        return { label: produk.kategori, bg: 'bg-stone-100 text-stone-800 border-stone-300' };
    }
  };

  const catBadge = getCategoryBadge();

  return (
    <div
      onClick={() => {
        if (!isOutOfStock && !isStockExceeded) {
          onAddToCart(produk);
        }
      }}
      className={`group relative bg-white rounded-2xl p-4 border transition-all duration-200 select-none flex flex-col justify-between ${
        isOutOfStock
          ? 'opacity-60 border-stone-200 cursor-not-allowed bg-stone-50'
          : isStockExceeded
          ? 'border-stone-300 hover:border-stone-400 cursor-not-allowed bg-stone-50/50'
          : 'border-stone-200/90 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Badge In Cart Counter */}
      {qtyInCart > 0 && (
        <div className="absolute -top-2.5 -right-2.5 bg-amber-600 text-white font-extrabold text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10 animate-in zoom-in-50 duration-150">
          {qtyInCart}
        </div>
      )}

      <div>
        {/* Top Meta: Kategori & Stock Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${catBadge.bg}`}
          >
            {catBadge.label}
          </span>

          {/* Sisa Stok Tag */}
          {!produk.lacak_stok ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
              <Layers className="w-3 h-3 text-stone-400" />
              <span>Bar / Ready</span>
            </span>
          ) : isOutOfStock ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-300">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Habis (0)</span>
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-700" />
              <span>Sisa {stokCabang}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Stok: {stokCabang}</span>
            </span>
          )}
        </div>

        {/* Product Name & SKU */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-stone-400 tracking-wider">
            {produk.sku}
          </span>
          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-800 transition">
            {produk.nama}
          </h3>
        </div>
      </div>

      {/* Bottom: Price & Quick Action Button */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-stone-400 block font-medium">Harga Jual</span>
          <span className="text-sm sm:text-base font-extrabold text-stone-900 font-mono tracking-tight">
            {formatRupiah(produk.harga_jual)}
          </span>
        </div>

        <button
          type="button"
          disabled={isOutOfStock || isStockExceeded}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock && !isStockExceeded) {
              onAddToCart(produk);
            }
          }}
          className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition shadow-sm ${
            isOutOfStock
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : isStockExceeded
              ? 'bg-amber-100 text-amber-800 cursor-not-allowed border border-amber-300'
              : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-900/10'
          }`}
          title={
            isOutOfStock
              ? 'Stok produk habis'
              : isStockExceeded
              ? 'Jumlah di keranjang sudah mencapai batas stok cabang'
              : 'Tambah ke keranjang'
          }
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
