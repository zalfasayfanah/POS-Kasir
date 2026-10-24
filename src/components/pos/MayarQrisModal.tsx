'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import type { Transaksi } from '@/types/database';
import type { MayarInvoiceResponse } from '@/lib/mayar';
import { formatRupiah } from '@/lib/utils';
import { cekStatusTransaksiMayarAction, batalkanTransaksiMayarAction } from '@/app/actions/mayar';
import { toast } from 'sonner';
import { 
  QrCode, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Ban
} from 'lucide-react';

interface MayarQrisModalProps {
  transaksi: Transaksi;
  invoice: MayarInvoiceResponse;
  onPaymentSuccess: (trx: Transaksi) => void;
  onClose: () => void;
}

export default function MayarQrisModal({
  transaksi,
  invoice,
  onPaymentSuccess,
  onClose,
}: MayarQrisModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 menit
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isCanceling, startCancelTransition] = useTransition();
  const [status, setStatus] = useState<'menunggu_bayar' | 'lunas' | 'batal'>('menunggu_bayar');
  const [statusMessage, setStatusMessage] = useState<string>('Menunggu pembayaran QRIS dari pelanggan...');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling cek status pembayaran otomatis setiap 3 detik
  const checkPaymentStatus = async (isManual: boolean = false) => {
    if (status !== 'menunggu_bayar') return;
    if (isManual) setIsChecking(true);

    try {
      const res = await cekStatusTransaksiMayarAction(transaksi.id);
      if (res.success) {
        if (res.status === 'lunas') {
          setStatus('lunas');
          setStatusMessage(res.message || 'Pembayaran berhasil diverifikasi!');
          toast.success('Pembayaran QRIS Mayar berhasil!');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            if (res.transaksi) {
              onPaymentSuccess(res.transaksi);
            }
          }, 1200);
        } else if (res.status === 'batal') {
          setStatus('batal');
          setStatusMessage(res.message || 'Transaksi dibatalkan dan stok telah dikembalikan.');
          toast.error(res.message || 'Transaksi dibatalkan.');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (res.remainingSeconds !== undefined) {
          setSecondsRemaining(res.remainingSeconds);
        }
      }
    } catch (err: any) {
      if (isManual) {
        toast.error('Gagal mengecek status pembayaran ke Mayar.');
      }
    } finally {
      if (isManual) setIsChecking(false);
    }
  };

  // Setup countdown timer & auto-polling
  useEffect(() => {
    // 1. Timer countdown 1 detik
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          checkPaymentStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Polling Mayar API setiap 3 detik
    pollIntervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    return () => {
      clearInterval(timer);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [transaksi.id, status]);

  // Format MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Kasir membatalkan transaksi secara manual
  const handleCancel = () => {
    if (status !== 'menunggu_bayar') return;
    if (!confirm('Apakah Anda yakin ingin membatalkan transaksi QRIS ini? Seluruh stok produk akan segera dikembalikan ke cabang.')) {
      return;
    }

    startCancelTransition(async () => {
      try {
        const res = await batalkanTransaksiMayarAction(transaksi.id, 'Dibatalkan oleh kasir di kasir POS');
        if (res.success) {
          toast.success(res.message || 'Transaksi berhasil dibatalkan.');
          setStatus('batal');
          setStatusMessage('Transaksi telah dibatalkan. Stok barang telah dikembalikan.');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          toast.error(res.error || 'Gagal membatalkan transaksi.');
        }
      } catch (err: any) {
        toast.error(`Kesalahan sistem: ${err?.message || err}`);
      }
    });
  };

  const paymentLink = invoice.paymentUrl || invoice.link || `https://api.mayar.io/hl/v2/invoices/${invoice.id}`;
  // Standard online QR code image generator for instant visual scanning
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(paymentLink)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-amber-200">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 uppercase tracking-wider">
                  Mayar Sandbox
                </span>
                <span className="text-[11px] font-mono text-amber-200">
                  {transaksi.nomor_struk}
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                QRIS Dinamis Mayar
              </h2>
            </div>
          </div>

          {status !== 'menunggu_bayar' && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Isi Modal */}
        <div className="p-6 overflow-y-auto space-y-5 text-center">
          {/* Nominal Tagihan */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
            <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              Total Tagihan Pembayaran
            </div>
            <div className="text-3xl font-black text-amber-900 font-mono tracking-tight mt-1">
              {formatRupiah(transaksi.total)}
            </div>
            {invoice.invoiceCode && (
              <div className="text-xs text-stone-500 font-mono mt-1">
                Kode Invoice: <span className="font-bold text-stone-800">{invoice.invoiceCode}</span>
              </div>
            )}
          </div>

          {/* Area Aksi Pembayaran & Status */}
          {status === 'menunggu_bayar' && (
            <div className="space-y-4">
              {/* Tombol Utama Langsung Buka Laman Mayar */}
              <div className="bg-amber-500/10 border border-amber-300/60 rounded-2xl p-4 text-center space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Tab Pembayaran Mayar Terbuka Otomatis</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Silakan selesaikan pembayaran di tab Mayar. Jika tab belum terbuka, klik tombol di bawah:
                </p>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-amber-800/20 transition-all hover:scale-[1.02]"
                >
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                  <span>Buka Halaman Pembayaran Mayar</span>
                </a>
              </div>

              {/* Countdown Timer & Polling Indicator */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <div className="flex items-center gap-2 text-stone-700 bg-stone-100 py-2 px-3.5 rounded-xl border border-stone-200">
                  <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                  <span className="text-xs font-semibold">Batas Waktu:</span>
                  <span className={`text-xs font-black font-mono tracking-wider ${
                    secondsRemaining < 60 ? 'text-red-600 animate-pulse' : 'text-amber-800'
                  }`}>
                    {timeDisplay}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50/70 py-2 px-3.5 rounded-xl border border-amber-200/50">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="truncate max-w-[200px]">{statusMessage}</span>
                </div>
              </div>

              {/* Opsi QR Code Cadangan (Bila Pelanggan Ingin Scan dari HP) */}
              <div className="border border-stone-200 rounded-2xl p-3 bg-stone-50/50">
                <details className="group cursor-pointer">
                  <summary className="text-xs font-bold text-stone-600 hover:text-amber-800 flex items-center justify-center gap-1.5 list-none select-none">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Tampilkan QR Code (Scan via Kamera HP Pelanggan)</span>
                    <span className="text-[10px] text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="pt-3 pb-1 text-center space-y-2">
                    <div className="inline-block p-2.5 bg-white rounded-2xl border border-stone-200 shadow-sm">
                      <img
                        src={qrImageSrc}
                        alt="QR Pembayaran Mayar"
                        className="w-36 h-36 mx-auto rounded-lg object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Scan dengan Kamera HP / Google Lens untuk membuka invoice di HP pelanggan.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Status Sukses Lunas */}
          {status === 'lunas' && (
            <div className="py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-900">
                Pembayaran Berhasil!
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Dana pembayaran QRIS Mayar telah diterima dan diverifikasi secara real-time. Menyiapkan pencetakan struk transaksi...
              </p>
            </div>
          )}

          {/* Status Batal / Kadaluwarsa */}
          {status === 'batal' && (
            <div className="py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-red-900">
                Transaksi Dibatalkan
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                {statusMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer Tombol Aksi */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {status === 'menunggu_bayar' ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCanceling}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isCanceling ? 'Membatalkan...' : 'Batalkan Transaksi'}</span>
              </button>

              <button
                type="button"
                onClick={() => checkPaymentStatus(true)}
                disabled={isChecking}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Memeriksa...' : 'Cek Status Sekarang'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition"
            >
              Tutup Modal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
