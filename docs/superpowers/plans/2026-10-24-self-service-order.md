# Self-Service Table Order & QRIS Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fitur Self-Service Ordering berbasis QR Code Meja & Pembayaran QRIS Mayar di mana pelanggan cafe dapat scan QR meja, memilih menu, dan membayar langsung dari HP, serta pesanan otomatis masuk secara realtime ke sistem POS Kasir tanpa halaman barista terpisah.

**Architecture:**
- **Database Layer:** Tambah kolom `nomor_meja`, `nama_pelanggan`, dan `sumber_pesanan` di `transaksi`. Perbarui RPC `create_transaksi_atomic` dengan dukungan default arguments agar 100% backward-compatible dengan kode lama.
- **Customer UI (`/order`):** Halaman publik responsif mobile untuk pelanggan. Membaca `?cabang=[id/kode]&meja=[nomor]`. Memuat katalog produk & stok cabang secara publik, keranjang belanja, integrasi checkout Mayar QRIS dinamis, dan layar status pesanan lunas.
- **Kasir POS UI:** Form input `Nomor Meja` dan `Nama Pelanggan` di `CartPanel.tsx`, cetak identitas meja di `ThermalReceipt.tsx`, notifikasi audio & visual realtime untuk pesanan self-service yang baru masuk, serta generator cetak stiker/kartu QR Meja.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL, RLS, Realtime), Mayar Sandbox API v2, Tailwind CSS v4, Lucide Icons, Sonner.

**Spec:** Diskusi kebutuhan self-service order meja cafe via QR code & QRIS Mayar, semua pesanan masuk ke kasir yang sudah ada, dikerjakan di branch lokal `feature/self-service-order`.

---

## Global Constraints
- Kode dikerjakan sepenuhnya di branch `feature/self-service-order` di lokal (`localhost:3000`).
- Tidak membuat antarmuka (UI) terpisah untuk barista; semua pesanan masuk ke sistem Kasir yang sudah ada.
- Perubahan database harus *backward-compatible* (kolom bersifat nullable/default) sehingga tidak merusak sistem POS di cabang live.
- Validasi stok produk (anti-minus) dan shift aktif tetap dipatuhi sesuai BR-02 dan BR-03.

---

## Review Focus
1. **Fallback Meja:** Pelanggan scan QR tanpa query parameter meja (`/order?cabang=PST`) -> form harus menyediakan input manual nomor meja dengan validasi wajib diisi sebelum bayar.
2. **Shift Kasir Tutup saat Pelanggan Pesan:** Jika cafe belum membuka shift kasir di cabang tersebut -> sistem self-service harus ramah memberi tahu "Cafe belum buka / pesanan meja belum aktif" sebelum pelanggan bayar.
3. **Pembayaran Gagal / Expired:** Invoice QRIS Mayar kadaluarsa atau dibatalkan pelanggan -> stok produk tidak terpotong permanen dan UI menampilkan opsi coba lagi.
4. **Duplikasi / Idempotensi Webhook:** Webhook Mayar memanggil update berkali-kali -> sistem tetap aman dan hanya memproses pesanan 1 kali.
5. **Realtime Audio Browser Policy:** Browser membatasi auto-play audio sebelum ada interaksi user di tab kasir -> sediakan tombol toggle "Aktifkan Suara Notifikasi" di POS.

---

## Task Decomposition

### Task 1: Database Migration & Schema Types (Tahap 1 - Database)
**Files:**
- Create: `supabase/migrations/20261024000000_add_self_service_fields.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Tulis migrasi SQL untuk tabel `transaksi` dan stored procedure**
  Tambahkan kolom:
  - `nomor_meja TEXT`
  - `nama_pelanggan TEXT DEFAULT 'Pelanggan'`
  - `sumber_pesanan TEXT DEFAULT 'kasir' CHECK (sumber_pesanan IN ('kasir', 'self_service'))`
  Update RPC `create_transaksi_atomic` agar menerima parameter opsional:
  - `p_nomor_meja TEXT DEFAULT NULL`
  - `p_nama_pelanggan TEXT DEFAULT 'Pelanggan'`
  - `p_sumber_pesanan TEXT DEFAULT 'kasir'`
  - Tambahkan logic: jika `p_sumber_pesanan = 'self_service'`, otomatis gunakan shift kasir berstatus 'buka' yang aktif di cabang bersangkutan.

- [ ] **Step 2: Jalankan migrasi SQL ke database Supabase**
  Eksekusi SQL via Supabase Management API / SQL Editor atau psql client.

- [ ] **Step 3: Update `src/types/database.ts`**
  Tambahkan field `nomor_meja?: string | null`, `nama_pelanggan?: string`, dan `sumber_pesanan?: 'kasir' | 'self_service'` pada interface `Transaksi`.

---

### Task 2: Input Meja & Nama di Kasir POS + Struk (Tahap 1 - POS Kasir)
**Files:**
- Modify: `src/app/actions/pos.ts`
- Modify: `src/app/actions/mayar.ts`
- Modify: `src/components/pos/CartPanel.tsx`
- Modify: `src/components/pos/ThermalReceipt.tsx`
- Modify: `src/components/pos/PosClient.tsx`

- [ ] **Step 1: Perbarui Server Action `pos.ts` & `mayar.ts`**
  Tambahkan `nomor_meja` dan `nama_pelanggan` pada interface `CheckoutPayload` dan teruskan ke pemanggilan `create_transaksi_atomic`.

- [ ] **Step 2: Tambahkan Form Input Meja & Nama di `CartPanel.tsx`**
  Tambahkan dua input modern di atas ringkasan pembayaran:
  - Input "Nama Pelanggan" (default: "Pelanggan / Walk-in")
  - Input "Nomor Meja / Tipe" (misal: "Meja 05" atau "Take Away")

- [ ] **Step 3: Perbarui Tampilan Struk `ThermalReceipt.tsx`**
  Jika `nomor_meja` atau `nama_pelanggan` diisi, tampilkan di bawah header struk:
  `Pelanggan: [nama_pelanggan]`  
  `Meja     : [nomor_meja]`

- [ ] **Step 4: Verifikasi di Browser Localhost POS Kasir**
  Buka `http://localhost:3000/kasir`, lakukan transaksi tunai & QRIS dengan menginput Meja 02 dan Nama "Andi", pastikan transaksi tersimpan dan tercetak di struk.

