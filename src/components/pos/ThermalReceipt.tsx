'use client';

import React from 'react';
import type { Transaksi } from '@/types/database';
import { formatRupiah, formatDateWIB } from '@/lib/utils';
import { Printer, X, CheckCircle2, ShoppingBag } from 'lucide-react';

interface ThermalReceiptProps {
  transaksi: Transaksi;
  onClose: () => void;
  onNewTransaction?: () => void;
}

export default function ThermalReceipt({
  transaksi,
  onClose,
  onNewTransaction,
}: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    if (onNewTransaction) {
      onNewTransaction();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Transaksi Berhasil!</h3>
              <p className="text-[11px] text-emerald-100 font-mono">
                {transaksi.nomor_struk}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-emerald-700/50 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Wrapper (Scrollable for preview) */}
        <div className="p-6 overflow-y-auto bg-stone-100/60 flex justify-center">
          {/* Thermal Receipt Paper (58mm aesthetic, monochrome, font-mono) */}
          <div
            id="thermal-receipt"
            className="w-[280px] sm:w-[300px] bg-white p-5 shadow-sm border border-stone-200 text-stone-900 font-mono text-[11px] leading-relaxed"
          >
            {/* Header Kedai */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="text-sm font-black tracking-wider uppercase text-stone-950">
                Lumbung Kopi & Roti
              </h2>
              <p className="text-[10px] text-stone-600 font-sans">
                Artisanal Coffee & Fresh Bakery
              </p>
              <p className="text-[10px] text-stone-700">
                Cabang: {transaksi.cabang?.nama || 'Pusat'}
              </p>
              {transaksi.cabang?.alamat && (
                <p className="text-[9px] text-stone-500 leading-tight">
                  {transaksi.cabang.alamat}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-stone-400 my-2" />

            {/* Meta Transaksi */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-stone-500">No. Struk:</span>
                <span className="font-bold text-stone-900">{transaksi.nomor_struk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tanggal:</span>
                <span>{formatDateWIB(transaksi.dibuat_pada)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Kasir:</span>
                <span>{transaksi.kasir?.nama_lengkap || 'Kasir'}</span>
              </div>
              {transaksi.nama_pelanggan && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Pelanggan:</span>
                  <span className="font-semibold text-stone-900">{transaksi.nama_pelanggan}</span>
                </div>
              )}
              {transaksi.nomor_meja && (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">No. Meja:</span>
                  <span className="font-black text-amber-950 bg-amber-100/80 px-1.5 py-0.2 rounded text-[10.5px]">
                    {transaksi.nomor_meja}
                  </span>
                </div>
              )}
              {transaksi.sumber_pesanan === 'self_service' && (
                <div className="text-center pt-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
                    ★ Pesanan Meja (Self-Service)
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-stone-400 my-2" />

            {/* Daftar Produk Belanja */}
            <div className="space-y-2 my-2">
              {transaksi.items && transaksi.items.length > 0 ? (
                transaksi.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-stone-900">{item.nama_produk}</div>
                    <div className="flex justify-between text-[10px] text-stone-600">
                      <span>
                        {item.jumlah} x {formatRupiah(item.harga_satuan)}
                      </span>
                      <span className="font-bold text-stone-900">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-stone-400 italic">Item tidak terbaca</p>
              )}
            </div>

            <div className="border-t border-dashed border-stone-400 my-2" />

            {/* Rincian Finansial */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-stone-600">Subtotal:</span>
                <span className="font-medium">{formatRupiah(transaksi.subtotal)}</span>
              </div>

              {transaksi.diskon > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>
                    Diskon {transaksi.alasan_diskon ? `(${transaksi.alasan_diskon})` : ''}:
                  </span>
                  <span>-{formatRupiah(transaksi.diskon)}</span>
                </div>
              )}

              <div className="border-t border-stone-900 my-1 pt-1 flex justify-between text-xs font-black text-stone-950">
                <span>TOTAL AKHIR:</span>
                <span>{formatRupiah(transaksi.total)}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-stone-600">Metode Bayar:</span>
                <span className="uppercase font-bold">
                  {transaksi.metode_bayar === 'tunai' ? 'Tunai' : 'QRIS Manual'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-600">Uang Diterima:</span>
                <span>{formatRupiah(transaksi.uang_diterima)}</span>
              </div>

              <div className="flex justify-between font-bold text-stone-900">
                <span>Kembalian:</span>
                <span>{formatRupiah(transaksi.kembalian)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-stone-400 my-3" />

            {/* Footer Struk */}
            <div className="text-center space-y-1 text-[9px] text-stone-500">
              <p className="font-medium text-stone-700">
                Terima kasih atas kunjungan Anda!
              </p>
              <p>Simpan struk ini sebagai bukti transaksi sah.</p>
              <p className="text-stone-400">Instagram: @lumbungkopi · WiFi: LumbungKopi</p>
              <div className="mt-2 text-stone-300 text-[8px] font-mono tracking-widest uppercase">
                *** LUNAS ***
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-bold shadow flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak Struk (58mm)</span>
          </button>

          <button
            type="button"
            onClick={handleDone}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold shadow flex items-center justify-center gap-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
