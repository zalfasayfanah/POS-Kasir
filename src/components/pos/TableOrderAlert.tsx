'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Transaksi } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { playChimeSound } from '@/lib/audio';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { 
  Bell, 
  Printer, 
  Check, 
  Coffee, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

interface TableOrderAlertProps {
  cabangId: string;
  onOpenReceipt: (trx: Transaksi) => void;
}

export default function TableOrderAlert({
  cabangId,
  onOpenReceipt,
}: TableOrderAlertProps) {
  const [incomingOrders, setIncomingOrders] = useState<Transaksi[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Ambil data transaksi lengkap dari Supabase
  const fetchFullTransaction = async (transaksiId: string): Promise<Transaksi | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase
        .from('transaksi') as any)
        .select(`
          *,
          cabang:cabang(*),
          kasir:profiles!transaksi_kasir_id_fkey(*),
          items:transaksi_item(*)
        `)
        .eq('id', transaksiId)
        .maybeSingle();

      if (error || !data) return null;
      return data as Transaksi;
    } catch {
      return null;
    }
  };

  // Handler saat ada pesanan meja baru yang lunas
  const handleNewOrder = async (transaksiId: string) => {
    if (processedIdsRef.current.has(transaksiId)) return;
    processedIdsRef.current.add(transaksiId);

    const fullTrx = await fetchFullTransaction(transaksiId);
    if (!fullTrx) return;

    // Mainkan suara lonceng
    if (isAudioEnabled) {
      playChimeSound();
    }

    setIncomingOrders((prev) => [fullTrx, ...prev.filter((o) => o.id !== fullTrx.id)]);

    toast.success(`🔔 Pesanan Baru Meja ${fullTrx.nomor_meja || '-'} Masuk!`, {
      description: `${fullTrx.nama_pelanggan || 'Pelanggan'} · ${formatRupiah(fullTrx.total)}`,
      duration: 6000,
    });
  };

  // Inisialisasi Supabase Realtime Listener
  useEffect(() => {
    const supabase = createClient();

    // 1. Subscribe ke event Realtime tabel transaksi
    const channel = supabase
      .channel('table-order-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaksi',
          filter: `cabang_id=eq.${cabangId}`,
        },
        async (payload: any) => {
          const row = payload.new;
          if (!row) return;

          // Cek apakah transaksi berstatus lunas dan bersumber dari self_service
          if (row.status === 'lunas' && row.sumber_pesanan === 'self_service') {
            await handleNewOrder(row.id);
          }
        }
      )
      .subscribe();

    // 2. Backup Polling setiap 8 detik (memastikan tidak ada pesanan yang terlewat jika koneksi WS putus)
    const pollInterval = setInterval(async () => {
      try {
        const { data: recentOrders } = await (supabase
          .from('transaksi') as any)
          .select('id, dibuat_pada')
          .eq('cabang_id', cabangId)
          .eq('status', 'lunas')
          .eq('sumber_pesanan', 'self_service')
          .order('dibuat_pada', { ascending: false })
          .limit(5);

        if (recentOrders) {
          for (const ord of recentOrders) {
            // Jika pesanan dibuat dalam 10 menit terakhir dan belum ada di processed set
            const createdTime = new Date(ord.dibuat_pada).getTime();
            const now = Date.now();
            if (now - createdTime < 10 * 60 * 1000 && !processedIdsRef.current.has(ord.id)) {
              await handleNewOrder(ord.id);
            }
          }
        }
      } catch {
        // Abaikan polling error
      }
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [cabangId, isAudioEnabled]);

  const handleDismiss = (id: string) => {
    setIncomingOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const handlePrint = (trx: Transaksi) => {
    onOpenReceipt(trx);
    handleDismiss(trx.id);
  };

  if (incomingOrders.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full space-y-3 animate-in slide-in-from-bottom-5 duration-300">
      {/* Sound Toggle Bar */}
      <div className="flex items-center justify-between bg-stone-900/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{incomingOrders.length} Pesanan Meja Menunggu Diproses</span>
        </span>

        <button
          type="button"
          onClick={() => {
            setIsAudioEnabled(!isAudioEnabled);
            if (!isAudioEnabled) playChimeSound();
          }}
          className="text-stone-300 hover:text-white p-1 rounded-md"
          title={isAudioEnabled ? 'Matikan Suara' : 'Aktifkan Suara Lonceng'}
        >
          {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Cards List Pesanan Masuk */}
      {incomingOrders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-3xl p-4 shadow-2xl border-2 border-amber-500/80 space-y-3 text-stone-900"
        >
          {/* Header Card */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md">
                    MEJA {order.nomor_meja || '-'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md uppercase">
                    Lunas QRIS
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-stone-950 mt-0.5">
                  {order.nama_pelanggan || 'Pelanggan'}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(order.id)}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rincian Menu Pesanan */}
          <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1 max-h-36 overflow-y-auto">
            {order.items?.map((it, idx) => (
              <div key={idx} className="flex justify-between text-stone-700 text-[11.5px]">
                <span>
                  <strong>{it.jumlah}x</strong> {it.nama_produk}
                </span>
                <span className="font-mono font-bold text-stone-900">
                  {formatRupiah(it.subtotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Total & Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[10px] text-stone-400 block font-bold uppercase">Total Tagihan</span>
              <span className="font-mono font-black text-sm text-stone-950">
                {formatRupiah(order.total)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePrint(order)}
                className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk Meja</span>
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(order.id)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
                title="Tandai Sudah Diproses"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
