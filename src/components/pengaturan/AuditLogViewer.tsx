'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { AuditLog } from '@/types/database';
import { formatDateWIB } from '@/lib/utils';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Eye, 
  X, 
  Ban, 
  ShieldCheck, 
  Sliders, 
  DollarSign, 
  Coffee, 
  UserCheck, 
  UserX 
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export default function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAksi, setSelectedAksi] = useState<string>('semua');
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAksi]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        searchQuery.trim().length === 0 ||
        log.pelaku?.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.pelaku?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.tabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAksi = selectedAksi === 'semua' || log.aksi === selectedAksi;

      return matchSearch && matchAksi;
    });
  }, [logs, searchQuery, selectedAksi]);

  // Badge Warna Aksi
  const getAksiBadge = (aksi: string) => {
    switch (aksi) {
      case 'void_transaksi':
        return { label: 'Void Transaksi', bg: 'bg-red-100 text-red-800 border-red-300' };
      case 'penyesuaian_stok':
        return { label: 'Penyesuaian Stok', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'verifikasi_shift':
        return { label: 'Verifikasi Shift', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'ubah_harga_jual':
        return { label: 'Ubah Harga Jual', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'ubah_harga_modal':
        return { label: 'Ubah Harga Modal', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'nonaktifkan_produk':
        return { label: 'Nonaktifkan Produk', bg: 'bg-stone-200 text-stone-800 border-stone-300' };
      case 'ubah_akun':
        return { label: 'Ubah Akun', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'nonaktifkan_akun':
        return { label: 'Nonaktifkan Akun', bg: 'bg-red-100 text-red-900 border-red-300' };
      default:
        return { label: aksi, bg: 'bg-stone-100 text-stone-800 border-stone-300' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelaku, email, atau tabel..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 transition"
          />
        </div>

        <select
          value={selectedAksi}
          onChange={(e) => setSelectedAksi(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 transition"
        >
          <option value="semua">Semua Tipe Aksi Sensitif</option>
          <option value="void_transaksi">Void Transaksi</option>
          <option value="penyesuaian_stok">Penyesuaian Stok</option>
          <option value="verifikasi_shift">Verifikasi Shift</option>
          <option value="ubah_harga_jual">Ubah Harga Jual</option>
          <option value="ubah_harga_modal">Ubah Harga Modal</option>
          <option value="nonaktifkan_produk">Nonaktifkan Produk</option>
          <option value="ubah_akun">Ubah Akun Staf</option>
          <option value="nonaktifkan_akun">Nonaktifkan Akun Staf</option>
        </select>
      </div>

      {/* Tabel Audit Log */}
      <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Pelaku</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Tabel</th>
                <th className="py-3 px-4">Nilai Perubahan</th>
                <th className="py-3 px-4 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    Tidak ada catatan audit log yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((log) => {
                  const aksiBadge = getAksiBadge(log.aksi);
                  return (
                    <tr key={log.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                        {formatDateWIB(log.dibuat_pada)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {log.pelaku?.nama_lengkap || 'System'}{' '}
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {log.pelaku?.email || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${aksiBadge.bg}`}
                        >
                          {aksiBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600 text-[11px]">
                        {log.tabel}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-stone-600 max-w-xs truncate">
                        {JSON.stringify(log.nilai_sesudah || log.nilai_sebelum)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectLog(log)}
                          className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-amber-800 transition"
                          title="Lihat Detail Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Detail JSON Viewer */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm">Detail Audit Log #{inspectLog.id}</h4>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-400 block font-medium">Pelaku:</span>
                  <span className="font-bold text-stone-800">{inspectLog.pelaku?.nama_lengkap || 'System'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Waktu WIB:</span>
                  <span className="font-mono text-stone-800">{formatDateWIB(inspectLog.dibuat_pada)}</span>
                </div>
              </div>

              {/* Nilai Sebelum */}
              <div className="space-y-1">
                <span className="font-bold text-stone-700 block">Nilai Sebelum (State Lama):</span>
                <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
                  {inspectLog.nilai_sebelum
                    ? JSON.stringify(inspectLog.nilai_sebelum, null, 2)
                    : '// Tidak ada nilai sebelum (data baru)'}
                </pre>
              </div>

              {/* Nilai Sesudah */}
              <div className="space-y-1">
                <span className="font-bold text-stone-700 block">Nilai Sesudah (State Baru):</span>
                <pre className="p-3 bg-stone-900 text-emerald-400 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(inspectLog.nilai_sesudah, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
