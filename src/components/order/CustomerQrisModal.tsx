'use client';

import React, { useState, useEffect } from 'react';
import type { Transaksi } from '@/types/database';
import type { MayarInvoiceResponse } from '@/lib/mayar';
import { formatRupiah } from '@/lib/utils';
import { cekStatusPesananSelfServiceAction } from '@/app/actions/self-service';
import { 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  Clock, 
  Sparkles, 
  Coffee, 
  Receipt,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerQrisModalProps {
  transaksiId: string;
  nomorStruk: string;
  nomorMeja: string;
  namaPelanggan: string;
  total: number;
  invoice: MayarInvoiceResponse;
  onSuccess: (trx: Transaksi) => void;
  onClose: () => void;
}

export default function CustomerQrisModal({
  transaksiId,
  nomorStruk,
  nomorMeja,
  namaPelanggan,
  total,
  invoice,
  onSuccess,
  onClose,
}: CustomerQrisModalProps) {
  // Timer 10 Menit (600 Detik)
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paidTrx, setPaidTrx] = useState<Transaksi | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Ambil URL Pembayaran dan QR Code Mayar
  const payUrl = invoice.paymentUrl || invoice.link || '';
  const qrisImageUrl =
    (invoice as any).qrcodeUrl ||
    (invoice as any).qrUrl ||
    (invoice as any).qrCodeUrl ||
    (payUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(payUrl)}` : '');

  // Countdown Timer
  useEffect(() => {
    if (isPaid || isExpired) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaid, isExpired]);

  // Polling Status Pembayaran secara Realtime (setiap 2.5 detik)
  useEffect(() => {
    if (isPaid || isExpired) return;

    const interval = setInterval(async () => {
      try {
        const res = await cekStatusPesananSelfServiceAction(transaksiId);
        if (res.success && res.status === 'lunas' && res.transaksi) {
          clearInterval(interval);
          setIsPaid(true);
          setPaidTrx(res.transaksi);
          onSuccess(res.transaksi);
          toast.success('Pembayaran QRIS Berhasil Terverifikasi!', {
            description: `Pesanan Meja ${nomorMeja} sedang disiapkan.`,
          });
        }
      } catch (e) {
        // Abaikan kegagalan jaringan sementara
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [transaksiId, isPaid, isExpired, nomorMeja, onSuccess]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownloadQr = () => {
    if (!qrisImageUrl) {
      toast.error('Gambar QRIS tidak tersedia.');
      return;
    }
    const link = document.createElement('a');
    link.href = qrisImageUrl;
    link.download = `QRIS-LumbungKopi-Meja${nomorMeja}-${nomorStruk}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Gambar QRIS berhasil diunduh!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-sm w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className={`p-4 text-white flex items-center justify-between shrink-0 transition-colors ${
          isPaid ? 'bg-emerald-600' : isExpired ? 'bg-red-600' : 'bg-stone-900'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${isPaid ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
              {isPaid ? <CheckCircle2 className="w-5 h-5 text-emerald-200" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {isPaid ? 'Pesanan Berhasil!' : isExpired ? 'Tagihan Kedaluwarsa' : 'Pembayaran QRIS'}
              </h3>
              <p className="text-[11px] text-stone-300 font-mono">
                Meja {nomorMeja} · {namaPelanggan}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-center">
          {/* Kondisi 1: Berhasil Dibayar (Lunas) */}
          {isPaid ? (
            <div className="space-y-4 py-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-stone-900 text-lg">Pembayaran Berhasil!</h4>
                <p className="text-xs text-stone-600 leading-relaxed max-w-[260px] mx-auto">
                  Terima kasih, <strong className="text-stone-900">{namaPelanggan}</strong>! Pesanan Anda sedang disiapkan dan akan segera diantar ke <strong className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono">Meja {nomorMeja}</strong>.
                </p>
              </div>

              {/* Rincian Nota Kecil */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1 text-xs">
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>No. Struk</span>
                  <span className="font-mono font-bold text-stone-800">{nomorStruk}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Total Dibayar</span>
                  <span className="font-mono font-extrabold text-emerald-800">{formatRupiah(total)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Metode</span>
                  <span className="font-medium text-stone-700">QRIS Mayar Sandbox</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              >
                Tutup & Selesai
              </button>
            </div>
          ) : isExpired ? (
            /* Kondisi 2: Waktu Tagihan Habis */
            <div className="space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900 text-base">Waktu Pembayaran Habis</h4>
                <p className="text-xs text-stone-500">
                  Tagihan QRIS ini telah kedaluwarsa. Silakan buat pesanan ulang.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-stone-900 text-white hover:bg-stone-800 transition"
              >
                Pesan Ulang
              </button>
            </div>
          ) : (
            /* Kondisi 3: Menunggu Pembayaran QRIS */
            <div className="space-y-3.5">
              {/* Total Tagihan & Timer */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                <div className="text-left">
                  <span className="text-[10px] text-stone-500 block uppercase font-bold tracking-wider">Total Tagihan</span>
                  <span className="text-base font-extrabold font-mono text-stone-900">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTimer(secondsLeft)}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-stone-300 inline-block mx-auto shadow-xs">
                {qrisImageUrl ? (
                  <img
                    src={qrisImageUrl}
                    alt="QRIS Mayar"
                    className="w-52 h-52 object-contain mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center bg-stone-100 text-stone-400 text-xs p-4 rounded-lg">
                    <Receipt className="w-8 h-8 mb-2 text-stone-300 animate-pulse" />
                    <span>Memuat QRIS...</span>
                  </div>
                )}
              </div>

              {/* Status Polling Indicator */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Menunggu Anda menyelesaikan pembayaran...</span>
              </div>

              {/* Tombol Aksi HP (Buka App / Unduh QR) */}
              <div className="space-y-2 pt-1">
                {payUrl && (
                  <a
                    href={payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <span>Bayar via Aplikasi / M-Banking</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {qrisImageUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>Simpan Gambar QR ke Galeri</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-stone-400">
                Bisa di-scan menggunakan BCA Mobile, GoPay, OVO, ShopeePay, DANA, atau aplikasi perbankan lainnya.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