---

### Task 3: Halaman Menu Self-Service Pelanggan `/order` (Tahap 2)
**Files:**
- Create: `src/app/order/page.tsx`
- Create: `src/components/order/CustomerMenuClient.tsx`
- Create: `src/components/order/CustomerCartDrawer.tsx`
- Create: `src/components/order/CustomerQrisModal.tsx`
- Create: `src/app/actions/self-service.ts`

- [ ] **Step 1: Buat Server Action `self-service.ts`**
  - `getMenuCabangAction(cabangIdOrKode: string)`: Mengambil profil cabang dan daftar produk aktif beserta stok cabang tanpa memerlukan login pengguna (public read).
  - `buatPesananSelfServiceAction(...)`: Validasi shift aktif cabang, buat invoice Mayar QRIS, panggil `create_transaksi_atomic` dengan `sumber_pesanan = 'self_service'`, simpan `mayar_invoice_id`.
  - `cekStatusPesananSelfServiceAction(transaksiId: string)`: Polling status transaksi apakah sudah 'lunas'.

- [ ] **Step 2: Buat Halaman & Komponen Katalog Pelanggan Responsif Mobile**
  - Membaca URL query: `/order?cabang=XXX&meja=YY`.
  - Header: Nama Cabang, Badge Meja `Meja XX` (atau input nomor meja jika tidak ada di URL).
  - Kategori filter (Pills scroll horizontal): Semua, Kopi, Non Kopi, Roti, Snack.
  - Kartu produk modern dengan gambar placeholder/foto, nama, harga, dan tombol `+ Tambah`.
  - Bottom bar keranjang melayang (Floating Cart Bar) dengan animasi ketika item ditambahkan.

- [ ] **Step 3: Buat Drawer Keranjang & Modal Pembayaran QRIS Pelanggan**
  - Drawer rincian item, kuantitas (+/-), input Nama Pemesan, dan Catatan pesanan.
  - Tombol "Bayar Sekarang via QRIS".
  - Pop-up QRIS Mayar responsif:
    - QR Code Mayar dengan countdown timer.
    - Tombol "Unduh Gambar QRIS" (mempermudah bayar lewat aplikasi e-wallet di HP yang sama).
    - Status polling otomatis; saat webhook/status paid, otomatis beralih ke layar sukses.
  - Layar sukses:
    - Ilustrasi centang hijau.
    - Info: "Pesanan Berhasil Dibayar! Pesanan Anda sedang disiapkan dan akan diantar ke Meja [X]".
    - Rincian nomor struk & item yang dipesan.

- [ ] **Step 4: Verifikasi Alur Pelanggan di Localhost**
  Akses `http://localhost:3000/order?cabang=[ID]&meja=05` di browser (dan mode mobile responsive inspect), lakukan pemesanan hingga QRIS muncul dan status berhasil.

---

### Task 4: Notifikasi Realtime & Cetak QR Meja di Kasir POS (Tahap 3)
**Files:**
- Create: `src/components/pos/TableOrderAlert.tsx`
- Create: `src/components/pos/TableQrGeneratorModal.tsx`
- Modify: `src/components/pos/PosClient.tsx`
- Modify: `src/components/pos/CartPanel.tsx` or Header Kasir

- [ ] **Step 1: Buat Komponen Notifikasi Realtime `TableOrderAlert.tsx`**
  - Menggunakan Supabase Realtime subscription pada tabel `transaksi`.
  - Filter: `status = 'lunas'` dan `sumber_pesanan = 'self_service'`.
  - Saat ada pesanan meja baru masuk:
    - Mainkan suara lonceng kasir (`chime.mp3` atau AudioContext synth).
    - Tampilkan Toast / Alert Banner di layar kasir: "🔔 Pesanan Baru Meja 05 (Budi) - Rp 35.000! [Cetak Struk]".
    - Tombol cepat untuk langsung mencetak struk thermal ke dapur/barista.

- [ ] **Step 2: Buat Generator Cetak QR Meja `TableQrGeneratorModal.tsx`**
  - Tombol "Cetak QR Meja" di dashboard Kasir / Pengaturan.
  - Modal: pilih cabang, input jumlah meja (misal 1 s/d 15).
  - Merender kartu/stiker meja bergambar QR Code (menggunakan library QR code atau Google Chart API) berisikan link `http://[host]/order?cabang=[kode]&meja=[nomor]`.
  - Desain kartu siap print (CSS `@media print` rapi untuk ukuran akrilik / tent card meja).

- [ ] **Step 3: Uji Coba Integrasi Penuh di Localhost**
  - Buka dua tab browser:
    - Tab 1: Kasir POS (`http://localhost:3000/kasir`)
    - Tab 2: Pelanggan Meja 03 (`http://localhost:3000/order?cabang=[kode]&meja=03`)
  - Lakukan pemesanan di Tab 2 -> bayar QRIS -> Verifikasi Tab 1 kasir berbunyi notif dan menampilkan pesanan Meja 03 yang siap dicetak.
