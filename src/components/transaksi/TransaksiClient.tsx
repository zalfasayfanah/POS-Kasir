'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Profile, Transaksi, Cabang } from '@/types/database';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { 
  Receipt, 
  Search, 
  Filter, 
  Ban, 
  Printer, 
  Clock, 
  AlertCircle, 
  Calendar,
  Building2,
  CheckCircle2,
  X
} from 'lucide-react';
import VoidModal from './VoidModal';
import ThermalReceipt from '@/components/pos/ThermalReceipt';
import Pagination from '@/components/ui/Pagination';

interface TransaksiClientProps {
  profile: Profile;
  initialTransactions: Transaksi[];
  branches: Cabang[];
}

export default function TransaksiClient({
  profile,
  initialTransactions,
  branches,
}: TransaksiClientProps) {
  // State Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'lunas' | 'void'>('semua');
  const [metodeFilter, setMetodeFilter] = useState<'semua' | 'tunai' | 'qris'>('semua');
  const [cabangFilter, setCabangFilter] = useState<string>('semua');
  const [dateFilter, setDateFilter] = useState<'semua' | 'hari_ini' | '7_hari'>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, metodeFilter, cabangFilter, dateFilter]);

  // State Modal
  const [selectedVoidTrx, setSelectedVoidTrx] = useState<Transaksi | null>(null);
  const [selectedReceiptTrx, setSelectedReceiptTrx] = useState<Transaksi | null>(null);

  // Wewenang Void: Hanya Kepala Toko dan Owner (TC-11 / BR-08)
  const canVoid = profile.peran === 'kepala_toko' || profile.peran === 'owner';

  // Filter Data Transaksi
  const filteredTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return initialTransactions.filter((trx) => {
      // 1. Search filter
      const matchSearch =
        searchQuery.trim().length === 0 ||
        trx.nomor_struk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.kasir?.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status filter
      const matchStatus = statusFilter === 'semua' || trx.status === statusFilter;

      // 3. Metode bayar filter
      const matchMetode = metodeFilter === 'semua' || trx.metode_bayar === metodeFilter;

      // 4. Cabang filter
      const matchCabang = cabangFilter === 'semua' || trx.cabang_id === cabangFilter;

      // 5. Date filter
      let matchDate = true;
      if (dateFilter === 'hari_ini') {
        const trxDate = new Date(trx.dibuat_pada).toISOString().split('T')[0];
        matchDate = trxDate === today;
      } else if (dateFilter === '7_hari') {
        matchDate = trx.dibuat_pada >= sevenDaysAgo;
      }

      return matchSearch && matchStatus && matchMetode && matchCabang && matchDate;
    });
  }, [initialTransactions, searchQuery, statusFilter, metodeFilter, cabangFilter, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            Riwayat Penjualan & Struk (US-03, US-06)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Daftar Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Akses: <span className="font-semibold text-stone-800">{profile.nama_lengkap}</span> ({profile.peran}) · {profile.cabang ? profile.cabang.nama : 'Semua Cabang'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor struk atau kasir..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white transition"
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Status (Lunas & Void)</option>
            <option value="lunas">Hanya Lunas</option>
            <option value="void">Hanya Void (Dibatalkan)</option>
          </select>

          {/* Filter Metode Bayar */}
          <select
            value={metodeFilter}
            onChange={(e) => setMetodeFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Metode Pembayaran</option>
            <option value="tunai">Tunai</option>
            <option value="qris">QRIS Manual</option>
          </select>

          {/* Filter Rentang Waktu */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          >
            <option value="semua">Semua Periode</option>
            <option value="hari_ini">Hari Ini (WIB)</option>
            <option value="7_hari">7 Hari Terakhir</option>
          </select>
        </div>

        {/* Filter Cabang (Khusus Owner jika ada banyak cabang) */}
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

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Daftar Riwayat Transaksi
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
              {filteredTransactions.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-500 font-bold text-[11px] uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">No. Struk</th>
                <th className="py-3.5 px-4">Waktu (WIB)</th>
                <th className="py-3.5 px-4">Cabang</th>
                <th className="py-3.5 px-4">Kasir</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <Receipt className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
                    <p className="font-semibold text-stone-600">Tidak ada transaksi ditemukan</p>
                    <p className="text-xs text-stone-400">Coba ubah opsi filter atau kata kunci pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((trx) => {
                  const isVoid = trx.status === 'void';
                  return (
                    <tr
                      key={trx.id}
                      className={`hover:bg-stone-50/70 transition ${
                        isVoid ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Nomor Struk & Info Meja */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-stone-900">{trx.nomor_struk}</div>
                        {(trx.nama_pelanggan || trx.nomor_meja || trx.sumber_pesanan === 'self_service') && (
                          <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                            {trx.nama_pelanggan && (
                              <span className="font-medium text-stone-700">{trx.nama_pelanggan}</span>
                            )}
                            {trx.nomor_meja && (
                              <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                                {trx.nomor_meja}
                              </span>
                            )}
                            {trx.sumber_pesanan === 'self_service' && (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-100/70 px-1 rounded uppercase tracking-wider">
                                Self-Service
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Waktu */}
                      <td className="py-3 px-4 text-stone-600 text-xs">
                        {formatDateWIB(trx.dibuat_pada)}
                      </td>

                      {/* Cabang */}
                      <td className="py-3 px-4 font-medium text-stone-800 text-xs">
                        {trx.cabang?.kode} · {trx.cabang?.nama}
                      </td>

                      {/* Kasir / Pemesan */}
                      <td className="py-3 px-4 text-stone-700 text-xs">
                        {trx.sumber_pesanan === 'self_service' ? (
                          <span className="text-amber-800 font-semibold italic">Pelanggan Meja</span>
                        ) : (
                          trx.kasir?.nama_lengkap || '-'
                        )}
                      </td>

                      {/* Metode */}
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          {trx.metode_bayar}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {formatRupiah(trx.total)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isVoid
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {trx.status}
                        </span>
                        {isVoid && trx.alasan_void && (
                          <p className="text-[10px] text-red-600 font-sans italic max-w-[150px] truncate mx-auto mt-0.5" title={trx.alasan_void}>
                            Alasan: {trx.alasan_void}
                          </p>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Lihat & Cetak Struk */}
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptTrx(trx)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                            title="Lihat & Cetak Struk Thermal"
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-600" />
                            <span className="hidden sm:inline">Struk</span>
                          </button>

                          {/* Tombol Void: HANYA untuk Kepala Toko & Owner (TC-11 / BR-08) */}
                          {canVoid && (
                            <button
                              type="button"
                              disabled={isVoid}
                              onClick={() => setSelectedVoidTrx(trx)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition shadow-2xs ${
                                isVoid
                                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                  : 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-800 border-red-200'
                              }`}
                              title={isVoid ? 'Transaksi sudah dibatalkan' : 'Batalkan Transaksi (Void)'}
                            >
                              <Ban className="w-3.5 h-3.5 text-red-600" />
                              <span className="hidden sm:inline">Void</span>
                            </button>
                          )}
                        </div>
                      </td>
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
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Void Transaksi */}
      {selectedVoidTrx && (
        <VoidModal
          transaksi={selectedVoidTrx}
          onClose={() => setSelectedVoidTrx(null)}
        />
      )}

      {/* Modal Struk Thermal 58mm */}
      {selectedReceiptTrx && (
        <ThermalReceipt
          transaksi={selectedReceiptTrx}
          onClose={() => setSelectedReceiptTrx(null)}
        />
      )}
    </div>
  );
}
