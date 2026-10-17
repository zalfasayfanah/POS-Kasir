import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import LaporanClient, {
  BranchOption,
  TransaksiData,
  ShiftData,
} from '@/components/laporan/LaporanClient';

export const dynamic = 'force-dynamic';

export default async function LaporanPage() {
  const profile = await getCurrentUserProfile();

  // Role Protection: Kasir tidak boleh mengakses laporan penjualan
  if (!profile || profile.peran === 'kasir') {
    redirect('/kasir');
  }

  const supabase = await createClient();
  const isOwner = profile.peran === 'owner';
  const userCabangId = profile.cabang_id;

  // 1. Fetch Cabang List
  const { data: cabangRows } = await supabase
    .from('cabang')
    .select('id, nama, kode')
    .order('nama', { ascending: true });

  const cabangList: BranchOption[] = (cabangRows as BranchOption[]) || [];

  // 2. Fetch Transactions with relation to cabang & items
  // If Kepala Toko, Supabase RLS will naturally restrict, but we can also filter explicitly
  let trxQuery = supabase
    .from('transaksi')
    .select(
      'id, nomor_struk, total, status, metode_bayar, dibuat_pada, cabang_id, cabang(id, nama), items:transaksi_item(id, produk_id, nama_produk, harga_satuan, jumlah, subtotal)'
    )
    .order('dibuat_pada', { ascending: false });

  if (!isOwner && userCabangId) {
    trxQuery = trxQuery.eq('cabang_id', userCabangId);
  }

  const { data: trxRows } = await trxQuery;
  const transaksiList = (trxRows as any[] as TransaksiData[]) || [];

  // 3. Fetch Shifts
  let shiftQuery = supabase
    .from('shift_kasir')
    .select(
      'id, cabang_id, cabang(nama), kasir_id, kasir:profiles!shift_kasir_kasir_id_fkey(nama_lengkap), status, dibuka_pada, ditutup_pada, kas_awal, total_tunai, total_qris, kas_seharusnya, uang_fisik, selisih, catatan_tutup, catatan_verifikasi'
    )
    .order('dibuka_pada', { ascending: false });

  if (!isOwner && userCabangId) {
    shiftQuery = shiftQuery.eq('cabang_id', userCabangId);
  }

  const { data: shiftRows } = await shiftQuery;
  const shiftList = (shiftRows as any[] as ShiftData[]) || [];

  // 4. Khusus Owner: Hitung Historical HPP & Gross Profit per transaksi (BR-11)
  // Penting: Objek ini HANYA dibuat dan dikirim jika isOwner === true.
  // Jika Kepala Toko, ownerProfitMap undefined / tidak pernah dikirim ke browser!
  let ownerProfitMap: Record<string, { hpp: number; grossProfit: number }> | undefined = undefined;

  if (isOwner) {
    // Ambil seluruh riwayat modal diurutkan berdasarkan berlaku_mulai desc
    const { data: modalRows } = await supabase
      .from('riwayat_harga_modal')
      .select('produk_id, harga_modal, berlaku_mulai')
      .order('berlaku_mulai', { ascending: false });

    const safeModalRows = (modalRows as any[]) || [];

    // Helper untuk mencari harga modal yang berlaku pada tanggal transaksi
    const getHistoricalUnitCost = (produkId: string, trxIsoString: string): number => {
      const trxTime = new Date(trxIsoString).getTime();
      const applicable = safeModalRows.filter(
        (m) => m.produk_id === produkId && new Date(m.berlaku_mulai).getTime() <= trxTime
      );
      if (applicable.length > 0) {
        return applicable[0].harga_modal;
      }
      return 0;
    };

    ownerProfitMap = {};
    for (const trx of transaksiList) {
      if (trx.status === 'lunas' && trx.items) {
        let trxHpp = 0;
        for (const item of trx.items) {
          const unitCost = getHistoricalUnitCost(item.produk_id, trx.dibuat_pada);
          trxHpp += unitCost * (item.jumlah || 0);
        }
        ownerProfitMap[trx.id] = {
          hpp: trxHpp,
          grossProfit: (trx.total || 0) - trxHpp,
        };
      }
    }
  }

  return (
    <LaporanClient
      isOwner={isOwner}
      userCabangId={userCabangId}
      cabangList={cabangList}
      transaksiList={transaksiList}
      shiftList={shiftList}
      ownerProfitMap={ownerProfitMap}
    />
  );
}
