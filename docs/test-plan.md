# Test Plan: POS Kasir Multi-Cabang
**Aplikasi:** Lumbung Kopi dan Roti  
**Target Pengujian:** 15+ Test Cases (Positif, Negatif, Kasus Batas, dan Uji Hak Akses)  
**Rujukan:** [PRD_POS.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/PRD_POS.md) & [ERD_POS.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/ERD_POS.md)  

---

## 👥 Matriks Hak Akses Peran

| Halaman / Fitur | Kasir (`kasir`) | Kepala Toko (`kepala_toko`) | Owner (`owner`) |
| :--- | :---: | :---: | :---: |
| **Kasir POS (`/kasir`)** | ✅ Akses Penuh | ❌ Ditolak / Redirect | ❌ Ditolak / Redirect |
| **Shift Saya (`/shift`)** | ✅ Buka & Tutup Shift Milik Sendiri | ❌ Ditolak / Redirect | ❌ Ditolak / Redirect |
| **Transaksi (`/transaksi`)** | 👁️ Hanya transaksi miliknya | 👁️ Semua transaksi di cabangnya & Tombol Void | 👁️ Semua cabang & Tombol Void |
| **Stok Cabang (`/stok`)** | ❌ Ditolak / Redirect | ✅ Lihat & Sesuaikan Stok Cabang Sendiri | ✅ Lihat & Sesuaikan Stok Semua Cabang |
| **Shift Cabang (`/shift-cabang`)** | ❌ Ditolak / Redirect | ✅ Lihat & Verifikasi Shift Cabangnya | ✅ Lihat & Verifikasi Shift Semua Cabang |
| **Katalog Produk (`/produk`)** | ❌ Ditolak / Redirect | 👁️ Lihat Produk (Tanpa Harga Modal) | ✅ CRUD Produk & Atur Harga Jual |
| **Riwayat Harga Modal** | ❌ Ditolak (Database RLS Block) | ❌ Ditolak (Database RLS Block) | ✅ Lihat & Tambah Harga Modal |
| **Laporan & Dashboard (`/laporan`)** | ❌ Ditolak / Redirect | 👁️ Penjualan Cabangnya (Tanpa Laba) | ✅ Semua Cabang + Laba Kotor & Margin |
| **Pengaturan & Akun (`/pengaturan`)** | ❌ Ditolak / Redirect | ❌ Ditolak / Redirect | ✅ Kelola Akun Staf & Lihat Audit Log |

---

## 🧪 Tabel Test Cases

| Kode | Rujukan | Peran / Akun | Skenario & Langkah Uji | Hasil yang Diharapkan | Hasil Sebenarnya | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | BR-01 | Kasir Nonaktif | Login menggunakan akun staf yang kolom `aktif = false`. | Sistem menolak login dengan pesan error akun dinonaktifkan; tidak ada data yang terbaca. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-02** | BR-01 | Kasir (Tebet) | Kasir Tebet mencoba mengakses URL transaksi atau data stok cabang Bintaro via parameter URL/API. | Ditolak oleh Middleware dan RLS Supabase (hanya data cabang Tebet yang diizinkan). | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-03** | BR-02 | Kasir (Shift Tutup) | Kasir membuat transaksi checkout saat belum membuka shift atau shift sudah ditutup. | Tombol simpan dinonaktifkan atau ditolak oleh database function: transaksi gagal disimpan. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-04** | BR-02 | Kasir | Membuka shift baru dengan menginput kas awal sebesar Rp2.500.000 (melebihi batas Rp2.000.000). | Form validasi menolak input; database constraint membatasi kas awal maksimal Rp2.000.000. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-05** | BR-03 | Kasir | Membeli produk yang stoknya 0 atau quantity keranjang melebihi sisa stok produk yang dilacak. | Transaksi ditolak seluruhnya (*all-or-nothing rollback*); stok tidak berkurang dan tidak menjadi minus. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-06** | BR-03 | Dua Kasir (Simultan) | Dua kasir di cabang yang sama melakukan checkout bersamaan untuk 1 sisa stok produk fisik terakhir. | Tepat 1 transaksi berhasil dengan stok akhir 0; transaksi kedua ditolak karena stok habis (`FOR UPDATE` lock). | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-07** | BR-04 | Kasir | Menyimpan transaksi baru di cabang Tebet pada tanggal 16 Oktober 2026. | Struk terbit dengan format nomor urut unik `TBT-20261016-0001` tanpa duplikasi. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-08** | BR-05 | Kasir | Kasir mencoba memanipulasi payload harga produk di keranjang menjadi lebih murah sebelum checkout. | Server/Database mengabaikan input harga dari client dan mengambil harga resmi dari tabel `produk`. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-09** | BR-06 | Kasir | Memberikan diskon 15% pada total transaksi belanja. | Ditolak oleh validasi client & database (diskon maksimal 10% dan wajib alasan). | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-10** | BR-07 | Kasir | Memilih pembayaran tunai dengan uang diterima Rp45.000 untuk total belanja Rp50.000. | Ditolak dengan pesan uang tunai diterima kurang dari total belanja. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-11** | BR-08 | Kasir | Kasir mencoba menekan tombol atau mengeksekusi fungsi *void* transaksi. | Kasir tidak memiliki hak *void*; aksi ditolak oleh RLS dan fungsi database. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-12** | BR-08 | Kepala Toko | Kepala Toko melakukan *void* transaksi lunas hari ini dengan alasan 15 karakter ("Salah input menu"). | Transaksi berstatus `void`, stok produk yang dilacak kembali bertambah, dan aksi tercatat di `audit_log`. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-13** | BR-08 | Kepala Toko | Kepala Toko melakukan *void* transaksi hari kemarin atau transaksi dengan shift yang sudah diverifikasi. | Ditolak oleh validasi aturan bisnis: hanya transaksi hari ini dengan shift yang masih buka yang dapat di-*void*. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-14** | BR-09 | Kasir | Kasir menutup shift dengan selisih kas fisik Rp35.000 tanpa mengisi alasan/catatan. | Ditolak: kolom catatan wajib diisi jika selisih kas fisik melebihi toleransi Rp20.000. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-15** | BR-10 | Kepala Toko | Kepala Toko memverifikasi shift kasir yang masih berstatus `buka`. | Ditolak: verifikasi shift hanya diizinkan untuk shift yang sudah berstatus `ditutup`. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-16** | BR-11 | Kepala Toko | Kepala Toko melakukan inspect network / memanggil query Supabase ke tabel `riwayat_harga_modal`. | Query mengembalikan response kosong atau 403 Forbidden (RLS memblokir non-owner). | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-17** | BR-12 | Kepala Toko | Kepala Toko melakukan penyesuaian stok barang rusak di cabangnya. | Stok cabang terupdate, baris baru tercatat di `audit_log` dengan nilai sebelum dan nilai sesudah. | *Menunggu implementasi* | ⏳ Belum diuji |
| **TC-18** | C3 / Non-Fungsional | Tamu / Kasir | Mengakses URL rahasia `/pengaturan` atau `/laporan` tanpa hak akses. | Diarahkan kembali (redirect) ke halaman masing-masing dengan pesan akses ditolak. | *Menunggu implementasi* | ⏳ Belum diuji |
