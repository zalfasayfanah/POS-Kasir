'use client';

import React, { useState, useMemo } from 'react';
import type { Profile, StokCabang, Cabang } from '@/types/database';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Building2, 
  Edit3,
  TrendingDown,
  XCircle,
  Filter
} from 'lucide-react';
import StokModal from './StokModal';

interface StokClientProps {
  profile: Profile;
  initialStock: StokCabang[];
  branches: Cabang[];
}

export default function StokClient({
  profile,
  initialStock,
  branches,
}: StokClientProps) {
  // State Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('semua');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'menipis' | 'aman' | 'habis'>('semua');
  const [cabangFilter, setCabangFilter] = useState<string>('semua');

  // State Modal Penyesuaian
  const [selectedStok, setSelectedStok] = useState<StokCabang | null>(null);

  // Wewenang: Hanya Kepala Toko dan Owner (US-07)
  const canAdjustStock = profile.peran === 'kepala_toko' || profile.peran === 'owner';

  // Kalkulasi Metrik Ringkasan
  const metrics = useMemo(() => {
    const totalItems = initialStock.length;
    const outOfStock = initialStock.filter((s) => s.jumlah === 0).length;
    const lowStock = initialStock.filter(
      (s) => s.jumlah > 0 && s.jumlah <= s.stok_minimum
    ).length;
    const safeStock = initialStock.filter((s) => s.jumlah > s.stok_minimum).length;

    return { totalItems, outOfStock, lowStock, safeStock };
  }, [initialStock]);

  // Filter Data Stok
  const filteredStock = useMemo(() => {
    return initialStock.filter((item) => {
      // 1. Search filter
      const matchSearch =
        searchQuery.trim().length === 0 ||
        item.produk?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.produk?.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Kategori filter
      const matchKategori =
        kategoriFilter === 'semua' || item.produk?.kategori === kategoriFilter;

      // 3. Status filter
      let matchStatus = true;
      if (statusFilter === 'habis') {
        matchStatus = item.jumlah === 0;
      } else if (statusFilter === 'menipis') {
        matchStatus = item.jumlah <= item.stok_minimum;
      } else if (statusFilter === 'aman') {
        matchStatus = item.jumlah > item.stok_minimum;
      }

      // 4. Cabang filter
      const matchCabang =
        cabangFilter === 'semua' || item.cabang_id === cabangFilter;

      return matchSearch && matchKategori && matchStatus && matchCabang;
    });
  }, [initialStock, searchQuery, kategoriFilter, statusFilter, cabangFilter]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            Inventori & Stok Fisik Cabang (US-07)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Stok Cabang
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Petugas bertugas: <span className="font-semibold text-stone-800">{profile.nama_lengkap}</span> ({profile.peran}) · {profile.cabang ? profile.cabang.nama : 'Semua Cabang'}
          </p>
        </div>
      </div>

      {/* Kartu Metrik Ringkasan Inventori */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Total Produk Dilacak</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
            {metrics.totalItems}
          </p>
          <p className="text-[11px] text-stone-400">Roti, pastry, snack & kemasan</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
            {metrics.lowStock}
          </p>
          <p className="text-[11px] text-amber-600">Perlu restock segera</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span>Stok Habis (0)</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-700 font-mono">
            {metrics.outOfStock}
          </p>
          <p className="text-[11px] text-red-500">Tidak dapat dijual di POS</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Stok Aman</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {metrics.safeStock}
          </p>
          <p className="text-[11px] text-emerald-600">Di atas batas minimum</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk atau SKU..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white transition"
            />
          </div>

          {/* Filter Status Stok */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Status Stok</option>
            <option value="menipis">Stok Menipis (≤ Minimum)</option>
            <option value="habis">Stok Habis (0 Unit)</option>
            <option value="aman">Stok Aman (&gt; Minimum)</option>
          </select>

          {/* Filter Kategori */}
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Kategori Produk</option>
            <option value="roti">Roti & Pastry</option>
            <option value="snack">Snack</option>
            <option value="kemasan">Kemasan / Biji Kopi</option>
          </select>
        </div>

        {/* Filter Cabang (Khusus Owner) */}
        {profile.peran === 'owner' && branches.length > 1 && (
          <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Cabang:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCabangFilter('semua')}
                className={`text-xs px-3 py-1 rounded-xl font-bold transition ${
                  cabangFilter === 'semua'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua Cabang
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCabangFilter(b.id)}
                  className={`text-xs px-3 py-1 rounded-xl font-bold transition ${
                    cabangFilter === b.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {b.kode} · {b.nama}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabel Stok Cabang */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Daftar Stok Produk per Cabang
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
              {filteredStock.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-500 font-bold text-[11px] uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">Cabang</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Nama Produk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Batas Minimum</th>
                <th className="py-3.5 px-4 text-right">Stok Fisik</th>
                <th className="py-3.5 px-4 text-center">Kondisi</th>
                {canAdjustStock && <th className="py-3.5 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={canAdjustStock ? 8 : 7} className="py-12 text-center text-stone-400">
                    <Package className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
                    <p className="font-semibold text-stone-600">Tidak ada data stok ditemukan</p>
                    <p className="text-xs text-stone-400">Coba ubah opsi pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                filteredStock.map((s) => {
                  const isZero = s.jumlah === 0;
                  const isLow = s.jumlah <= s.stok_minimum;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-stone-50/70 transition ${
                        isZero
                          ? 'bg-red-50/30'
                          : isLow
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Cabang */}
                      <td className="py-3 px-4 font-bold text-xs text-stone-800">
                        {s.cabang?.kode} · {s.cabang?.nama}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono text-xs text-stone-500">
                        {s.produk?.sku}
                      </td>

                      {/* Nama Produk */}
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {s.produk?.nama}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4 text-xs capitalize text-stone-600">
                        {s.produk?.kategori}
                      </td>

                      {/* Stok Minimum */}
                      <td className="py-3 px-4 text-center font-mono text-stone-500 text-xs">
                        {s.stok_minimum}
                      </td>

                      {/* Stok Fisik */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-base text-stone-900">
                        {s.jumlah}
                      </td>

                      {/* Kondisi Badge */}
                      <td className="py-3 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Habis (0)
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aman
                          </span>
                        )}
                      </td>

                      {/* Tombol Aksi Penyesuaian Stok (US-07) */}
                      {canAdjustStock && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedStok(s)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Sesuaikan</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penyesuaian Stok */}
      {selectedStok && (
        <StokModal
          stokItem={selectedStok}
          onClose={() => setSelectedStok(null)}
        />
      )}
    </div>
  );
}
