'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Profile, Produk, RiwayatHargaModal } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { 
  Coffee, 
  Search, 
  Plus, 
  Edit3, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Layers,
  Lock,
  Package
} from 'lucide-react';
import ProdukModal from './ProdukModal';
import HargaModalModal from './HargaModalModal';
import Pagination from '@/components/ui/Pagination';

interface ProdukClientProps {
  profile: Profile;
  initialProducts: Produk[];
  latestModalMap: Record<string, number>;
  allModalHistory: RiwayatHargaModal[];
}

export default function ProdukClient({
  profile,
  initialProducts,
  latestModalMap,
  allModalHistory,
}: ProdukClientProps) {
  const isOwner = profile.peran === 'owner';

  // State Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'nonaktif'>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, statusFilter]);

  // State Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState<Produk | null>(null);
  const [selectedModalProduk, setSelectedModalProduk] = useState<Produk | null>(null);

  // Filter Data
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchSearch =
        searchQuery.trim().length === 0 ||
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === 'semua' || p.kategori === selectedCategory;

      let matchStatus = true;
      if (statusFilter === 'aktif') matchStatus = p.aktif === true;
      if (statusFilter === 'nonaktif') matchStatus = p.aktif === false;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [initialProducts, searchQuery, selectedCategory, statusFilter]);

  // Ambil riwayat modal untuk produk yang dipilih
  const activeProductModalHistory = useMemo(() => {
    if (!selectedModalProduk) return [];
    return allModalHistory.filter((m) => m.produk_id === selectedModalProduk.id);
  }, [selectedModalProduk, allModalHistory]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Coffee className="w-4 h-4" />
            Manajemen Katalog Produk & Modal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Katalog Produk
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Akses: <span className="font-semibold text-stone-800">{profile.nama_lengkap}</span> ({profile.peran})
            {!isOwner && ' · Harga modal dirahasiakan oleh RLS sistem'}
          </p>
        </div>

        {/* Tombol Tambah Produk (Khusus Owner) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-950/20 inline-flex items-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        )}
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

          {/* Filter Kategori */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Kategori</option>
            <option value="kopi">Kopi</option>
            <option value="non_kopi">Non Kopi</option>
            <option value="roti">Roti & Pastry</option>
            <option value="snack">Snack</option>
            <option value="kemasan">Kemasan / Biji Kopi</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Status Produk</option>
            <option value="aktif">Aktif (Dijual)</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Tabel Produk */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Daftar Produk Katalog
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
              {filteredProducts.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-500 font-bold text-[11px] uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Nama Produk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                {isOwner && (
                  <th className="py-3.5 px-4 text-right text-amber-900 bg-amber-50/60">
                    Harga Modal (Rahasia)
                  </th>
                )}
                <th className="py-3.5 px-4 text-center">Jenis Item</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {isOwner && <th className="py-3.5 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 8 : 6} className="py-12 text-center text-stone-400">
                    <Coffee className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
                    <p className="font-semibold text-stone-600">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-stone-400">Coba ubah opsi pencarian atau kategori.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((p) => {
                  const modalPrice = latestModalMap[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/70 transition">
                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-stone-700 text-xs">
                        {p.sku}
                      </td>

                      {/* Nama */}
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {p.nama}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4 text-xs capitalize text-stone-600">
                        {p.kategori.replace('_', ' ')}
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {formatRupiah(p.harga_jual)}
                      </td>

                      {/* Harga Modal (Khusus Owner - BR-11) */}
                      {isOwner && (
                        <td className="py-3 px-4 text-right bg-amber-50/30">
                          <button
                            type="button"
                            onClick={() => setSelectedModalProduk(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100/70 hover:bg-amber-200 text-amber-950 font-mono font-bold text-xs transition border border-amber-300"
                            title="Klik untuk melihat riwayat atau menetapkan harga modal baru"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                            <span>{modalPrice ? formatRupiah(modalPrice) : 'Set Modal'}</span>
                          </button>
                        </td>
                      )}

                      {/* Lacak Stok */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            p.lacak_stok
                              ? 'bg-stone-100 text-stone-700 border-stone-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {p.lacak_stok ? 'Fisik' : 'Racikan'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {p.aktif ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-stone-400 text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Aksi (Owner) */}
                      {isOwner && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setEditingProduk(p)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 text-xs font-semibold inline-flex items-center gap-1 transition shadow-2xs"
                            title="Ubah Produk"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Ubah</span>
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

        {/* Kontrol Pagination (Maks 20 data per slide) */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Tambah / Edit Produk */}
      {(isAddModalOpen || editingProduk) && (
        <ProdukModal
          produk={editingProduk}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProduk(null);
          }}
        />
      )}

      {/* Modal Riwayat Harga Modal */}
      {selectedModalProduk && (
        <HargaModalModal
          produk={selectedModalProduk}
          riwayatList={activeProductModalHistory}
          onClose={() => setSelectedModalProduk(null)}
        />
      )}
    </div>
  );
}
