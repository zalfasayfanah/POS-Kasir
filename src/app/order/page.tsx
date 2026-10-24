import React from 'react';
import { getPublicCabangAndMenu } from '@/app/actions/self-service';
import CustomerMenuClient from '@/components/order/CustomerMenuClient';
import { Coffee, AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Menu Self-Service · Lumbung Kopi & Roti',
  description: 'Pesan menu cafe langsung dari meja Anda dengan pembayaran QRIS praktis.',
};

interface OrderPageProps {
  searchParams: Promise<{
    cabang?: string;
    meja?: string;
  }>;
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
  const cabangParam = params.cabang;
  const mejaParam = params.meja;

  const result = await getPublicCabangAndMenu(cabangParam);

  if (!result.success || !result.cabang || !result.products) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-lg border border-stone-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Coffee className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-stone-900 text-base">Lumbung Kopi & Roti</h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            {result.error || 'Menu tidak dapat dimuat saat ini. Silakan hubungi kasir atau staf cafe.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <CustomerMenuClient
      initialCabang={result.cabang}
      allCabangs={result.cabangs || [result.cabang]}
      initialProducts={result.products}
      initialStockMap={result.branchStockMap || {}}
      initialTableParam={mejaParam}
      isOpen={result.isOpen ?? true}
    />
  );
}
