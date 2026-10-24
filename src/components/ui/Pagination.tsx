'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`px-4 sm:px-6 py-3.5 bg-stone-50/80 border-t border-stone-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 ${className}`}
    >
      {/* Informasi Posisi Data */}
      <div className="font-medium text-stone-500">
        Menampilkan{' '}
        <span className="font-bold text-stone-800 font-mono">{from}</span>–
        <span className="font-bold text-stone-800 font-mono">{to}</span> dari{' '}
        <span className="font-bold text-stone-900 font-mono">{totalItems}</span>{' '}
        data{' '}
        {totalPages > 1 && (
          <span className="text-stone-400">
            (Hal. <span className="font-bold text-stone-700">{currentPage}</span> / {totalPages})
          </span>
        )}
      </div>

      {/* Kontrol Navigasi Slide / Halaman */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 select-none">
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Halaman Sebelumnya"
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white text-stone-700 font-medium inline-flex items-center gap-1 transition shadow-2xs text-xs disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Nomor-nomor Halaman */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-stone-400 font-bold"
                  >
                    …
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Tombol Berikutnya */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Halaman Berikutnya"
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white text-stone-700 font-medium inline-flex items-center gap-1 transition shadow-2xs text-xs disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
