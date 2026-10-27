'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  FileSpreadsheet,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import Pagination from '@/components/ui/Pagination';

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
  const [shiftPage, setShiftPage] = useState(1);
  const shiftPageSize = 20;
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // Dedicated Calendar Date Filter for Grafik Tren Omzet, Laba Kotor, dan HPP
  const [chartStartDate, setChartStartDate] = useState<string>('');
  const [chartEndDate, setChartEndDate] = useState<string>('');

  // Handle Calendar Presets for Owner Chart
  const applyChartPreset = (preset: 'all' | 'this_month' | 'last_month' | '30days') => {
    const now = new Date();
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setChartStartDate('');
      setChartEndDate('');
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setChartStartDate(formatLocalDate(start));
      setChartEndDate(formatLocalDate(end));
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setChartStartDate(formatLocalDate(start));
      setChartEndDate(formatLocalDate(end));
    } else if (preset === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setChartStartDate(formatLocalDate(start));
      setChartEndDate(formatLocalDate(now));
    }
  };

  // Dedicated Calendar Date Filter for Grafik Penjualan Harian per Cabang
  const [branchChartStartDate, setBranchChartStartDate] = useState<string>('');
  const [branchChartEndDate, setBranchChartEndDate] = useState<string>('');
  const [hoveredBranchDayIdx, setHoveredBranchDayIdx] = useState<number | null>(null);

  // Handle Calendar Presets for Branch Sales Chart
  const applyBranchChartPreset = (preset: 'all' | 'this_month' | 'last_month' | '30days' | '7days') => {
    const now = new Date();
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setBranchChartStartDate('');
      setBranchChartEndDate('');
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setBranchChartStartDate(formatLocalDate(start));
      setBranchChartEndDate(formatLocalDate(end));
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setBranchChartStartDate(formatLocalDate(start));
      setBranchChartEndDate(formatLocalDate(end));
    } else if (preset === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      setBranchChartStartDate(formatLocalDate(start));
      setBranchChartEndDate(formatLocalDate(now));
    } else if (preset === '7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      setBranchChartStartDate(formatLocalDate(start));
      setBranchChartEndDate(formatLocalDate(now));
    }
  };

  // Reset shift page when filters change
  useEffect(() => {
    setShiftPage(1);
  }, [selectedBranch, startDate, endDate]);

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

  // Short currency formatter for Y-axis chart ticks
  const formatShortRupiah = (val: number) => {
    if (val === 0) return 'Rp 0';
    if (val >= 1000000000) {
      return `Rp ${(val / 1000000000).toFixed(1).replace(/\.0$/, '')} M`;
    }
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(1).replace(/\.0$/, '')} jt`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)} rb`;
    }
    return `Rp ${val}`;
  };

  // Filtered transactions for Branch Sales Grouped Chart
  const branchSalesLunasTrx = useMemo(() => {
    const hasCustomDate = Boolean(branchChartStartDate || branchChartEndDate);
    if (!hasCustomDate) {
      return lunasTrx;
    }
    return transaksiList.filter((trx) => {
      if (trx.status !== 'lunas') return false;
      if (selectedBranch !== 'all' && trx.cabang_id !== selectedBranch) return false;
      const trxDate = trx.dibuat_pada.split('T')[0];
      if (branchChartStartDate && trxDate < branchChartStartDate) return false;
      if (branchChartEndDate && trxDate > branchChartEndDate) return false;
      return true;
    });
  }, [branchChartStartDate, branchChartEndDate, lunasTrx, transaksiList, selectedBranch]);

  // Grouped Daily Sales Data by Branch
  const branchDailySalesData = useMemo(() => {
    // Map dates to branch sales: Record<date, Record<branchName, total>>
    const dateMap: Record<string, Record<string, number>> = {};
    const branchNamesSet = new Set<string>();

    if (selectedBranch !== 'all') {
      const found = cabangList.find((c) => c.id === selectedBranch);
      if (found) {
        branchNamesSet.add(found.nama);
      }
    } else {
      if (cabangList && cabangList.length > 0) {
        cabangList.forEach((c) => branchNamesSet.add(c.nama));
      }
    }

    branchSalesLunasTrx.forEach((trx) => {
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

    let maxBranchVal = 0;
    let totalAllOmzet = 0;

    const days = sortedDates.map((date) => {
      const branches = dateMap[date] || {};
      let dayTotal = 0;
      branchNames.forEach((b) => {
        const val = branches[b] || 0;
        dayTotal += val;
        if (val > maxBranchVal) maxBranchVal = val;
      });
      totalAllOmzet += dayTotal;
      return {
        date,
        branches,
        dayTotal,
      };
    });

    // Calculate nice Y-axis max with 15% headroom
    const target = maxBranchVal > 0 ? maxBranchVal * 1.15 : 1000000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
    const normalized = target / magnitude;
    let niceNorm = 10;
    if (normalized <= 1) niceNorm = 1;
    else if (normalized <= 2) niceNorm = 2;
    else if (normalized <= 2.5) niceNorm = 2.5;
    else if (normalized <= 5) niceNorm = 5;
    else niceNorm = 10;
    const yAxisMax = niceNorm * magnitude;

    return {
      days,
      branchNames,
      maxBranchVal,
      yAxisMax,
      totalAllOmzet,
    };
  }, [branchSalesLunasTrx, selectedBranch, cabangList]);

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
      const profitPct = data.omzet > 0 ? (data.profit / data.omzet) * 100 : 0;
      const hppPct = data.omzet > 0 ? (data.hpp / data.omzet) * 100 : 0;
      return {
        date,
        ...data,
        profitPct,
        hppPct,
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

  // Filtered transactions specifically for the Owner Trend Chart
  const chartLunasTrx = useMemo(() => {
    const hasCustomChartDate = Boolean(chartStartDate || chartEndDate);
    if (!hasCustomChartDate) {
      return lunasTrx;
    }
    return transaksiList.filter((trx) => {
      if (trx.status !== 'lunas') return false;
      if (selectedBranch !== 'all' && trx.cabang_id !== selectedBranch) return false;
      const trxDate = trx.dibuat_pada.split('T')[0];
      if (chartStartDate && trxDate < chartStartDate) return false;
      if (chartEndDate && trxDate > chartEndDate) return false;
      return true;
    });
  }, [chartStartDate, chartEndDate, lunasTrx, transaksiList, selectedBranch]);

  // Chart Exclusive Metrics & Daily Trend
  const chartMetrics = useMemo(() => {
    if (!isOwner) return null;

    let chartTotalOmzet = 0;
    let chartTotalHPP = 0;
    let chartTotalGrossProfit = 0;

    const dailyProfitMap: Record<string, { omzet: number; hpp: number; profit: number }> = {};

    chartLunasTrx.forEach((trx) => {
      const costInfo = ownerProfitMap[trx.id];
      const trxHpp = costInfo?.hpp || 0;
      const trxProfit = (trx.total || 0) - trxHpp;

      chartTotalOmzet += trx.total || 0;
      chartTotalHPP += trxHpp;
      chartTotalGrossProfit += trxProfit;

      const dateKey = trx.dibuat_pada.split('T')[0];
      if (!dailyProfitMap[dateKey]) {
        dailyProfitMap[dateKey] = { omzet: 0, hpp: 0, profit: 0 };
      }
      dailyProfitMap[dateKey].omzet += trx.total || 0;
      dailyProfitMap[dateKey].hpp += trxHpp;
      dailyProfitMap[dateKey].profit += trxProfit;
    });

    const marginLaba =
      chartTotalOmzet > 0 ? Math.round((chartTotalGrossProfit / chartTotalOmzet) * 100) : 0;

    const sortedProfitDates = Object.keys(dailyProfitMap).sort();
    let maxProfitDay = 0;
    const dailyTrend = sortedProfitDates.map((date) => {
      const data = dailyProfitMap[date];
      if (data.omzet > maxProfitDay) maxProfitDay = data.omzet;
      const profitPct = data.omzet > 0 ? (data.profit / data.omzet) * 100 : 0;
      const hppPct = data.omzet > 0 ? (data.hpp / data.omzet) * 100 : 0;
      return {
        date,
        ...data,
        profitPct,
        hppPct,
      };
    });

    return {
      totalOmzet: chartTotalOmzet,
      totalHPP: chartTotalHPP,
      totalGrossProfit: chartTotalGrossProfit,
      marginLaba,
      dailyTrend,
      maxProfitDay: maxProfitDay || 1,
    };
  }, [isOwner, chartLunasTrx, ownerProfitMap]);

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
              Dashboard Analitik & Laporan Penjualan
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
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${datePreset === 'all'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${datePreset === 'today'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${datePreset === '7days'
                  ? 'bg-white text-stone-900 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset('30days')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${datePreset === '30days'
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

        {/* Tombol Ekspor & Cetak Laporan */}
        <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2">
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
      {isOwner && ownerMetrics && chartMetrics && (
        <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-amber-600/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  Laporan Laba Kotor & HPP Konsolidasi
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

          {/* Grafik Garis Bertumpuk Persentase (100% Stacked Line & Area Chart) */}
          <div className="bg-black/30 p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Grafik Tren Omzet, Laba Kotor, dan HPP
                  </h3>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Visualisasi proporsi 100% beban modal (HPP) dan margin keuntungan (Laba Kotor) harian
                </p>
              </div>

              {/* Legend Indikator */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-emerald-500 shadow-xs" />
                  <span className="text-stone-300 text-[11px] font-semibold">Laba Kotor (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-xs bg-amber-500 shadow-xs" />
                  <span className="text-stone-300 text-[11px] font-semibold">HPP / Modal (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-amber-400 border-t border-dashed border-amber-300" />
                  <span className="text-stone-300 text-[11px] font-semibold">Batas 100%</span>
                </div>
              </div>
            </div>

            {/* Filter Rentang Tanggal Kalender Khusus Grafik */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Filter Kalender:
                </span>

                {/* Input Dari Tanggal */}
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition">
                  <span className="text-[11px] text-stone-400">Dari:</span>
                  <input
                    type="date"
                    value={chartStartDate}
                    onChange={(e) => setChartStartDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-hidden [color-scheme:dark] cursor-pointer font-mono"
                    aria-label="Dari Tanggal Grafik"
                  />
                </div>

                {/* Input Sampai Tanggal */}
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition">
                  <span className="text-[11px] text-stone-400">Sampai:</span>
                  <input
                    type="date"
                    value={chartEndDate}
                    onChange={(e) => setChartEndDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-hidden [color-scheme:dark] cursor-pointer font-mono"
                    aria-label="Sampai Tanggal Grafik"
                  />
                </div>

                {/* Shortcut Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyChartPreset('this_month')}
                    className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/10 hover:bg-white/15 text-stone-300 transition"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => applyChartPreset('last_month')}
                    className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/10 hover:bg-white/15 text-stone-300 transition"
                  >
                    Bulan Lalu
                  </button>
                  <button
                    type="button"
                    onClick={() => applyChartPreset('30days')}
                    className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/10 hover:bg-white/15 text-stone-300 transition"
                  >
                    30 Hari
                  </button>
                </div>

                {/* Reset Button */}
                {(chartStartDate || chartEndDate) && (
                  <button
                    type="button"
                    onClick={() => applyChartPreset('all')}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
                    title="Kembalikan ke filter halaman"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Status Info */}
              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                {chartStartDate || chartEndDate ? (
                  <span className="text-amber-300 font-medium">
                    📅 Filter Kalender Aktif ({chartMetrics.dailyTrend.length} hari data)
                  </span>
                ) : (
                  <span className="text-stone-400 italic">
                    Mengikuti filter rentang tanggal halaman utama
                  </span>
                )}
              </div>
            </div>

            {chartMetrics.dailyTrend.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                Tidak ada data transaksi lunas pada rentang tanggal kalender ini.
              </div>
            ) : (() => {
              const trendData = chartMetrics.dailyTrend;
              const N = trendData.length;
              const padLeft = 55;
              const padRight = 30;
              const padTop = 30;
              const padBottom = 45;
              const svgWidth = 800;
              const svgHeight = 280;
              const chartW = svgWidth - padLeft - padRight;
              const chartH = svgHeight - padTop - padBottom;

              const getX = (idx: number) => {
                if (N <= 1) return padLeft + chartW / 2;
                return padLeft + (idx / (N - 1)) * chartW;
              };

              const getY = (pct: number) => {
                const clamped = Math.max(0, Math.min(100, pct));
                return padTop + chartH * (1 - clamped / 100);
              };

              const profitPoints = trendData.map((d, i) => ({
                x: getX(i),
                y: getY(d.profitPct),
                d,
              }));

              const topPoints = trendData.map((d, i) => ({
                x: getX(i),
                y: getY(100),
              }));

              // Area Laba Kotor (0% -> profitPct)
              const profitAreaPath =
                N > 1
                  ? `M ${profitPoints[0].x} ${getY(0)} ` +
                  profitPoints.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                  ` L ${profitPoints[N - 1].x} ${getY(0)} Z`
                  : '';

              // Area HPP (profitPct -> 100%)
              const hppAreaPath =
                N > 1
                  ? `M ${profitPoints[0].x} ${profitPoints[0].y} ` +
                  profitPoints.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                  ` L ${topPoints[N - 1].x} ${topPoints[N - 1].y} ` +
                  topPoints
                    .slice()
                    .reverse()
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(' ') +
                  ` Z`
                  : '';

              // Line Paths
              const profitLinePath =
                N > 1
                  ? `M ${profitPoints[0].x} ${profitPoints[0].y} ` +
                  profitPoints
                    .slice(1)
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(' ')
                  : '';

              const top100LinePath =
                N > 1
                  ? `M ${topPoints[0].x} ${topPoints[0].y} ` +
                  topPoints
                    .slice(1)
                    .map((p) => `L ${p.x} ${p.y}`)
                    .join(' ')
                  : '';

              const hoveredData =
                hoveredTrendIdx !== null ? trendData[hoveredTrendIdx] : null;

              return (
                <div className="space-y-3">
                  {/* Tooltip Card Bar saat Hover */}
                  <div className="h-10 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs transition">
                    {hoveredData ? (
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-[11px] w-full justify-between">
                        <span className="font-bold text-amber-300">
                          📅 {hoveredData.date}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-400 font-bold">
                            🟢 Laba: {hoveredData.profitPct.toFixed(1)}% ({formatRupiah(hoveredData.profit)})
                          </span>
                          <span className="text-amber-400">
                            🟠 HPP: {hoveredData.hppPct.toFixed(1)}% ({formatRupiah(hoveredData.hpp)})
                          </span>
                          <span className="text-stone-300 hidden sm:inline">
                            Omzet: {formatRupiah(hoveredData.omzet)} (100%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-stone-400 text-[11px] italic">
                        Arahkan kursor pada titik tanggal di grafik untuk melihat detail persentase dan nominal.
                      </span>
                    )}
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full overflow-x-auto">
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      className="w-full h-auto min-w-[550px] select-none"
                    >
                      <defs>
                        {/* Gradient Laba Kotor (Emerald) */}
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
                        </linearGradient>

                        {/* Gradient HPP (Amber) */}
                        <linearGradient id="hppGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
                          <stop offset="100%" stopColor="#d97706" stopOpacity="0.15" />
                        </linearGradient>
                      </defs>

                      {/* Garis Horizontal Grid Persentase (0%, 25%, 50%, 75%, 100%) */}
                      {[100, 75, 50, 25, 0].map((pct) => {
                        const y = getY(pct);
                        return (
                          <g key={`grid-${pct}`}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={padLeft + chartW}
                              y2={y}
                              stroke="rgba(255, 255, 255, 0.12)"
                              strokeDasharray={pct === 0 || pct === 100 ? undefined : '3 3'}
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="fill-stone-400 font-mono text-[10px] font-medium"
                            >
                              {pct}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Stacked Areas (Bila Data > 1) */}
                      {N > 1 ? (
                        <>
                          {/* Layer Atas: HPP Area */}
                          <path
                            d={hppAreaPath}
                            fill="url(#hppGrad)"
                            className="transition-all duration-300"
                          />

                          {/* Layer Bawah: Laba Kotor Area */}
                          <path
                            d={profitAreaPath}
                            fill="url(#profitGrad)"
                            className="transition-all duration-300"
                          />

                          {/* Garis Batas 100% (Top Line) */}
                          <path
                            d={top100LinePath}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />

                          {/* Garis Pembagi Laba Kotor (Dividing Line) */}
                          <path
                            d={profitLinePath}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                          />
                        </>
                      ) : (
                        /* Single Day Fallback */
                        <g>
                          <rect
                            x={padLeft + chartW / 2 - 30}
                            y={getY(100)}
                            width="60"
                            height={getY(0) - getY(100)}
                            fill="url(#hppGrad)"
                            rx="4"
                          />
                          <rect
                            x={padLeft + chartW / 2 - 30}
                            y={getY(trendData[0].profitPct)}
                            width="60"
                            height={getY(0) - getY(trendData[0].profitPct)}
                            fill="url(#profitGrad)"
                            rx="4"
                          />
                        </g>
                      )}

                      {/* Vertical Guideline saat Hover */}
                      {hoveredTrendIdx !== null && (
                        <line
                          x1={getX(hoveredTrendIdx)}
                          y1={padTop}
                          x2={getX(hoveredTrendIdx)}
                          y2={getY(0)}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Titik Data Points & Label */}
                      {profitPoints.map((pt, i) => {
                        const isHovered = hoveredTrendIdx === i;
                        const dateFormatted = pt.d.date.slice(5).replace('-', '/');

                        return (
                          <g key={`point-${i}`}>
                            {/* Titik Garis Laba Kotor */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill="#10b981"
                              stroke="#ffffff"
                              strokeWidth={isHovered ? 2.5 : 1.5}
                              className="transition-all duration-150"
                            />

                            {/* Titik Garis 100% Top */}
                            <circle
                              cx={pt.x}
                              cy={getY(100)}
                              r={isHovered ? 4.5 : 3}
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              className="transition-all duration-150"
                            />

                            {/* Label Tanggal Sumbu X */}
                            <text
                              x={pt.x}
                              y={getY(0) + 18}
                              textAnchor="middle"
                              className={`font-mono text-[10px] ${isHovered
                                  ? 'fill-amber-300 font-bold'
                                  : 'fill-stone-400 font-medium'
                                }`}
                            >
                              {dateFormatted}
                            </text>

                            {/* Invisible Interactive Hit Column untuk Mouse Event */}
                            <rect
                              x={pt.x - Math.max(12, chartW / N / 2)}
                              y={padTop}
                              width={Math.max(24, chartW / N)}
                              height={chartH}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredTrendIdx(i)}
                              onMouseLeave={() => setHoveredTrendIdx(null)}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Ringkasan Komposisi di Bawah Grafik */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <span className="text-emerald-400 font-bold block text-[11px] uppercase">
                        Rata-Rata Margin Laba
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black font-mono text-emerald-300">
                          {chartMetrics.marginLaba}%
                        </span>
                        <span className="font-mono text-[11px] text-stone-300">
                          {formatRupiah(chartMetrics.totalGrossProfit)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      <span className="text-amber-400 font-bold block text-[11px] uppercase">
                        Rata-Rata Rasio HPP (Modal)
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black font-mono text-amber-300">
                          {100 - chartMetrics.marginLaba}%
                        </span>
                        <span className="font-mono text-[11px] text-stone-300">
                          {formatRupiah(chartMetrics.totalHPP)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-stone-300 font-bold block text-[11px] uppercase">
                        Total Omzet Acuan
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-black font-mono text-white">
                          100%
                        </span>
                        <span className="font-mono text-[11px] text-stone-300">
                          {formatRupiah(chartMetrics.totalOmzet)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Grid Grafik: Penjualan Harian per Cabang & Donat Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Batang Berkelompok Penjualan Harian per Cabang (Col span 2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Grafik Penjualan Harian per Cabang
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Perbandingan omzet antar cabang per tanggal (Diagram Batang Berkelompok)
              </p>
            </div>
            {/* Legend Cabang */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {branchDailySalesData.branchNames.map((bName) => (
                <div key={bName} className="flex items-center gap-1.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-xs ${
                      branchColors[bName]?.bg || 'bg-indigo-600'
                    }`}
                  />
                  <span className="text-stone-700 text-[11px] font-semibold">{bName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-bar Filter Kalender Khusus Grafik Cabang */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Rentang Waktu:
              </span>

              {/* Dari Tanggal */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2 py-1 shadow-2xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition">
                <span className="text-[10px] text-stone-500">Dari:</span>
                <input
                  type="date"
                  value={branchChartStartDate}
                  onChange={(e) => setBranchChartStartDate(e.target.value)}
                  className="bg-transparent text-xs text-stone-800 focus:outline-hidden font-mono cursor-pointer"
                  aria-label="Dari Tanggal Grafik Cabang"
                />
              </div>

              {/* Sampai Tanggal */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2 py-1 shadow-2xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition">
                <span className="text-[10px] text-stone-500">Sampai:</span>
                <input
                  type="date"
                  value={branchChartEndDate}
                  onChange={(e) => setBranchChartEndDate(e.target.value)}
                  className="bg-transparent text-xs text-stone-800 focus:outline-hidden font-mono cursor-pointer"
                  aria-label="Sampai Tanggal Grafik Cabang"
                />
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyBranchChartPreset('this_month')}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-200/70 hover:bg-stone-200 text-stone-700 transition"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => applyBranchChartPreset('last_month')}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-200/70 hover:bg-stone-200 text-stone-700 transition"
                >
                  Bulan Lalu
                </button>
                <button
                  type="button"
                  onClick={() => applyBranchChartPreset('30days')}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-stone-200/70 hover:bg-stone-200 text-stone-700 transition"
                >
                  30 Hari
                </button>
              </div>

              {/* Reset */}
              {(branchChartStartDate || branchChartEndDate) && (
                <button
                  type="button"
                  onClick={() => applyBranchChartPreset('all')}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition flex items-center gap-1"
                  title="Kembalikan ke filter halaman"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-stone-500">
              {branchChartStartDate || branchChartEndDate ? (
                <span className="text-amber-700 font-semibold">
                  📅 {branchDailySalesData.days.length} hari terfilter
                </span>
              ) : (
                <span className="text-stone-400 italic">
                  Mengikuti filter halaman
                </span>
              )}
            </div>
          </div>

          {/* Tooltip Bar saat Hover */}
          <div className="h-9 px-3 py-1 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between text-xs transition">
            {hoveredBranchDayIdx !== null && branchDailySalesData.days[hoveredBranchDayIdx] ? (
              (() => {
                const day = branchDailySalesData.days[hoveredBranchDayIdx];
                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] w-full">
                    <span className="font-bold text-stone-800 flex items-center gap-1">
                      📅 {day.date}
                    </span>
                    <div className="flex items-center gap-3">
                      {branchDailySalesData.branchNames.map((bName) => (
                        <span key={bName} className="flex items-center gap-1 text-stone-700">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: branchColors[bName]?.fill || '#6366f1' }}
                          />
                          <span className="font-semibold">{bName}:</span>{' '}
                          {formatRupiah(day.branches[bName] || 0)}
                        </span>
                      ))}
                      <span className="text-stone-900 font-bold ml-1 pl-2 border-l border-stone-300">
                        Total: {formatRupiah(day.dayTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <span className="text-stone-400 text-[11px] italic">
                Arahkan kursor pada batang diagram untuk melihat rincian penjualan per cabang.
              </span>
            )}
          </div>

          {/* SVG Clustered Column Chart (Grouped Bars per Date) */}
          {branchDailySalesData.days.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
              <BarChart3 className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
              Tidak ada data penjualan untuk filter rentang waktu ini.
            </div>
          ) : (() => {
            const { days, branchNames, yAxisMax } = branchDailySalesData;
            const N = days.length;
            const B = branchNames.length;
            const padLeft = 70;
            const padRight = 25;
            const padTop = 20;
            const padBottom = 45;
            const chartH = 200;
            const svgHeight = padTop + chartH + padBottom; // 265px fixed height!

            const barW = B <= 2 ? 20 : 14;
            const barGap = 3;
            const clusterW = B * barW + (B - 1) * barGap;
            const slotW = Math.max(76, clusterW + 36);
            const totalSlotsW = N * slotW;
            const svgWidth = Math.max(650, padLeft + padRight + totalSlotsW);

            // Ticks for Y-Axis: [1, 0.75, 0.5, 0.25, 0]
            const yTicks = [1, 0.75, 0.5, 0.25, 0];

            return (
              <div className="relative w-full overflow-x-auto pb-1">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ width: `${svgWidth}px`, height: `${svgHeight}px` }}
                  className="select-none min-w-full"
                >
                  {/* Grid Lines & Y-Axis Labels */}
                  {yTicks.map((pct) => {
                    const y = padTop + chartH * (1 - pct);
                    const val = Math.round(pct * yAxisMax);
                    return (
                      <g key={`y-tick-${pct}`}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke="#e7e5e4"
                          strokeDasharray={pct === 0 ? undefined : '3 3'}
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="fill-stone-400 font-mono text-[10px] font-medium"
                        >
                          {formatShortRupiah(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Sumbu X Axis line */}
                  <line
                    x1={padLeft}
                    y1={padTop + chartH}
                    x2={svgWidth - padRight}
                    y2={padTop + chartH}
                    stroke="#a8a29e"
                    strokeWidth="1.5"
                  />

                  {/* Sumbu Y Label */}
                  <text
                    x={padLeft - 8}
                    y={padTop - 6}
                    textAnchor="end"
                    className="fill-stone-400 text-[9px] font-semibold tracking-wider uppercase"
                  >
                    Nominal (Rp)
                  </text>

                  {/* Sumbu X Label */}
                  <text
                    x={svgWidth - padRight}
                    y={padTop + chartH + 34}
                    textAnchor="end"
                    className="fill-stone-400 text-[9px] font-semibold tracking-wider uppercase"
                  >
                    Tanggal Transaksi
                  </text>

                  {/* Clustered Bars for Each Date */}
                  {days.map((day, i) => {
                    const slotX = padLeft + i * slotW;
                    const slotCenterX = slotX + slotW / 2;
                    const clusterStartX = slotCenterX - clusterW / 2;
                    const isHovered = hoveredBranchDayIdx === i;
                    const dateFormatted = day.date.slice(5).replace('-', '/');

                    return (
                      <g key={day.date}>
                        {/* Hover Background Highlight Band */}
                        {isHovered && (
                          <rect
                            x={slotX + 4}
                            y={padTop}
                            width={slotW - 8}
                            height={chartH}
                            fill="#f5f5f4"
                            rx={6}
                          />
                        )}

                        {/* Bars for Each Branch */}
                        {branchNames.map((bName, bIdx) => {
                          const amount = day.branches[bName] || 0;
                          const barH =
                            amount > 0 ? Math.max(3, Math.round((amount / yAxisMax) * chartH)) : 0;
                          const barX = clusterStartX + bIdx * (barW + barGap);
                          const barY = padTop + chartH - barH;
                          const fillColor = branchColors[bName]?.fill || '#6366f1';

                          return (
                            <rect
                              key={bName}
                              x={barX}
                              y={barY}
                              width={barW}
                              height={barH}
                              rx={3}
                              fill={fillColor}
                              opacity={isHovered ? 1 : 0.9}
                              className="transition-all duration-150 hover:brightness-110"
                            >
                              <title>{`${bName} (${day.date}): ${formatRupiah(amount)}`}</title>
                            </rect>
                          );
                        })}

                        {/* X-Axis Date Label */}
                        <text
                          x={slotCenterX}
                          y={padTop + chartH + 18}
                          textAnchor="middle"
                          className={`font-mono text-[10px] ${
                            isHovered
                              ? 'fill-amber-700 font-bold'
                              : 'fill-stone-600 font-medium'
                          }`}
                        >
                          {dateFormatted}
                        </text>

                        {/* Invisible Full-Height Hit Column for Hover */}
                        <rect
                          x={slotX}
                          y={padTop}
                          width={slotW}
                          height={chartH + padBottom}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredBranchDayIdx(i)}
                          onMouseLeave={() => setHoveredBranchDayIdx(null)}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}

          {/* Ringkasan Akumulasi di Bagian Bawah */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500">
            <span>
              Total Omzet Rentang Ini:{' '}
              <strong className="text-stone-900 font-mono">
                {formatRupiah(branchDailySalesData.totalAllOmzet)}
              </strong>
            </span>
            <span className="text-[11px] text-stone-400">
              💡 Geser horizontal jika data tanggal bertambah
            </span>
          </div>
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
          <div className="flex flex-col items-center justify-center py-2 sm:py-4">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-stone-100 fill-none"
                  strokeWidth="12"
                />
                {/* Tunai arc (Emerald) */}
                {paymentBreakdown.tunaiPercent > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 fill-none transition-all duration-500"
                    strokeWidth="12"
                    strokeDasharray={`${(paymentBreakdown.tunaiPercent * 251.33) / 100} 251.33`}
                    strokeDashoffset="0"
                  />
                )}
                {/* QRIS arc (Blue) */}
                {paymentBreakdown.qrisPercent > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-500 fill-none transition-all duration-500"
                    strokeWidth="12"
                    strokeDasharray={`${(paymentBreakdown.qrisPercent * 251.33) / 100} 251.33`}
                    strokeDashoffset={`-${(paymentBreakdown.tunaiPercent * 251.33) / 100}`}
                  />
                )}
              </svg>

              {/* Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Total Transaksi
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-stone-900 my-0.5">
                  {countLunas}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">Struk Lunas</span>
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
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0
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
                      className={`h-full rounded-full transition-all ${idx === 0
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
              Highlight: |Selisih| &gt; Rp 20.000
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
                filteredShifts
                  .slice((shiftPage - 1) * shiftPageSize, shiftPage * shiftPageSize)
                  .map((shift) => {
                    const selisihNominal = shift.selisih ?? 0;
                    const isMajorDifference = Math.abs(selisihNominal) > 20000;

                    return (
                      <tr
                        key={shift.id}
                        className={`hover:bg-stone-50/70 transition-colors ${isMajorDifference ? 'bg-red-50/40' : ''
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
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${shift.status === 'diverifikasi'
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

        {/* Kontrol Pagination (Maks 20 data per slide) */}
        <Pagination
          currentPage={shiftPage}
          totalItems={filteredShifts.length}
          pageSize={shiftPageSize}
          onPageChange={setShiftPage}
        />
      </div>
    </div>
  );
}
