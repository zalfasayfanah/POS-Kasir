'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { Profile, ShiftKasir, Produk, MetodeBayar, Transaksi } from '@/types/database';
import ProductCard from './ProductCard';
import CartPanel, { type CartItem, type TipePembayaran } from './CartPanel';
import ThermalReceipt from './ThermalReceipt';
import MayarQrisModal from './MayarQrisModal';
import { prosesTransaksiAction } from '@/app/actions/pos';
import { buatTransaksiMayarAction } from '@/app/actions/mayar';
import { toast } from 'sonner';
import { 
  Search, 
  X, 
  Coffee, 
  Sparkles, 
  Filter, 
  PackageCheck,
  ShoppingBag,
  Store,
  Clock,
  UserCheck
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';

interface PosClientProps {
  profile: Profile;
  activeShift: ShiftKasir;
  products: Produk[];
  branchStockMap: Record<string, number>;
  stockMinMap: Record<string, number>;
}

export default function PosClient({
  profile,
  activeShift,
  products,
  branchStockMap,
  stockMinMap,
}: PosClientProps) {
  // State Filter & Pencarian
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State Keranjang Belanja
  const [cart, setCart] = useState<CartItem[]>([]);
  const [diskon, setDiskon] = useState<number>(0);
  const [alasanDiskon, setAlasanDiskon] = useState<string>('');
  const [metodeBayar, setMetodeBayar] = useState<TipePembayaran>('tunai');
  const [uangDiterima, setUangDiterima] = useState<number>(0);

  // State Modal Struk & Modal Mayar QRIS
  const [activeReceipt, setActiveReceipt] = useState<Transaksi | null>(null);
  const [pendingMayar, setPendingMayar] = useState<{ transaksi: Transaksi; invoice: any } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Kategori Menu Tabs
  const categories = [
    { key: 'semua', label: 'Semua Menu' },
    { key: 'kopi', label: 'Kopi' },
    { key: 'non_kopi', label: 'Non Kopi' },
    { key: 'roti', label: 'Roti & Bakery' },
    { key: 'snack', label: 'Snack' },
    { key: 'kemasan', label: 'Kemasan' },
  ];

  // Filter Produk Berdasarkan Kategori & Query Pencarian
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCategory =
        selectedCategory === 'semua' || prod.kategori === selectedCategory;
      const matchSearch =
        searchQuery.trim().length === 0 ||
        prod.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Tambah Produk ke Keranjang (Validasi Stok di Sisi Client)
  const handleAddToCart = (produk: Produk) => {
    const stokTersedia = produk.lacak_stok ? (branchStockMap[produk.id] ?? 0) : null;

    if (produk.lacak_stok && stokTersedia !== null && stokTersedia <= 0) {
      toast.error(`Stok "${produk.nama}" di cabang ini habis (0 unit).`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.produk.id === produk.id);
      if (existing) {
        if (produk.lacak_stok && stokTersedia !== null && existing.jumlah >= stokTersedia) {
          toast.warning(`Maksimal pesanan "${produk.nama}" tercapai (${stokTersedia} unit).`);
          return prevCart;
        }
        if (existing.jumlah >= 99) {
          toast.warning('Maksimal pemesanan per item adalah 99 unit (BR-05).');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.produk.id === produk.id
            ? { ...item, jumlah: item.jumlah + 1 }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            produk,
            jumlah: 1,
            stokTersedia,
          },
        ];
      }
    });

    toast.success(`"${produk.nama}" ditambahkan ke keranjang`, { duration: 1500 });
  };

  // Update Quantity Item
  const handleUpdateQty = (produkId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(produkId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.produk.id === produkId) {
          if (
            item.produk.lacak_stok &&
            item.stokTersedia !== null &&
            newQty > item.stokTersedia
          ) {
            toast.warning(`Stok terbatas! Tersedia: ${item.stokTersedia} unit.`);
            return { ...item, jumlah: item.stokTersedia };
          }
          if (newQty > 99) {
            toast.warning('Maksimal 99 unit per item (BR-05).');
            return { ...item, jumlah: 99 };
          }
          return { ...item, jumlah: newQty };
        }
        return item;
      })
    );
  };

  // Hapus 1 Item dari Keranjang
  const handleRemoveItem = (produkId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.produk.id !== produkId));
  };

  // Reset Keranjang
  const handleClearCart = () => {
    setCart([]);
    setDiskon(0);
    setAlasanDiskon('');
    setUangDiterima(0);
  };

  // Eksekusi Checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong.');
      return;
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.produk.harga_jual * item.jumlah,
      0
    );
    const total = Math.max(0, subtotal - diskon);

    // Validasi Pembayaran
    if (metodeBayar === 'tunai' && uangDiterima < total) {
      toast.error(`Uang tunai diterima kurang dari total tagihan (BR-07).`);
      return;
    }

    if (diskon > 0 && (!alasanDiskon || alasanDiskon.trim().length === 0)) {
      toast.error('Alasan diskon wajib diisi (BR-06).');
      return;
    }

    const kembalian = (metodeBayar === 'qris' || metodeBayar === 'qris_mayar') ? 0 : Math.max(0, uangDiterima - total);

    startTransition(async () => {
      try {
        const payload = {
          shift_id: activeShift.id,
          subtotal,
          diskon,
          alasan_diskon: diskon > 0 ? alasanDiskon.trim() : null,
          total,
          metode_bayar: (metodeBayar === 'qris_mayar' ? 'qris' : metodeBayar) as MetodeBayar,
          uang_diterima: (metodeBayar === 'qris' || metodeBayar === 'qris_mayar') ? total : uangDiterima,
          kembalian,
          items: cart.map((i) => ({
            produk_id: i.produk.id,
            jumlah: i.jumlah,
          })),
        };

        // Jika metode QRIS Dinamis Mayar (Fase 8 - PRD Bagian 11)
        if (metodeBayar === 'qris_mayar') {
          const res = await buatTransaksiMayarAction(payload);
          if (!res.success || !res.transaksi || !res.invoice) {
            toast.error(res.error || 'Gagal membuat tagihan QRIS Mayar.');
            return;
          }

          toast.success(res.message || 'Tagihan QRIS Mayar berhasil dibuat!');
          
          // Otomatis buka link pembayaran Mayar di tab baru agar langsung ke laman bayar
          const payUrl = res.invoice.paymentUrl || res.invoice.link;
          if (payUrl && typeof window !== 'undefined') {
            try {
              window.open(payUrl, '_blank');
            } catch (e) {
              console.warn('Popup blocked or failed to open:', e);
            }
          }

          setPendingMayar({
            transaksi: res.transaksi,
            invoice: res.invoice,
          });
          return;
        }

        // Metode Standar (Tunai & QRIS Manual)
        const res = await prosesTransaksiAction(payload);

        if (!res.success) {
          toast.error(res.error || 'Gagal menyimpan transaksi.');
          return;
        }

        toast.success(res.message || 'Transaksi berhasil disimpan!');
        
        // Tampilkan Struk
        if (res.transaksi) {
          setActiveReceipt(res.transaksi);
        }

        // Reset keranjang
        handleClearCart();
      } catch (err: any) {
        toast.error(`Terjadi kesalahan sistem: ${err?.message || err}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info Baris POS (Identitas Cabang, Kasir, dan Shift Aktif) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Shift Aktif Berjalan · Kasir POS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <span>{profile?.cabang?.nama || 'Cabang Lumbung Kopi'}</span>
            <span className="text-stone-300 font-light">|</span>
            <span className="text-amber-800 font-medium text-lg">
              {profile?.nama_lengkap}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-stone-400 font-medium">Modal Awal Laci</p>
            <p className="text-sm font-bold font-mono text-stone-800">
              {formatRupiah(activeShift.kas_awal)}
            </p>
          </div>

          <Link
            href="/shift"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition shadow-xs"
          >
            <Clock className="w-4 h-4 text-stone-500" />
            <span>Shift & Laci Kas</span>
          </Link>
        </div>
      </div>

      {/* Main Split-Screen Layout (≥ 1024px tablet / desktop responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri (Katalog Produk & Filter) - Lebar 7 kolom desktop / 60% */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Baris Pencarian & Kategori */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu kopi, roti, atau SKU produk..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (Touch-friendly >= 44px height) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    selectedCategory === cat.key
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-950/10'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid Kartu Produk */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
              <Coffee className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-semibold text-stone-600">Tidak ada produk ditemukan</p>
              <p className="text-xs text-stone-400">
                Coba sesuaikan kata kunci pencarian atau ganti filter kategori.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredProducts.map((prod) => {
                const itemInCart = cart.find((i) => i.produk.id === prod.id);
                return (
                  <ProductCard
                    key={prod.id}
                    produk={prod}
                    stokCabang={prod.lacak_stok ? (branchStockMap[prod.id] ?? 0) : null}
                    stokMinimum={stockMinMap[prod.id] ?? 5}
                    qtyInCart={itemInCart ? itemInCart.jumlah : 0}
                    onAddToCart={handleAddToCart}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan (Sticky Keranjang Belanja & Panel Pembayaran) - Lebar 5 kolom desktop / 40% */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
          <CartPanel
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            diskon={diskon}
            onDiskonChange={setDiskon}
            alasanDiskon={alasanDiskon}
            onAlasanDiskonChange={setAlasanDiskon}
            metodeBayar={metodeBayar}
            onMetodeBayarChange={setMetodeBayar}
            uangDiterima={uangDiterima}
            onUangDiterimaChange={setUangDiterima}
            onCheckout={handleCheckout}
            isSubmitting={isPending}
          />
        </div>
      </div>

      {/* Modal QRIS Dinamis Mayar Sandbox */}
      {pendingMayar && (
        <MayarQrisModal
          transaksi={pendingMayar.transaksi}
          invoice={pendingMayar.invoice}
          onPaymentSuccess={(paidTrx) => {
            setPendingMayar(null);
            setActiveReceipt(paidTrx);
            handleClearCart();
          }}
          onClose={() => {
            setPendingMayar(null);
          }}
        />
      )}

      {/* Modal Struk Siap Cetak (Thermal 58mm) */}
      {activeReceipt && (
        <ThermalReceipt
          transaksi={activeReceipt}
          onClose={() => setActiveReceipt(null)}
          onNewTransaction={() => {
            setActiveReceipt(null);
            handleClearCart();
          }}
        />
      )}
    </div>
  );
}
