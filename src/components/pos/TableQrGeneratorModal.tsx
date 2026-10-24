'use client';

import React, { useState, useMemo } from 'react';
import type { Cabang } from '@/types/database';
import { 
  QrCode, 
  Printer, 
  X, 
  Coffee, 
  Sparkles, 
  Layers, 
  Check, 
  Settings2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface TableQrGeneratorModalProps {
  currentCabang: Cabang;
  onClose: () => void;
}

export default function TableQrGeneratorModal({
  currentCabang,
  onClose,
}: TableQrGeneratorModalProps) {
  const [startTable, setStartTable] = useState<number>(1);
  const [endTable, setEndTable] = useState<number>(12);
  const [customTableNames, setCustomTableNames] = useState<string>('');
  const [mode, setMode] = useState<'range' | 'custom'>('range');

  // Dapatkan hostname aplikasi (localhost atau domain live)
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Daftar nomor meja yang akan digenerate
  const tablesList = useMemo(() => {
    if (mode === 'range') {
      const list: string[] = [];
      const s = Math.max(1, startTable);
      const e = Math.max(s, Math.min(100, endTable));
      for (let i = s; i <= e; i++) {
        list.push(i.toString().padStart(2, '0'));
      }
      return list;
    } else {
      return customTableNames
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
  }, [mode, startTable, endTable, customTableNames]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal (Tidak Ikut Ter-print) */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-600 text-white shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Generator & Cetak QR Meja</h3>
              <p className="text-xs text-stone-300">
                Cabang: {currentCabang.nama} ({currentCabang.kode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={tablesList.length === 0}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {tablesList.length} Kartu QR</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-stone-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pengaturan Meja (Tidak Ikut Ter-print) */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 shrink-0 print:hidden space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-700">
              <Settings2 className="w-4 h-4 text-amber-700" />
              <span>Atur Nomor Meja:</span>
              <div className="flex items-center bg-stone-200/80 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('range')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    mode === 'range' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                  }`}
                >
                  Rentang Angka
                </button>
                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    mode === 'custom' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                  }`}
                >
                  Custom Nama
                </button>
              </div>
            </div>

            <span className="text-[11px] text-stone-500 font-mono">
              Total {tablesList.length} kartu meja siap dicetak
            </span>
          </div>

          {mode === 'range' ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-600 font-medium">Dari Meja:</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={startTable}
                  onChange={(e) => setStartTable(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 rounded-lg border border-stone-300 bg-white font-mono font-bold text-center"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-600 font-medium">Sampai Meja:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={endTable}
                  onChange={(e) => setEndTable(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 rounded-lg border border-stone-300 bg-white font-mono font-bold text-center"
                />
              </div>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={customTableNames}
                onChange={(e) => setCustomTableNames(e.target.value)}
                placeholder="Pisahkan dengan koma, contoh: 01, 02, 03, VIP-1, Teras-A"
                className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900"
              />
            </div>
          )}
        </div>

        {/* Area Kartu Meja (Scrollable Preview di Layar & Clean Saat Print) */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-100/60 print:bg-white print:p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4 print:m-0">
            {tablesList.map((meja) => {
              const orderUrl = `${appOrigin}/order?cabang=${currentCabang.kode}&meja=${meja}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                orderUrl
              )}`;

              return (
                <div
                  key={meja}
                  className="bg-white rounded-3xl p-5 shadow-sm border-2 border-dashed border-stone-300 flex flex-col items-center justify-between text-center space-y-3.5 print:border-2 print:border-stone-800 print:rounded-2xl print:shadow-none print:break-inside-avoid print:p-4"
                >
                  {/* Brand Header */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-amber-900 font-black text-xs tracking-wider uppercase">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lumbung Kopi & Roti</span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-medium font-sans">
                      Cabang {currentCabang.nama}
                    </p>
                  </div>

                  {/* Table Badge Number */}
                  <div className="w-full py-1.5 px-3 bg-amber-800 text-white rounded-xl shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest block opacity-90">
                      NOMOR MEJA
                    </span>
                    <span className="text-2xl font-black font-mono tracking-tight block">
                      {meja}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-2xs">
                    <img
                      src={qrImageUrl}
                      alt={`QR Meja ${meja}`}
                      className="w-36 h-36 object-contain"
                    />
                  </div>

                  {/* Instruction Footer */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold text-stone-900 leading-tight">
                      SCAN UNTUK PESAN & BAYAR
                    </p>
                    <p className="text-[9.5px] text-stone-500 leading-tight">
                      1. Scan QR via Kamera HP · 2. Pilih Menu · 3. Bayar via QRIS
                    </p>
                  </div>

                  {/* QRIS Logo standard footer */}
                  <div className="pt-1 border-t border-stone-200/60 w-full text-[8.5px] font-mono text-stone-400 uppercase tracking-widest">
                    Pembayaran Resmi via QRIS
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
