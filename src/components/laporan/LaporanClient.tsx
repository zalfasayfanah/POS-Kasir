'use client';

import React, { useState, useMemo } from 'react';
import { formatRupiah } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Ban,
  ShieldCheck,
  Calendar,
  Building2,
  Filter,
  CreditCard,
  Banknote,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  Download,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BranchOption {
  id: string;
  nama: string;
  kode: string;
}

export interface TransaksiItemData {
  id: string;
  produk_id: string;
  nama_produk: string;
  harga_satuan: number;
  jumlah: number;
  subtotal: number;
}

export interface TransaksiData {
  id: string;
  nomor_struk: string;
  total: number;
  status: 'lunas' | 'void' | 'menunggu_bayar';
  metode_bayar: 'tunai' | 'qris';
  dibuat_pada: string;
  cabang_id: string;
  cabang?: {
    id: string;
    nama: string;
  };
  items?: TransaksiItemData[];
}

export interface ShiftData {
  id: string;
  cabang_id: string;
  cabang?: { nama: string };
  kasir_id: string;
  kasir?: { nama_lengkap: string };
  status: string;
  dibuka_pada: string;
  ditutup_pada: string | null;
  kas_awal: number;
  total_tunai: number;
  total_qris: number;
  kas_seharusnya: number;
  uang_fisik: number | null;
  selisih: number | null;
  catatan_tutup: string | null;
  catatan_verifikasi: string | null;
}

export interface OwnerProfitMetric {
  trxId: string;
  hpp: number;
  grossProfit: number;
}

interface LaporanClientProps {
  isOwner: boolean;
  userCabangId: string | null;
  cabangList: BranchOption[];
  transaksiList: TransaksiData[];
  shiftList: ShiftData[];
  // Owner only profit mapping: Map of trxId -> { hpp, grossProfit }
  // Guaranteed not to exist for non-owner
  ownerProfitMap?: Record<string, { hpp: number; grossProfit: number }>;
}

