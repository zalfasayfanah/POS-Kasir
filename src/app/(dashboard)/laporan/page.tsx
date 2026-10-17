import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatRupiah } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, Receipt, Ban, ShieldCheck } from 'lucide-react';

export default async function LaporanPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const isOwner = profile?.peran === 'owner';

  // Ambil transaksi lunas untuk omzet
  const { data: transaksiLunas } = await supabase
    .from('transaksi')
    .select('*, items:transaksi_item(*)')
    .eq('status', 'lunas');

  const { data: transaksiVoid } = await supabase
    .from('transaksi')
    .select('id')
    .eq('status', 'void');

  const totalOmzet = (transaksiLunas as any[])?.reduce((acc: number, t: any) => acc + (t.total || 0), 0) || 0;
  const countLunas = transaksiLunas?.length || 0;
  const countVoid = transaksiVoid?.length || 0;
  const avgOrderValue = countLunas > 0 ? Math.round(totalOmzet / countLunas) : 0;

  // Khusus Owner: kalkulasi laba kotor dari riwayat harga modal
  let totalHPP = 0;
  let totalLabaKotor = 0;
  let marginLaba = 0;

  if (isOwner && transaksiLunas) {
    const { data: modalRows } = await supabase.from('riwayat_harga_modal').select('*');
    const modalMap: Record<string, number> = {};
    if (modalRows) {
      for (const m of modalRows as any[]) {
        modalMap[m.produk_id] = m.harga_modal;
      }
    }

    for (const trx of transaksiLunas as any[]) {
      if (trx.items) {
        for (const it of trx.items) {
          const cost = modalMap[it.produk_id] || 0;
          totalHPP += cost * it.jumlah;
        }
      }
    }
    totalLabaKotor = totalOmzet - totalHPP;
    marginLaba = totalOmzet > 0 ? Math.round((totalLabaKotor / totalOmzet) * 100) : 0;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            Analitik & Laporan Penjualan (US-09)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Laporan Kinerja Penjualan
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Pengguna: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.peran}) · {profile?.cabang ? profile.cabang.nama : 'Konsolidasi 3 Cabang'}
          </p>
        </div>
      </div>

      {/* Grid Metrik Ringkasan (Real Database Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Omzet Lunas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatRupiah(totalOmzet)}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">Dari {countLunas} transaksi lunas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Rata-Rata Transaksi</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {formatRupiah(avgOrderValue)}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">Average Order Value (AOV)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Jumlah Transaksi</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {countLunas}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">Total struk terbit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Transaksi Void</span>
            <Ban className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900">
            {countVoid}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">Dibatalkan resmi</span>
        </div>
      </div>

      {/* Panel Khusus Owner: Laba Kotor & Margin (BR-11 Confidential) */}
      {isOwner && (
        <div className="bg-gradient-to-br from-amber-900 to-stone-900 text-white p-6 rounded-2xl shadow-lg border border-amber-800/40">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Informasi Rahasia Owner (BR-11)
            </span>
            <span className="text-[11px] text-amber-200/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              Tidak dapat diakses Kepala Toko / Kasir
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-xs text-amber-200/80 block mb-1">Total HPP (Modal)</span>
              <p className="text-xl font-bold font-mono text-white">
                {formatRupiah(totalHPP)}
              </p>
            </div>
            <div>
              <span className="text-xs text-amber-200/80 block mb-1">Total Laba Kotor</span>
              <p className="text-2xl font-bold font-mono text-amber-400">
                {formatRupiah(totalLabaKotor)}
              </p>
            </div>
            <div>
              <span className="text-xs text-amber-200/80 block mb-1">Margin Keuntungan</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {marginLaba}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
