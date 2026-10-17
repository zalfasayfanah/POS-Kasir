import React from 'react';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { ShoppingCart, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function KasirPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <ShoppingCart className="w-4 h-4" />
            Halaman Kasir POS (US-02, US-03)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Penjualan Kasir · Cabang {profile?.cabang?.nama || 'Tebet'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Petugas bertugas: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span> ({profile?.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/shift"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold transition"
          >
            <Clock className="w-4 h-4" />
            Kelola Shift Kasir
          </Link>
        </div>
      </div>

      {/* Info Card: Fase 2 Siap */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-bold">Fase 2: Autentikasi & Route Guard Berhasil Aktif!</h2>
            <p className="text-sm text-amber-800 leading-relaxed">
              Anda berhasil login sebagai <strong>{profile?.nama_lengkap}</strong> dengan peran{' '}
              <span className="font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                {profile?.peran}
              </span>
              . Sistem secara otomatis mengarahkan Anda ke rute kasir ini.
            </p>
            <p className="text-xs text-amber-700">
              📌 <strong>Langkah Berikutnya (Fase 3 & 4):</strong> Membuka shift kasir dengan kas awal (BR-02), menampilkan kartu produk kopi & roti, keranjang belanja tablet-ready, diskon (BR-06), dan cetak struk berurutan (BR-04).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
