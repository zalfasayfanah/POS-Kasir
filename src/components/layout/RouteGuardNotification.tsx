'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldAlert, X } from 'lucide-react';

export default function RouteGuardNotification() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    const denied = searchParams.get('denied');
    if (denied) {
      setDeniedMessage(denied);

      // Tampilkan toast notifikasi yang menonjol
      toast.error('Akses Halaman Ditolak', {
        description: denied,
        duration: 6000,
      });

      // Bersihkan search parameter dari URL agar address bar kembali rapi tanpa refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [searchParams, pathname]);

  if (!deniedMessage) return null;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-900 leading-tight">
              Akses Ditolak
            </h4>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              {deniedMessage}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDeniedMessage(null)}
          className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100/60 transition shrink-0"
          title="Tutup pemberitahuan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
