'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Filter,
  BarChart3,
  PieChart
} from 'lucide-react';
import StokModal from './StokModal';
import Pagination from '@/components/ui/Pagination';

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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kategoriFilter, statusFilter, cabangFilter]);

  // State Modal Penyesuaian
  const [selectedStok, setSelectedStok] = useState<StokCabang | null>(null);

  // Wewenang: Hanya Kepala Toko dan Owner (US-07)
  const canAdjustStock = profile.peran === 'kepala_toko' || profile.peran === 'owner';
  const isOwner = profile.peran === 'owner';

  // 1. Filter Data Stok (Reaktif terhadap pencarian, kategori, status, dan cabang)
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

  // 2. Kalkulasi Metrik Ringkasan Berdasarkan filteredStock (Reaktif terhadap filter aktif)
  const metrics = useMemo(() => {
    const totalItems = filteredStock.length;
    const totalUnits = filteredStock.reduce((acc, s) => acc + s.jumlah, 0);
    const outOfStock = filteredStock.filter((s) => s.jumlah === 0).length;
    const lowStock = filteredStock.filter(
      (s) => s.jumlah > 0 && s.jumlah <= s.stok_minimum
    ).length;
    const safeStock = filteredStock.filter((s) => s.jumlah > s.stok_minimum).length;

    const safePct = totalItems > 0 ? Math.round((safeStock / totalItems) * 100) : 0;
    const lowPct = totalItems > 0 ? Math.round((lowStock / totalItems) * 100) : 0;
    const outPct = totalItems > 0 ? Math.round((outOfStock / totalItems) * 100) : 0;

    return { totalItems, totalUnits, outOfStock, lowStock, safeStock, safePct, lowPct, outPct };
  }, [filteredStock]);

  // 3. Statistik Distribusi Stok per Cabang (Hanya cabang relevan untuk role yang sedang login)
  const branchStats = useMemo(() => {
    let targetBranches: Cabang[] = [];

    // Jika bukan owner (misal: Kepala Toko), HANYA tampilkan cabang miliknya sendiri agar tidak ada bar cabang lain yang kosong
    if (!isOwner) {
      if (profile.cabang) {
        targetBranches = [profile.cabang];
      } else if (profile.cabang_id) {
        targetBranches = branches.filter((b) => b.id === profile.cabang_id);
      }
    } else {
      // Jika owner, ikuti filter cabang aktif
      targetBranches = cabangFilter === 'semua'
        ? branches
        : branches.filter((b) => b.id === cabangFilter);
    }

    const branchList = targetBranches.length > 0
      ? targetBranches
      : Array.from(new Set(initialStock.map((s) => s.cabang_id))).map((cid) => {
          const s = initialStock.find((item) => item.cabang_id === cid);
          return s?.cabang || { id: cid, nama: 'Cabang', kode: 'CBG' };
        });

    const list = branchList.map((branch) => {
      const items = filteredStock.filter((s) => s.cabang_id === branch.id);
      const totalUnits = items.reduce((acc, s) => acc + s.jumlah, 0);
      const totalCount = items.length;
      const safeCount = items.filter((s) => s.jumlah > s.stok_minimum).length;
      const lowCount = items.filter((s) => s.jumlah > 0 && s.jumlah <= s.stok_minimum).length;
      const outCount = items.filter((s) => s.jumlah === 0).length;

      const safeUnits = items.filter((s) => s.jumlah > s.stok_minimum).reduce((a, b) => a + b.jumlah, 0);
      const lowUnits = items.filter((s) => s.jumlah > 0 && s.jumlah <= s.stok_minimum).reduce((a, b) => a + b.jumlah, 0);

      const safePct = totalCount > 0 ? (safeCount / totalCount) * 100 : 0;
      const lowPct = totalCount > 0 ? (lowCount / totalCount) * 100 : 0;
      const outPct = totalCount > 0 ? (outCount / totalCount) * 100 : 0;

      return {
        branch,
        totalUnits,
        totalCount,
        safeCount,
        lowCount,
        outCount,
        safeUnits,
        lowUnits,
        safePct,
        lowPct,
        outPct,
      };
    });

    const maxUnits = Math.max(...list.map((b) => b.totalUnits), 1);

    return { list, maxUnits };
  }, [branches, initialStock, filteredStock, cabangFilter, isOwner, profile.cabang, profile.cabang_id]);

  // 4. Kalkulasi Data Donut Chart (1 Layer untuk Single Branch, 3 Layer Konsentris untuk Multi-Cabang Owner)
  const isMultiLayer = isOwner && cabangFilter === 'semua' && branchStats.list.length > 1;

  // Helper untuk menghitung irisan cincin (ring slices) lengkap dengan koordinat angka persentase
  const computeRing = (safeCount: number, lowCount: number, outCount: number, radius: number, cx = 130, cy = 130) => {
    const total = safeCount + lowCount + outCount;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) {
      return { total, circumference, radius, slices: [], isEmpty: true };
    }

    const raw = [
      { key: 'safe', count: safeCount, color: '#10b981', label: 'Aman' },
      { key: 'low', count: lowCount, color: '#f59e0b', label: 'Menipis' },
      { key: 'out', count: outCount, color: '#ef4444', label: 'Habis' },
    ].filter((s) => s.count > 0);

    let accumulatedFrac = 0;
    const slices = raw.map((item) => {
      const frac = item.count / total;
      const startFrac = accumulatedFrac;
      const endFrac = accumulatedFrac + frac;
      accumulatedFrac = endFrac;

      const pct = Math.round(frac * 100);
      const strokeDash = frac * circumference;
      const strokeOffset = -startFrac * circumference;

      // Titik tengah sudut busur untuk posisi teks persentase (dalam radian, jam 12 = -π/2)
      const midFrac = (startFrac + endFrac) / 2;
      const midAngle = midFrac * 2 * Math.PI - Math.PI / 2;
      const textX = cx + radius * Math.cos(midAngle);
      const textY = cy + radius * Math.sin(midAngle) + 3.5;

      return {
        ...item,
        frac,
        pct,
        strokeDash,
        strokeOffset,
        textX,
        textY,
        hasText: pct >= 6, // Tampilkan angka jika irisan cukup besar (≥ 6%)
      };
    });

    return { total, circumference, radius, slices, isEmpty: false };
  };

  // Setup Layer Cincin Donut
  const donutLayers = useMemo(() => {
    const cx = 140;
    const cy = 140;

    if (isMultiLayer) {
      // 3 Layer Konsentris (Ring Luar, Ring Tengah, Ring Dalam)
      const ringConfigs = [
        { strokeWidth: 18, name: 'Ring Luar' },
        { strokeWidth: 18, name: 'Ring Tengah' },
        { strokeWidth: 18, name: 'Ring Dalam' },
      ];
      const radii = [114, 88, 62];

      return branchStats.list.slice(0, 3).map((branchData, index) => {
        const cfg = ringConfigs[index];
        const ring = computeRing(branchData.safeCount, branchData.lowCount, branchData.outCount, radii[index], cx, cy);
        return {
          ...cfg,
          ...ring,
          branch: branchData.branch,
          totalUnits: branchData.totalUnits,
          totalCount: branchData.totalCount,
        };
      });
    } else {
      // 1 Layer Cincin Lebar (Single Branch)
      const singleRing = computeRing(metrics.safeStock, metrics.lowStock, metrics.outOfStock, 88, cx, cy);
      return [
        {
          strokeWidth: 34,
          name: 'Ring Utama',
          ...singleRing,
          branch: branchStats.list[0]?.branch || profile.cabang,
          totalUnits: metrics.totalUnits,
          totalCount: metrics.totalItems,
        },
      ];
    }
  }, [isMultiLayer, branchStats.list, metrics, profile.cabang]);

  const activeBranchName = !isOwner
    ? (profile.cabang?.nama || 'Cabang Anda')
    : (cabangFilter === 'semua' ? 'Semua Cabang' : (branches.find((b) => b.id === cabangFilter)?.nama || 'Cabang Terpilih'));

  const activeBranchCode = !isOwner
    ? (profile.cabang?.kode || 'CABANG')
    : (cabangFilter === 'semua' ? 'SEMUA' : (branches.find((b) => b.id === cabangFilter)?.kode || 'CBG'));

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            Inventori & Stok Fisik Cabang
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Stok Cabang
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Petugas bertugas: <span className="font-semibold text-stone-800">{profile.nama_lengkap}</span> ({profile.peran}) · {profile.cabang ? profile.cabang.nama : 'Semua Cabang'}
          </p>
        </div>
      </div>

      {/* Visualisasi Stok: Donut Chart Murni + 4 KPI Cards Reaktif */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Kolom Kiri: Donut Chart Komposisi Stok */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-amber-700" />
                  <h2 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                    Diagram Komposisi Stok
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isMultiLayer
                    ? 'Multi-layer donut: setiap lapisan lingkaran mewakili 1 cabang'
                    : 'Proporsi kondisi produk & volume fisik barang'}
                </p>
              </div>

              {/* Tag Identitas Cabang Aktif */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/70 text-xs font-bold w-fit">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>{activeBranchCode} · {activeBranchName}</span>
              </div>
            </div>

            {/* Konten Donut Chart & Legend Ramping */}
            {metrics.totalItems === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-1">
                <Package className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs font-semibold text-stone-600">
                  Tidak ada stok produk yang sesuai dengan filter
                </p>
                <p className="text-[11px] text-stone-400">
                  Coba sesuaikan kata kunci pencarian atau opsi filter lainnya.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center pt-1 space-y-3">
                {/* 1. Keterangan Kondisi Stok: Berjejer di Atas Donut Chart */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-2 px-4 rounded-2xl bg-stone-50/80 border border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs flex-shrink-0" />
                    <span className="text-xs font-bold text-stone-800">Stok Aman</span>
                    <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">(di atas minimum)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs flex-shrink-0" />
                    <span className="text-xs font-bold text-stone-800">Stok Menipis</span>
                    <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">(mendekati minimum)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-xs flex-shrink-0" />
                    <span className="text-xs font-bold text-stone-800">Stok Habis</span>
                    <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">(0 unit)</span>
                  </div>
                </div>

                {/* 2. Donut Chart Besar di Tengah dengan Angka di Dalam Irisan */}
                <div className="py-2 flex flex-col items-center justify-center relative">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center">
                    <svg
                      viewBox="0 0 280 280"
                      className="w-full h-full drop-shadow-xs"
                    >
                      {donutLayers.map((layer, lIdx) => (
                        <g key={`layer-${lIdx}`}>
                          {/* Background Track */}
                          <circle
                            cx="140"
                            cy="140"
                            r={layer.radius}
                            fill="transparent"
                            stroke="#f5f5f4"
                            strokeWidth={layer.strokeWidth}
                            strokeDasharray={layer.isEmpty ? '4 4' : undefined}
                          />

                          {/* Jika kosong (0 produk) */}
                          {layer.isEmpty && (
                            <text
                              x="140"
                              y={140 - layer.radius + 3.5}
                              textAnchor="middle"
                              className="text-[9px] font-mono fill-stone-400 font-bold"
                            >
                              0%
                            </text>
                          )}

                          {/* Irisan Berwarna */}
                          {!layer.isEmpty &&
                            layer.slices.map((slice) => (
                              <circle
                                key={`slice-${lIdx}-${slice.key}`}
                                cx="140"
                                cy="140"
                                r={layer.radius}
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth={layer.strokeWidth}
                                strokeDasharray={`${slice.strokeDash} ${layer.circumference - slice.strokeDash}`}
                                strokeDashoffset={slice.strokeOffset}
                                transform="rotate(-90 140 140)"
                                className="transition-all duration-700 ease-out"
                              />
                            ))}

                          {/* Angka Persentase di Dalam Irisan Lingkaran */}
                          {!layer.isEmpty &&
                            layer.slices.map((slice) =>
                              slice.hasText ? (
                                <text
                                  key={`text-${lIdx}-${slice.key}`}
                                  x={slice.textX}
                                  y={slice.textY}
                                  textAnchor="middle"
                                  className={`${
                                    isMultiLayer ? 'text-[10px]' : 'text-[12px]'
                                  } font-black font-mono fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] select-none pointer-events-none`}
                                >
                                  {slice.pct}%
                                </text>
                              ) : null
                            )}
                        </g>
                      ))}
                    </svg>

                    {/* Teks Ringkasan di Tengah Lubang Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-stone-900 tracking-tight leading-none">
                        {metrics.totalUnits}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                        Unit Fisik
                      </span>
                      <span className="text-[11px] font-mono font-medium text-stone-500">
                        {isMultiLayer ? '3 Cabang' : `(${metrics.totalItems} jenis)`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Keterangan Cabang di Bawah Donut Chart */}
                {isMultiLayer ? (
                  <div className="w-full pt-3 border-t border-stone-100">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center mb-2.5">
                      Lapisan Cincin Cabang
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
                      {donutLayers.map((layer, idx) => (
                        <div
                          key={`legend-layer-${idx}`}
                          className="flex items-center justify-between sm:flex-col sm:items-center sm:text-center p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60"
                        >
                          <div className="flex items-center gap-1.5 sm:mb-1">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-stone-700 inline-block" />
                            <span className="font-extrabold text-stone-900">{layer.name}</span>
                          </div>
                          <div className="text-stone-600 text-[11px] truncate max-w-[130px]">
                            {layer.branch?.kode} · {layer.branch?.nama}
                          </div>
                          <div className="font-mono font-black text-amber-900 sm:mt-1 text-xs">
                            {layer.totalUnits} unit ({layer.totalCount} produk)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full pt-2 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs text-stone-700">
                      <Building2 className="w-3.5 h-3.5 text-amber-700" />
                      <span className="font-bold">{activeBranchCode} · {activeBranchName}</span>
                      <span className="text-stone-300">|</span>
                      <span className="font-mono font-bold text-amber-900">{metrics.totalUnits} unit fisik</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: 4 KPI Cards Reaktif */}
        <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Total Produk */}
          <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>Total Produk Terfilter</span>
              <Package className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
                {metrics.totalItems}
              </span>
              <span className="text-xs font-mono font-bold text-stone-500">
                {metrics.totalUnits} unit
              </span>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-700 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Stok Aman */}
          <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
              <span>Stok Aman</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                {metrics.safeStock}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600">
                {metrics.safePct}%
              </span>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${metrics.safePct}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              />
            </div>
          </div>

          {/* Stok Menipis */}
          <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
              <span>Stok Menipis</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                {metrics.lowStock}
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">
                {metrics.lowPct}%
              </span>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${metrics.lowPct}%` }}
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              />
            </div>
          </div>

          {/* Stok Habis */}
          <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
              <span>Stok Habis (0)</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-red-700 font-mono">
                {metrics.outOfStock}
              </span>
              <span className="text-xs font-mono font-bold text-red-600">
                {metrics.outPct}%
              </span>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${metrics.outPct}%` }}
                className="bg-red-500 h-full rounded-full transition-all duration-500" 
              />
            </div>
          </div>
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
                filteredStock
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((s) => {
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

        {/* Kontrol Pagination (Maks 20 data per slide) */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStock.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
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
