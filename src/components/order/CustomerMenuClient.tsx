'use client';

import React, { useState, useMemo } from 'react';
import type { Cabang, Produk, Transaksi } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { 
  Coffee, 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Sparkles, 
  Clock, 
  Store, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import CustomerCartDrawer, { CustomerCartItem } from './CustomerCartDrawer';
import CustomerQrisModal from './CustomerQrisModal';
import { buatPesananSelfServiceAction } from '@/app/actions/self-service';
import { toast } from 'sonner';

interface CustomerMenuClientProps {
  initialCabang: Cabang;
  allCabangs: Cabang[];
  initialProducts: Produk[];
  initialStockMap: Record<string, number>;
  initialTableParam?: string;
  isOpen: boolean;
}

export default function CustomerMenuClient({
  initialCabang,
  allCabangs,
  initialProducts,
  initialStockMap,
  initialTableParam,
  isOpen,
}: CustomerMenuClientProps) {
  // State Identitas Meja & Pelanggan
  const [selectedCabang, setSelectedCabang] = useState<Cabang>(initialCabang);
  const [nomorMeja, setNomorMeja] = useState<string>(initialTableParam || '01');
  const [namaPelanggan, setNamaPelanggan] = useState<string>('');
  const [catatanPesanan, setCatatanPesanan] = useState<string>('');

  // State Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State Keranjang Belanja
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State Modal QRIS Mayar
  const [activeQrisData, setActiveQrisData] = useState<{
    transaksiId: string;
    nomorStruk: string;
    total: number;
    invoice: any;
  } | null>(null);

  const categories = [
    { key: 'semua', label: 'Semua Menu' },
    { key: 'kopi', label: '☕ Kopi' },
    { key: 'non_kopi', label: '🍵 Non Kopi' },
    { key: 'roti', label: '🥐 Roti & Pastry' },
    { key: 'snack', label: '🍪 Snack' },
    { key: 'kemasan', label: '📦 Kemasan' },
  ];

  // Filter Produk
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((prod) => {
      const matchCategory =
        selectedCategory === 'semua' || prod.kategori === selectedCategory;
      const matchSearch =
        searchQuery.trim().length === 0 ||
        prod.nama.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [initialProducts, selectedCategory, searchQuery]);

  // Total Quantity di Keranjang
  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.jumlah, 0);
  }, [cart]);

  // Total Belanja di Keranjang
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produk.harga_jual * item.jumlah, 0);
  }, [cart]);

  // Tambah Produk ke Keranjang
  const handleAddToCart = (produk: Produk) => {
    if (!isOpen) {
      toast.error('Cafe sedang tidak menerima pesanan meja.');
      return;
    }

    const currentStock = produk.lacak_stok
      ? (initialStockMap[produk.id] ?? 0)
      : 99;

    if (produk.lacak_stok && currentStock <= 0) {
      toast.error(`Stok "${produk.nama}" habis.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.produk.id === produk.id);
      if (existing) {
        if (existing.jumlah >= currentStock) {
          toast.warning(`Maksimal stok tercapai (${currentStock} unit).`);
          return prev;
        }
        return prev.map((item) =>
          item.produk.id === produk.id ? { ...item, jumlah: item.jumlah + 1 } : item
        );
      } else {
        return [...prev, { produk, jumlah: 1 }];
      }
    });

    toast.success(`"${produk.nama}" ditambahkan`, { duration: 1200 });
  };

  const handleUpdateQty = (produkId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(produkId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.produk.id === produkId ? { ...item, jumlah: newQty } : item))
    );
  };

  const handleRemoveItem = (produkId: string) => {
    setCart((prev) => prev.filter((item) => item.produk.id !== produkId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Submit Pesanan & Generate QRIS Mayar
  const handleCheckout = async () => {
    if (!isOpen) {
      toast.error('Cafe sedang tidak menerima pesanan meja saat ini.');
      return;
    }

    if (!nomorMeja.trim()) {
      toast.error('Nomor meja wajib diisi.');
      return;
    }

    if (!namaPelanggan.trim()) {
      toast.error('Nama pemesan wajib diisi.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await buatPesananSelfServiceAction({
        cabang_id: selectedCabang.id,
        nomor_meja: nomorMeja.trim(),
        nama_pelanggan: namaPelanggan.trim(),
        catatan: catatanPesanan.trim() || null,
        items: cart.map((i) => ({
          produk_id: i.produk.id,
          jumlah: i.jumlah,
        })),
      });

      if (!res.success || !res.transaksiId || !res.invoice) {
        toast.error(res.error || 'Gagal memproses pesanan.');
        return;
      }

      toast.success(res.message || 'Tagihan QRIS berhasil dibuat!');
      setIsDrawerOpen(false);

      // Buka modal pembayaran QRIS
      setActiveQrisData({
        transaksiId: res.transaksiId,
        nomorStruk: res.nomorStruk || '-',
        total: res.total || subtotal,
        invoice: res.invoice,
      });
    } catch (err: any) {
      toast.error(`Terjadi kendala: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-28 text-stone-900 font-sans">
      {/* Top Header Cafe Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3.5 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-amber-100 flex items-center justify-center font-black shadow-sm shrink-0">
              <Coffee className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-stone-950 text-sm sm:text-base leading-tight truncate">
                  Lumbung Kopi & Roti
                </h1>
              </div>
              <p className="text-[11px] text-stone-500 font-medium truncate">
                {selectedCabang.nama} · Self-Service Order
              </p>
            </div>
          </div>

          {/* Badge Meja */}
          <div className="shrink-0 flex items-center gap-1.5 bg-amber-50 border border-amber-200/90 px-3 py-1.5 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Meja</span>
            <span className="font-mono font-black text-amber-950 text-xs sm:text-sm">
              {nomorMeja || '-'}
            </span>
          </div>
        </div>
      </header>

      {/* Status Toko Warning jika shift belum dibuka */}
      {!isOpen && (
        <div className="max-w-xl mx-auto px-4 pt-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Cafe belum buka / Kasir belum standby:</strong> Anda dapat melihat menu, namun pesanan meja baru dapat dibuat saat kasir membuka shift.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 pt-3 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kopi, roti, snack..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-2xs transition"
          />
        </div>

        {/* Category Horizontal Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.key
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid Katalog Menu */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {filteredProducts.map((prod) => {
            const stock = prod.lacak_stok ? (initialStockMap[prod.id] ?? 0) : null;
            const isOutOfStock = prod.lacak_stok && stock !== null && stock <= 0;
            const itemInCart = cart.find((i) => i.produk.id === prod.id);

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-3xl border border-stone-200/90 p-3 flex flex-col justify-between shadow-2xs transition hover:shadow-sm ${
                  isOutOfStock ? 'opacity-65' : ''
                }`}
              >
                <div className="space-y-1.5">
                  {/* Category Pill & Stock Status */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-400">
                      {prod.kategori.replace('_', ' ')}
                    </span>
                    {prod.lacak_stok && (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : (stock ?? 0) <= 5
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isOutOfStock ? 'Habis' : `Sisa ${stock}`}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm line-clamp-2">
                    {prod.nama}
                  </h3>
                </div>

                {/* Price & Action Row */}
                <div className="pt-3 flex items-center justify-between gap-2 border-t border-stone-100 mt-2">
                  <span className="font-mono font-black text-xs sm:text-sm text-stone-900">
                    {formatRupiah(prod.harga_jual)}
                  </span>

                  {itemInCart ? (
                    <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-300 rounded-xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(prod.id, itemInCart.jumlah - 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-amber-900 hover:bg-amber-200 active:scale-95 transition"
                        title="Kurangi"
                      >
                        <Minus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="w-4 text-center font-bold text-xs font-mono text-amber-950">
                        {itemInCart.jumlah}
                      </span>
                      <button
                        type="button"
                        disabled={
                          prod.lacak_stok &&
                          stock !== null &&
                          itemInCart.jumlah >= stock
                        }
                        onClick={() => handleUpdateQty(prod.id, itemInCart.jumlah + 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-amber-900 hover:bg-amber-200 active:scale-95 transition disabled:opacity-30"
                        title="Tambah"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isOutOfStock || !isOpen}
                      onClick={() => handleAddToCart(prod)}
                      aria-label={`Tambah ${prod.nama}`}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition shrink-0 ${
                        isOutOfStock || !isOpen
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-white shadow-xs active:scale-90'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-30 px-4">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-full bg-stone-950 text-white rounded-3xl p-3.5 shadow-2xl flex items-center justify-between border border-stone-800 active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-600 flex items-center justify-center font-bold text-xs text-white">
                  {totalItemCount}
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-stone-300 font-medium">Meja {nomorMeja} · {cart.length} menu</p>
                  <p className="font-mono font-black text-sm text-white">
                    {formatRupiah(subtotal)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 px-3.5 py-2 rounded-2xl font-bold text-xs shadow-sm transition">
                <span>Lihat Pesanan</span>
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Drawer Rincian Pesanan */}
      <CustomerCartDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cart={cart}
        branchStockMap={initialStockMap}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        nomorMeja={nomorMeja}
        onNomorMejaChange={setNomorMeja}
        namaPelanggan={namaPelanggan}
        onNamaPelangganChange={setNamaPelanggan}
        catatanPesanan={catatanPesanan}
        onCatatanPesananChange={setCatatanPesanan}
        onCheckout={handleCheckout}
        isSubmitting={isSubmitting}
      />

      {/* Modal QRIS Mayar Pelanggan */}
      {activeQrisData && (
        <CustomerQrisModal
          transaksiId={activeQrisData.transaksiId}
          nomorStruk={activeQrisData.nomorStruk}
          nomorMeja={nomorMeja}
          namaPelanggan={namaPelanggan}
          total={activeQrisData.total}
          invoice={activeQrisData.invoice}
          onSuccess={(trx) => {
            // Bersihkan keranjang saat pesanan berhasil lunas
            handleClearCart();
          }}
          onClose={() => {
            setActiveQrisData(null);
          }}
        />
      )}
    </div>
  );
}
