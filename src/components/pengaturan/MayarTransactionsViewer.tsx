'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { MayarInvoiceListItem } from '@/lib/mayar';
import { getMayarTransactionsHistoryAction } from '@/app/actions/mayar';
import { formatRupiah } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Receipt,
  User,
  ShieldCheck,
  Building2,
  AlertCircle,
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface MayarTransactionsViewerProps {
  initialTransactions: MayarInvoiceListItem[];
}

export default function MayarTransactionsViewer({
  initialTransactions,
}: MayarTransactionsViewerProps) {
  const [transactions, setTransactions] = useState<MayarInvoiceListItem[]>(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'closed' | 'unpaid'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const pageSize = 20;

  // Real-time Refresh dari Mayar API V2
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getMayarTransactionsHistoryAction();
      if (!res.success || !res.data) {
        toast.error(res.error || 'Gagal menyinkronkan transaksi dari Mayar.');
        return;
      }
      setTransactions(res.data);
      setCurrentPage(1);
      toast.success(`Berhasil menyinkronkan ${res.data.length} transaksi Mayar terkini.`);
    });
  };

  // Salin ID Invoice
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID Invoice Mayar berhasil disalin ke clipboard.');
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalPaidNominal = 0;
    let countPaid = 0;
    let countClosed = 0;
    let countUnpaid = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'paid') {
        countPaid += 1;
        totalPaidNominal += tx.amount || 0;
      } else if (tx.status === 'closed') {
        countClosed += 1;
      } else {
        countUnpaid += 1;
      }
    });

    return {
      total: transactions.length,
      totalPaidNominal,
      countPaid,
      countClosed,
      countUnpaid,
    };
  }, [transactions]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && tx.status !== 'paid') return false;
        if (statusFilter === 'closed' && tx.status !== 'closed') return false;
        if (statusFilter === 'unpaid' && tx.status !== 'unpaid') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = tx.id?.toLowerCase().includes(q);
        const descMatch = tx.description?.toLowerCase().includes(q);
        const nameMatch = tx.customer?.name?.toLowerCase().includes(q);
        const emailMatch = tx.customer?.email?.toLowerCase().includes(q);
        const strukMatch = tx.nomor_struk?.toLowerCase().includes(q);
        if (!idMatch && !descMatch && !nameMatch && !emailMatch && !strukMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  // Paginated List
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage]);

  // Format Waktu Tanggal
  const formatDateTime = (raw: number | string) => {
    if (!raw) return '-';
    const date = new Date(typeof raw === 'number' ? raw : raw);
    if (isNaN(date.getTime())) return String(raw);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  return (
    <div className="space-y-6">
      {/* Banner Khusus Owner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-900 text-white border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-emerald-300">
                Riwayat Transaksi Mayar API V2 Sandbox
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                Khusus Owner
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Mendeteksi seluruh pembuatan tagihan invoice, status pelunasan QRIS, dan sinkronisasi struk POS.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          <span>{isPending ? 'Menyinkronkan...' : 'Sinkronkan Mayar'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-stone-400" />
            Total Tagihan
          </span>
          <p className="text-2xl font-black text-stone-900 font-mono">{metrics.total}</p>
          <p className="text-[11px] text-stone-400">Invoice tercatat di Mayar</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Total Omzet Lunas
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {formatRupiah(metrics.totalPaidNominal)}
          </p>
          <p className="text-[11px] text-emerald-600">Volume terbayar sukses</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            Transaksi Lunas (Paid)
          </span>
          <p className="text-2xl font-black text-blue-800 font-mono">{metrics.countPaid}</p>
          <p className="text-[11px] text-blue-600">Terverifikasi Webhook / Polling</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-stone-400" />
            Ditutup / Expired
          </span>
          <p className="text-2xl font-black text-stone-700 font-mono">{metrics.countClosed}</p>
          <p className="text-[11px] text-stone-400">Tidak dilunasi / kedaluwarsa</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua ({metrics.total})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('paid');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lunas ({metrics.countPaid})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('closed');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'closed'
                ? 'bg-stone-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Ditutup / Expired ({metrics.countClosed})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('unpaid');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'unpaid'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu Bayar ({metrics.countUnpaid})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari ID invoice, pelanggan, struk..."
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tabel Riwayat Transaksi Mayar */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-stone-50/90 border-b border-stone-200 text-stone-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Waktu Dibuat</th>
                <th className="py-3 px-4">Invoice Mayar & Struk POS</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Deskripsi Tagihan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 stroke-1 text-stone-300" />
                    Tidak ada riwayat transaksi Mayar yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isPaid = tx.status === 'paid';
                  const isClosed = tx.status === 'closed';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-amber-50/30 transition-colors"
                    >
                      {/* Waktu Dibuat */}
                      <td className="py-3 px-4 text-stone-600 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>

                      {/* Invoice ID & Struk POS */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono text-stone-800 font-semibold text-[11px]"
                              title={tx.id}
                            >
                              {tx.id.slice(0, 8)}...{tx.id.slice(-4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyId(tx.id)}
                              className="text-stone-400 hover:text-stone-700 transition"
                              title="Salin ID Invoice Lengkap"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          {tx.nomor_struk ? (
                            <div className="flex items-center gap-1 text-[11px] text-amber-800 font-mono font-medium">
                              <Receipt className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{tx.nomor_struk}</span>
                              {tx.cabang_nama && (
                                <span className="text-stone-400">
                                  ({tx.cabang_nama})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">
                              Langsung dari Mayar Gateway
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pelanggan */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-stone-900 flex items-center gap-1">
                            <User className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{tx.customer?.name || 'Pelanggan POS'}</span>
                          </div>
                          {tx.customer?.email && (
                            <span className="text-[11px] text-stone-500 block">
                              {tx.customer.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deskripsi Tagihan */}
                      <td className="py-3 px-4 max-w-xs text-stone-700">
                        <span className="line-clamp-2 text-[11px]" title={tx.description}>
                          {tx.description}
                        </span>
                      </td>

                      {/* Nominal */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatRupiah(tx.amount || 0)}
                      </td>

                      {/* Status Pembayaran */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            LUNAS
                          </span>
                        ) : isClosed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                            <XCircle className="w-3 h-3" />
                            DITUTUP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3" />
                            MENUNGGU
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination (Max 20 data per slide) */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