export default function LaporanClient({
  isOwner,
  userCabangId,
  cabangList,
  transaksiList,
  shiftList,
  ownerProfitMap = {},
}: LaporanClientProps) {
  // Preset filter dates
  // Default: 'all' or 'month' (Oktober 2026 data seeded)
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isOwner ? 'all' : userCabangId || 'all'
  );

  // Date filters (Format YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Handle Preset Changes
  const applyPreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    setDatePreset(preset);
    const now = new Date();
    // Use WIB timezone (+7) or local
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(now));
    } else if (preset === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(now));
    }
  };

  // Filtered Transactions
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter((trx) => {
      // Branch filter
      if (selectedBranch !== 'all' && trx.cabang_id !== selectedBranch) {
        return false;
      }
      // Date filter (convert created_at to YYYY-MM-DD in WIB/local)
      if (startDate || endDate) {
        const trxDate = trx.dibuat_pada.split('T')[0];
        if (startDate && trxDate < startDate) return false;
        if (endDate && trxDate > endDate) return false;
      }
      return true;
    });
  }, [transaksiList, selectedBranch, startDate, endDate]);

  // Filtered Shifts
  const filteredShifts = useMemo(() => {
    return shiftList.filter((shift) => {
      if (selectedBranch !== 'all' && shift.cabang_id !== selectedBranch) {
        return false;
      }
      if (startDate || endDate) {
        const shiftDate = shift.dibuka_pada.split('T')[0];
        if (startDate && shiftDate < startDate) return false;
        if (endDate && shiftDate > endDate) return false;
      }
      return true;
    });
  }, [shiftList, selectedBranch, startDate, endDate]);

  // Summary Metrics
  const lunasTrx = useMemo(() => {
    return filteredTransaksi.filter((t) => t.status === 'lunas');
  }, [filteredTransaksi]);

  const voidTrx = useMemo(() => {
    return filteredTransaksi.filter((t) => t.status === 'void');
  }, [filteredTransaksi]);

  const totalOmzet = useMemo(() => {
    return lunasTrx.reduce((sum, t) => sum + (t.total || 0), 0);
  }, [lunasTrx]);

  const countLunas = lunasTrx.length;
  const countVoid = voidTrx.length;
  const avgOrderValue = countLunas > 0 ? Math.round(totalOmzet / countLunas) : 0;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let tunaiNominal = 0;
    let tunaiCount = 0;
    let qrisNominal = 0;
    let qrisCount = 0;

    lunasTrx.forEach((trx) => {
      if (trx.metode_bayar === 'tunai') {
        tunaiNominal += trx.total || 0;
        tunaiCount += 1;
      } else {
        qrisNominal += trx.total || 0;
        qrisCount += 1;
      }
    });

    const totalNominal = tunaiNominal + qrisNominal;
    const tunaiPercent = totalNominal > 0 ? Math.round((tunaiNominal / totalNominal) * 100) : 0;
    const qrisPercent = totalNominal > 0 ? 100 - tunaiPercent : 0;

    return {
      tunaiNominal,
      tunaiCount,
      tunaiPercent,
      qrisNominal,
      qrisCount,
      qrisPercent,
      totalNominal,
    };
  }, [lunasTrx]);

  // Top 10 Best Selling Products
  const top10Products = useMemo(() => {
    const productStats: Record<
      string,
      { nama: string; qty: number; omzet: number }
    > = {};

    lunasTrx.forEach((trx) => {
      if (trx.items && Array.isArray(trx.items)) {
        trx.items.forEach((item) => {
          if (!productStats[item.produk_id]) {
            productStats[item.produk_id] = {
              nama: item.nama_produk || 'Produk',
              qty: 0,
              omzet: 0,
            };
          }
          productStats[item.produk_id].qty += item.jumlah || 0;
          productStats[item.produk_id].omzet += item.subtotal || 0;
        });
      }
    });

    const sorted = Object.values(productStats).sort((a, b) => b.qty - a.qty);
    return sorted.slice(0, 10);
  }, [lunasTrx]);

  const maxProductQty = useMemo(() => {
    if (top10Products.length === 0) return 1;
    return Math.max(...top10Products.map((p) => p.qty), 1);
  }, [top10Products]);

  // Daily Sales by Branch
  const dailySalesData = useMemo(() => {
    // Map dates to branch sales: Record<date, Record<branchName, total>>
    const dateMap: Record<string, Record<string, number>> = {};
    const branchNamesSet = new Set<string>();

    lunasTrx.forEach((trx) => {
      const dateKey = trx.dibuat_pada.split('T')[0];
      const branchName = trx.cabang?.nama || 'Cabang';
      branchNamesSet.add(branchName);

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {};
      }
      dateMap[dateKey][branchName] = (dateMap[dateKey][branchName] || 0) + (trx.total || 0);
    });

    const sortedDates = Object.keys(dateMap).sort();
    const branchNames = Array.from(branchNamesSet);

    // Calculate max total per day for scaling
    let maxDayTotal = 0;
    const days = sortedDates.map((d) => {
      const branches = dateMap[d];
      let dayTotal = 0;
      branchNames.forEach((b) => {
        dayTotal += branches[b] || 0;
      });
      if (dayTotal > maxDayTotal) maxDayTotal = dayTotal;
      return {
        date: d,
        branches,
        dayTotal,
      };
    });

    return {
      days,
      branchNames,
      maxDayTotal: maxDayTotal || 1,
    };
  }, [lunasTrx]);

  // Branch Color Mapping
  const branchColors: Record<string, { bg: string; fill: string; border: string }> = {
    'Lumbung Tebet': { bg: 'bg-amber-600', fill: '#d97706', border: 'border-amber-700' },
    'Lumbung Depok': { bg: 'bg-emerald-600', fill: '#059669', border: 'border-emerald-700' },
    'Lumbung Bintaro': { bg: 'bg-blue-600', fill: '#2563eb', border: 'border-blue-700' },
  };

  // Owner Exclusive Metrics (Confidential BR-11)
  const ownerMetrics = useMemo(() => {
    if (!isOwner) return null;

    let totalHPP = 0;
    let totalGrossProfit = 0;

    // Daily profit breakdown: Record<date, { omzet: number; hpp: number; profit: number }>
    const dailyProfitMap: Record<string, { omzet: number; hpp: number; profit: number }> = {};

    lunasTrx.forEach((trx) => {
      const costInfo = ownerProfitMap[trx.id];
      const trxHpp = costInfo?.hpp || 0;
      const trxProfit = (trx.total || 0) - trxHpp;

      totalHPP += trxHpp;
      totalGrossProfit += trxProfit;

      const dateKey = trx.dibuat_pada.split('T')[0];
      if (!dailyProfitMap[dateKey]) {
        dailyProfitMap[dateKey] = { omzet: 0, hpp: 0, profit: 0 };
      }
      dailyProfitMap[dateKey].omzet += trx.total || 0;
      dailyProfitMap[dateKey].hpp += trxHpp;
      dailyProfitMap[dateKey].profit += trxProfit;
    });

    const marginLaba = totalOmzet > 0 ? Math.round((totalGrossProfit / totalOmzet) * 100) : 0;

    const sortedProfitDates = Object.keys(dailyProfitMap).sort();
    let maxProfitDay = 0;
    const dailyTrend = sortedProfitDates.map((date) => {
      const data = dailyProfitMap[date];
      if (data.omzet > maxProfitDay) maxProfitDay = data.omzet;
      return {
        date,
        ...data,
      };
    });

    return {
      totalHPP,
      totalGrossProfit,
      marginLaba,
      dailyTrend,
      maxProfitDay: maxProfitDay || 1,
    };
  }, [isOwner, lunasTrx, ownerProfitMap, totalOmzet]);

  // Ekspor CSV Rekap Penjualan (Fase 8)
  const exportTransaksiCsv = () => {
    if (filteredTransaksi.length === 0) {
      toast.error('Tidak ada data transaksi yang sesuai filter untuk diekspor.');
      return;
    }

    const headers = [
      'Nomor Struk',
      'Waktu Transaksi (WIB)',
      'Cabang',
      'Status',
      'Metode Bayar',
      'Total (Rp)',
      'Jumlah Item',
      'Rincian Produk',
    ];

    const rows = filteredTransaksi.map((t) => {
      const itemsStr = (t.items || [])
        .map((it) => `${it.nama_produk} (x${it.jumlah})`)
        .join('; ');

      return [
        `"${t.nomor_struk}"`,
        `"${new Date(t.dibuat_pada).toLocaleString('id-ID')}"`,
        `"${t.cabang?.nama || '-'}"`,
        `"${t.status.toUpperCase()}"`,
        `"${t.metode_bayar.toUpperCase()}"`,
        t.total,
        t.items?.reduce((s, it) => s + it.jumlah, 0) || 0,
        `"${itemsStr.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap-penjualan-pos-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Berhasil mengunduh ${filteredTransaksi.length} data transaksi ke CSV!`);
  };

  // Ekspor CSV Rekap Shift Kasir (Fase 8)
  const exportShiftCsv = () => {
    if (filteredShifts.length === 0) {
      toast.error('Tidak ada data shift yang sesuai filter untuk diekspor.');
      return;
    }

    const headers = [
      'ID Shift',
      'Cabang',
      'Petugas Kasir',
      'Waktu Buka (WIB)',
      'Waktu Tutup (WIB)',
      'Status',
      'Kas Awal (Rp)',
      'Total Tunai (Rp)',
      'Total QRIS (Rp)',
      'Kas Seharusnya (Rp)',
      'Uang Fisik Laci (Rp)',
      'Selisih (Rp)',
      'Catatan Kasir',
      'Catatan Verifikasi',
    ];

    const rows = filteredShifts.map((s) => [
      `"${s.id}"`,
      `"${s.cabang?.nama || '-'}"`,
      `"${s.kasir?.nama_lengkap || '-'}"`,
      `"${new Date(s.dibuka_pada).toLocaleString('id-ID')}"`,
      `"${s.ditutup_pada ? new Date(s.ditutup_pada).toLocaleString('id-ID') : '-'}"`,
      `"${s.status.toUpperCase()}"`,
      s.kas_awal,
      s.total_tunai,
      s.total_qris,
      s.kas_seharusnya,
      s.uang_fisik ?? '-',
      s.selisih ?? '-',
      `"${(s.catatan_tutup || '').replace(/"/g, '""')}"`,
      `"${(s.catatan_verifikasi || '').replace(/"/g, '""')}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap-shift-kasir-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Berhasil mengunduh ${filteredShifts.length} data shift ke CSV!`);
  };

  // Cetak atau Simpan sebagai PDF (Fase 8)
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              Dashboard Analitik & Laporan Penjualan (US-09)
            </div>
            <h1 className="text-2xl font-bold text-stone-900">
              Laporan Kinerja Transaksi
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Analisis performa omzet, volume produk terlaris, donat metode bayar, serta rekap shift kasir.
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                datePreset === 'all'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                datePreset === 'today'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                datePreset === '7days'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset('30days')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                datePreset === '30days'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>

        {/* Detailed Controls: Date Inputs & Branch Selector */}
        <div className="pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              Dari Tanggal (WIB)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Tanggal Selesai */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              Sampai Tanggal (WIB)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Filter Cabang */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              Filter Cabang
            </label>
            {isOwner ? (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-stone-800"
              >
                <option value="all">Semua Cabang (Konsolidasi Multi-Cabang)</option>
                {cabangList.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.nama} ({cb.kode})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full text-xs px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-600 font-semibold flex items-center justify-between">
                <span>
                  {cabangList.find((cb) => cb.id === userCabangId)?.nama || 'Cabang Anda'}
                </span>
                <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                  Terkunci (Kepala Toko)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tombol Ekspor Laporan (Fase 8: CSV & PDF) */}
        <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <Download className="w-4 h-4 text-amber-700" />
            <span>Ekspor Data (Fase 8 - Nilai Tambah):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportTransaksiCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Unduh seluruh transaksi hasil filter ke format file CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ekspor CSV Penjualan ({filteredTransaksi.length})</span>
            </button>

            <button
              type="button"
              onClick={exportShiftCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Unduh seluruh data shift hasil filter ke format file CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span>Ekspor CSV Rekap Shift ({filteredShifts.length})</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Cetak tampilan dashboard laporan atau simpan sebagai dokumen PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak / Ekspor PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kartu Metrik Ringkasan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omzet Total */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Omzet Total Lunas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatRupiah(totalOmzet)}
          </p>
          <div className="mt-2 flex items-center text-xs text-stone-500">
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded mr-1.5">
              {countLunas} transaksi
            </span>
            <span>berstatus lunas</span>
          </div>
        </div>

        {/* Nilai Rata-rata Transaksi (AOV) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Rata-Rata Transaksi (AOV)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatRupiah(avgOrderValue)}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Rata-rata belanja per struk pembeli
          </p>
        </div>

        {/* Jumlah Transaksi Lunas */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Jumlah Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {countLunas}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Total struk penjualan yang berhasil
          </p>
        </div>

        {/* Total Void */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Transaksi Void</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {countVoid}
          </p>
          <div className="mt-2 flex items-center text-xs text-stone-500">
            <span className="text-red-700 font-semibold bg-red-50 px-1.5 py-0.5 rounded mr-1.5">
              {filteredTransaksi.length > 0
                ? `${Math.round((countVoid / filteredTransaksi.length) * 100)}%`
                : '0%'}
            </span>
            <span>rasio pembatalan</span>
          </div>
        </div>
      </div>

      {/* SEKSI KHUSUS OWNER: LABA KOTOR & TREN LABA HARIAN (BR-11 CONFIDENTIAL) */}
      {isOwner && ownerMetrics && (
        <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-amber-600/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  Laporan Laba Kotor & HPP Konsolidasi (BR-11)
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    Owner Exclusive
                  </span>
                </h2>
                <p className="text-xs text-stone-400">
                  Dihitung historis berdasarkan riwayat harga modal saat transaksi berlangsung.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-stone-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              🔒 Terisolasi di Server Component · Tidak pernah dikirim ke Kepala Toko
            </div>
          </div>

          {/* Kartu Metrik Laba Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                <span>Total HPP (Modal)</span>
                <Layers className="w-4 h-4 text-stone-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-white">
                {formatRupiah(ownerMetrics.totalHPP)}
              </p>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Total beban pokok modal barang terjual
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-amber-500/30 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
                <span>Total Laba Kotor</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
                {formatRupiah(ownerMetrics.totalGrossProfit)}
              </p>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Omzet ({formatRupiah(totalOmzet)}) dikurangi HPP
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-emerald-500/30 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
                <span>Margin Keuntungan</span>
                <Percent className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {ownerMetrics.marginLaba}%
              </p>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Persentase laba kotor terhadap omzet
              </span>
            </div>
          </div>

          {/* Grafik Garis Tren Laba Harian */}
          <div className="bg-black/30 p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Grafik Tren Omzet, HPP, dan Laba Kotor Harian
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-amber-500" />
                  <span className="text-stone-300 text-[11px]">Omzet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-stone-500" />
                  <span className="text-stone-300 text-[11px]">HPP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-emerald-500" />
                  <span className="text-stone-300 text-[11px]">Laba Kotor</span>
                </div>
              </div>
            </div>

            {ownerMetrics.dailyTrend.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-xs">
                Tidak ada data transaksi lunas pada filter tanggal ini.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {ownerMetrics.dailyTrend.map((day) => {
                  const omzetPct = (day.omzet / ownerMetrics.maxProfitDay) * 100;
                  const hppPct = (day.hpp / ownerMetrics.maxProfitDay) * 100;
                  const profitPct = (day.profit / ownerMetrics.maxProfitDay) * 100;

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-stone-300 text-[11px]">
                          {day.date}
                        </span>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-amber-400">{formatRupiah(day.omzet)}</span>
                          <span className="text-stone-400">HPP: {formatRupiah(day.hpp)}</span>
                          <span className="text-emerald-400 font-bold">
                            Laba: {formatRupiah(day.profit)}
                          </span>
                        </div>
                      </div>
                      {/* Comparison bars */}
                      <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${profitPct}%` }}
                          title={`Laba: ${formatRupiah(day.profit)}`}
                        />
                        <div
                          className="bg-stone-500 h-full"
                          style={{ width: `${hppPct}%` }}
                          title={`HPP: ${formatRupiah(day.hpp)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid Grafik: Penjualan Harian per Cabang & Donat Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Batang Penjualan Harian per Cabang (Col span 2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Grafik Penjualan Harian per Cabang
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Akumulasi omzet transaksi lunas tiap tanggal menurut cabang
              </p>
            </div>
            {/* Legend Cabang */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {dailySalesData.branchNames.map((bName) => (
                <div key={bName} className="flex items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded-xs ${
                      branchColors[bName]?.bg || 'bg-stone-600'
                    }`}
                  />
                  <span className="text-stone-700 text-[11px] font-medium">{bName}</span>
                </div>
              ))}
            </div>
          </div>

          {dailySalesData.days.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
              <BarChart3 className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
              Tidak ada data penjualan untuk filter rentang waktu ini.
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              {dailySalesData.days.map((day) => {
                const dayPct = Math.round((day.dayTotal / dailySalesData.maxDayTotal) * 100);

                return (
                  <div key={day.date} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-stone-700 font-semibold">
                        {day.date}
                      </span>
                      <span className="font-mono text-stone-900 font-bold">
                        {formatRupiah(day.dayTotal)}
                      </span>
                    </div>

                    {/* Stacked / Proportion bar */}
                    <div className="h-4 w-full bg-stone-100 rounded-md overflow-hidden flex shadow-inner">
                      {dailySalesData.branchNames.map((bName) => {
                        const amount = day.branches[bName] || 0;
                        if (amount === 0) return null;
                        const barPct = (amount / dailySalesData.maxDayTotal) * 100;
                        const colorClass = branchColors[bName]?.bg || 'bg-stone-500';

                        return (
                          <div
                            key={bName}
                            style={{ width: `${barPct}%` }}
                            className={`${colorClass} h-full transition-all relative group hover:opacity-90`}
                            title={`${bName}: ${formatRupiah(amount)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grafik Donat Komposisi Metode Pembayaran (Col span 1) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              Metode Pembayaran
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Komposisi penjualan Tunai vs QRIS
            </p>
          </div>

          {/* SVG Donut Visualizer */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-stone-100 fill-none"
                  strokeWidth="14"
                />
                {/* Tunai arc (Emerald) */}
                {paymentBreakdown.tunaiPercent > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-emerald-500 fill-none transition-all duration-500"
                    strokeWidth="14"
                    strokeDasharray={`${(paymentBreakdown.tunaiPercent * 238.76) / 100} 238.76`}
                    strokeDashoffset="0"
                  />
                )}
                {/* QRIS arc (Blue) */}
                {paymentBreakdown.qrisPercent > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-blue-500 fill-none transition-all duration-500"
                    strokeWidth="14"
                    strokeDasharray={`${(paymentBreakdown.qrisPercent * 238.76) / 100} 238.76`}
                    strokeDashoffset={`-${(paymentBreakdown.tunaiPercent * 238.76) / 100}`}
                  />
                )}
              </svg>

              {/* Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Total Transaksi
                </span>
                <span className="text-2xl font-bold font-mono text-stone-900">
                  {countLunas}
                </span>
                <span className="text-[10px] text-stone-500">Struk Lunas</span>
              </div>
            </div>
          </div>

          {/* Breakdown Legend Cards */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Tunai</span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {paymentBreakdown.tunaiCount} Transaksi ({paymentBreakdown.tunaiPercent}%)
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-800">
                {formatRupiah(paymentBreakdown.tunaiNominal)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 block">QRIS</span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {paymentBreakdown.qrisCount} Transaksi ({paymentBreakdown.qrisPercent}%)
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-blue-800">
                {formatRupiah(paymentBreakdown.qrisNominal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 10 Produk Terlaris (Quantity terjual & kontribusi omzet) */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              10 Produk Terlaris (Best Seller)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Peringkat menu paling diminati berdasarkan kuantitas unit terjual
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded">
            Top 10 Menu
          </span>
        </div>

        {top10Products.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-xs">
            Belum ada data produk terjual pada filter yang dipilih.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {top10Products.map((prod, idx) => {
              const widthPct = Math.round((prod.qty / maxProductQty) * 100);

              return (
                <div key={prod.nama} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : idx === 1
                            ? 'bg-stone-200 text-stone-800 font-bold'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-800 font-bold'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-stone-800">{prod.nama}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="font-bold text-stone-900">{prod.qty} item</span>
                      <span className="text-stone-500">{formatRupiah(prod.omzet)}</span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idx === 0
                          ? 'bg-amber-500'
                          : idx === 1
                          ? 'bg-amber-600/80'
                          : 'bg-amber-700/60'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabel Rekap Selisih Kas per Shift (Highlight badge selisih > Rp 20.000) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Tabel Rekap Selisih Kas per Shift
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Rekapitulasi pembukaan kas, penjualan tunai/QRIS, uang fisik saat tutup kasir, dan status verifikasi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              Highlight: |Selisih| &gt; Rp 20.000 (BR-09)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Waktu Buka / Tutup</th>
                <th className="px-4 py-3">Cabang & Kasir</th>
                <th className="px-4 py-3 text-right">Kas Awal</th>
                <th className="px-4 py-3 text-right">Total Tunai</th>
                <th className="px-4 py-3 text-right">Kas Seharusnya</th>
                <th className="px-4 py-3 text-right">Uang Fisik</th>
                <th className="px-4 py-3 text-right">Selisih</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                    Tidak ada rekaman shift untuk periode dan cabang ini.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const selisihNominal = shift.selisih ?? 0;
                  const isMajorDifference = Math.abs(selisihNominal) > 20000;

                  return (
                    <tr
                      key={shift.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        isMajorDifference ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* Waktu */}
                      <td className="px-4 py-3 text-stone-700">
                        <div className="font-mono text-stone-900">
                          {shift.dibuka_pada ? shift.dibuka_pada.replace('T', ' ').slice(0, 16) : '-'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Tutup: {shift.ditutup_pada ? shift.ditutup_pada.replace('T', ' ').slice(11, 16) : 'Aktif'}
                        </div>
                      </td>

                      {/* Cabang & Kasir */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">
                          {shift.cabang?.nama || 'Cabang'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {shift.kasir?.nama_lengkap || 'Kasir'}
                        </div>
                      </td>

                      {/* Kas Awal */}
                      <td className="px-4 py-3 text-right font-mono text-stone-700">
                        {formatRupiah(shift.kas_awal)}
                      </td>

                      {/* Total Tunai */}
                      <td className="px-4 py-3 text-right font-mono text-stone-700">
                        {formatRupiah(shift.total_tunai)}
                      </td>

                      {/* Kas Seharusnya */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-stone-900">
                        {formatRupiah(shift.kas_seharusnya)}
                      </td>

                      {/* Uang Fisik */}
                      <td className="px-4 py-3 text-right font-mono text-stone-800">
                        {shift.uang_fisik !== null ? formatRupiah(shift.uang_fisik) : '-'}
                      </td>

                      {/* Selisih */}
                      <td className="px-4 py-3 text-right font-mono">
                        {shift.selisih === null ? (
                          <span className="text-stone-400">-</span>
                        ) : isMajorDifference ? (
                          <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            {formatRupiah(shift.selisih)}
                          </span>
                        ) : shift.selisih === 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Rp 0
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                            {formatRupiah(shift.selisih)}
                          </span>
                        )}
                        {shift.catatan_tutup && (
                          <div className="text-[10px] text-stone-500 mt-1 italic max-w-xs ml-auto text-right">
                            "{shift.catatan_tutup}"
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            shift.status === 'diverifikasi'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : shift.status === 'ditutup'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
