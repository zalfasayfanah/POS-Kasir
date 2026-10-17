'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/auth/actions';
import type { Profile } from '@/types/database';
import { 
  Coffee, 
  ShoppingCart, 
  Clock, 
  Receipt, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Building2,
  ShieldCheck,
  User
} from 'lucide-react';

interface AppNavbarProps {
  profile: Profile;
  activeShiftId?: string | null;
}

export default function AppNavbar({ profile, activeShiftId }: AppNavbarProps) {
  const pathname = usePathname();

  // Konfigurasi Navigasi berdasarkan Peran (PRD Bagian 7)
  const navItems = React.useMemo(() => {
    if (profile.peran === 'kasir') {
      return [
        { label: 'Kasir POS', href: '/kasir', icon: ShoppingCart },
        { label: 'Shift Saya', href: '/shift', icon: Clock },
        { label: 'Transaksi', href: '/transaksi', icon: Receipt },
      ];
    } else if (profile.peran === 'kepala_toko') {
      return [
        { label: 'Transaksi', href: '/transaksi', icon: Receipt },
        { label: 'Stok Cabang', href: '/stok', icon: Package },
        { label: 'Shift Cabang', href: '/shift-cabang', icon: Users },
        { label: 'Katalog Produk', href: '/produk', icon: Coffee },
        { label: 'Laporan', href: '/laporan', icon: BarChart3 },
      ];
    } else {
      // Owner
      return [
        { label: 'Laporan & Laba', href: '/laporan', icon: BarChart3 },
        { label: 'Transaksi', href: '/transaksi', icon: Receipt },
        { label: 'Stok Cabang', href: '/stok', icon: Package },
        { label: 'Shift Cabang', href: '/shift-cabang', icon: Users },
        { label: 'Produk & Modal', href: '/produk', icon: Coffee },
        { label: 'Pengaturan', href: '/pengaturan', icon: Settings },
      ];
    }
  }, [profile.peran]);

  // Badge Peran
  const roleBadge = {
    owner: { text: 'Owner', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    kepala_toko: { text: 'Kepala Toko', class: 'bg-amber-100 text-amber-800 border-amber-300' },
    kasir: { text: 'Kasir', class: 'bg-blue-100 text-blue-800 border-blue-300' },
  }[profile.peran];

  return (
    <header className="sticky top-0 z-50 w-full bg-stone-900/95 backdrop-blur-md text-white shadow-md border-b border-stone-800">
      {/* Top Bar: Brand, User Info, Shift Badge, Logout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-950/40 group-hover:bg-amber-500 transition">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">
                Lumbung Kopi dan Roti
              </span>
              <span className="text-[11px] text-stone-400 block leading-tight font-medium">
                POS Kasir Multi-Cabang
              </span>
            </div>
          </Link>

          {/* User Profile & Branch Info */}
          <div className="flex items-center gap-3">
            {/* Cabang Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/80 border border-stone-700 text-stone-300 text-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {profile.cabang ? `${profile.cabang.nama} (${profile.cabang.kode})` : 'Pusat (Semua Cabang)'}
              </span>
            </div>

            {/* Shift Status for Cashier */}
            {profile.peran === 'kasir' && (
              activeShiftId ? (
                <Link
                  href="/shift"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60 transition"
                  title="Lihat status shift aktif"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Shift Aktif</span>
                </Link>
              ) : (
                <Link
                  href="/shift"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-amber-950/60 border-amber-600 text-amber-300 hover:bg-amber-900/60 transition"
                  title="Klik untuk membuka shift kasir baru"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buka Shift</span>
                </Link>
              )
            )}

            {/* Profile Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-700">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-white leading-tight">
                  {profile.nama_lengkap}
                </p>
                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border mt-0.5 ${roleBadge.class}`}>
                  {roleBadge.text}
                </span>
              </div>

              {/* Logout Button */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  title="Keluar dari Akun"
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition border border-transparent hover:border-stone-700"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-stone-950/80 border-t border-stone-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-900/40'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
