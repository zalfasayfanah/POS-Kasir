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
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | BR-01 | Kasir Nonaktif | Login menggunakan akun staf yang kolom `aktif = false`. | Sistem menolak login dengan pesan error akun dinonaktifkan; tidak ada data yang terbaca. | `loginAction` menolak login dengan pesan: *"Akun Anda telah dinonaktifkan oleh Owner. Akses ditolak (BR-01)."* dan middleware langsung me-redirect ke login. | ✅ Lulus |
| **TC-02** | BR-01 | Kasir (Tebet) | Kasir Tebet mencoba mengakses URL transaksi atau data stok cabang Bintaro via parameter URL/API. | Ditolak oleh Middleware dan RLS Supabase (hanya data cabang Tebet yang diizinkan). | RLS tabel `transaksi` dan `stok_cabang` menyaring berdasarkan `cabang_id = get_auth_cabang_id()`. Data cabang lain tidak terkirim sama sekali. | ✅ Lulus |
| **TC-03** | BR-02 | Kasir (Shift Tutup) | Kasir membuat transaksi checkout saat belum membuka shift atau shift sudah ditutup. | Tombol simpan dinonaktifkan atau ditolak oleh database function: transaksi gagal disimpan. | UI menampilkan banner shift belum dibuka, dan stored procedure `create_transaksi_atomic` melempar Exception: *"Transaksi hanya dapat dibuat saat shift kasir berstatus buka (BR-02)."* | ✅ Lulus |
| **TC-04** | BR-02 | Kasir | Membuka shift baru dengan menginput kas awal sebesar Rp2.500.000 (melebihi batas Rp2.000.000). | Form validasi menolak input; database constraint membatasi kas awal maksimal Rp2.000.000. | Server action `bukaShiftAction` menolak input: *"Kas awal wajib berada di antara Rp 0 dan Rp 2.000.000 (BR-02)."* Didukung constraint database `kas_awal <= 2000000`. | ✅ Lulus |
| **TC-05** | BR-03 | Kasir | Membeli produk yang stoknya 0 atau quantity keranjang melebihi sisa stok produk yang dilacak. | Transaksi ditolak seluruhnya (*all-or-nothing rollback*); stok tidak berkurang dan tidak menjadi minus. | UI kasir memblokir tombol tambah stok habis, dan fungsi atomic melempar Exception: *"Stok produk tidak mencukupi... Seluruh transaksi dibatalkan (BR-03)."* Terjadi rollback total. | ✅ Lulus |
| **TC-06** | BR-03 | Dua Kasir (Simultan) | Dua kasir di cabang yang sama melakukan checkout bersamaan untuk 1 sisa stok produk fisik terakhir. | Tepat 1 transaksi berhasil dengan stok akhir 0; transaksi kedua ditolak karena stok habis (`FOR UPDATE` lock). | `FOR UPDATE` row lock pada `stok_cabang` mengantrikan transaksi kedua. Saat transaksi kedua dieksekusi, sisa stok = 0 sehingga dibatalkan otomatis tanpa race condition. | ✅ Lulus |
| **TC-07** | BR-04 | Kasir | Menyimpan transaksi baru di cabang Tebet pada tanggal 16 Oktober 2026. | Struk terbit dengan format nomor urut unik `TBT-20261016-0001` tanpa duplikasi. | Kunci baris cabang dengan `FOR UPDATE` menaikkan counter harian secara konsisten dan menghasilkan format `KODE-YYYYMMDD-NNNN` urut. | ✅ Lulus |
| **TC-08** | BR-05 | Kasir | Kasir mencoba memanipulasi payload harga produk di keranjang menjadi lebih murah sebelum checkout. | Server/Database mengabaikan input harga dari client dan mengambil harga resmi dari tabel `produk`. | Stored procedure `create_transaksi_atomic` menghitung ulang subtotal resmi dari `produk.harga_jual` di database. Jika payload client dimanipulasi, transaksi ditolak. | ✅ Lulus |
| **TC-09** | BR-06 | Kasir | Memberikan diskon 15% pada total transaksi belanja. | Ditolak oleh validasi client & database (diskon maksimal 10% dan wajib alasan). | Validasi form keranjang membatasi diskon max 10% dan stored procedure melempar: *"Diskon maksimal adalah 10% dari subtotal (BR-06)."* | ✅ Lulus |
| **TC-10** | BR-07 | Kasir | Memilih pembayaran tunai dengan uang diterima Rp45.000 untuk total belanja Rp50.000. | Ditolak dengan pesan uang tunai diterima kurang dari total belanja. | Database constraint `chk_tunai_validasi` dan form POS menolak transaksi dengan pesan *"Uang tunai yang diterima tidak boleh kurang dari total belanja (BR-07)."* | ✅ Lulus |
| **TC-11** | BR-08 | Kasir | Kasir mencoba menekan tombol atau mengeksekusi fungsi *void* transaksi. | Kasir tidak memiliki hak *void*; aksi ditolak oleh RLS dan fungsi database. | Tombol void tidak dirender untuk kasir di UI, dan fungsi `void_transaksi_atomic` memvalidasi peran: *"Void hanya dapat dilakukan oleh Kepala Toko cabang terkait atau Owner (BR-08)."* | ✅ Lulus |
| **TC-12** | BR-08 | Kepala Toko | Kepala Toko melakukan *void* transaksi lunas hari ini dengan alasan 15 karakter ("Salah input menu"). | Transaksi berstatus `void`, stok produk yang dilacak kembali bertambah, dan aksi tercatat di `audit_log`. | Transaksi berubah ke `status = 'void'`, stok bertambah kembali ke `stok_cabang`, dan tercatat permanen di `audit_log` beserta snapshot data sebelum/sesudah. | ✅ Lulus |
| **TC-13** | BR-08 | Kepala Toko | Kepala Toko melakukan *void* transaksi hari kemarin atau transaksi dengan shift yang sudah diverifikasi. | Ditolak oleh validasi aturan bisnis: hanya transaksi hari ini dengan shift yang masih buka yang dapat di-*void*. | `void_transaksi_atomic` menolak dengan Exception: *"Void hanya dapat dilakukan untuk transaksi yang dibuat hari ini"* dan *"Void hanya dapat dilakukan bila shift kasir masih berstatus buka (BR-08)."* | ✅ Lulus |
| **TC-14** | BR-09 | Kasir | Kasir menutup shift dengan selisih kas fisik Rp35.000 tanpa mengisi alasan/catatan. | Ditolak: kolom catatan wajib diisi jika selisih kas fisik melebihi toleransi Rp20.000. | Server action `tutupShiftAction` dan DB constraint `chk_shift_selisih_catatan` menolak submit: *"Selisih kas melebihi batas toleransi Rp 20.000. Catatan penutupan wajib diisi (BR-09)."* | ✅ Lulus |
| **TC-15** | BR-10 | Kepala Toko | Kepala Toko memverifikasi shift kasir yang masih berstatus `buka`. | Ditolak: verifikasi shift hanya diizinkan untuk shift yang sudah berstatus `ditutup`. | `verifikasi_shift_atomic` menolak aksi: *"Hanya shift berstatus ditutup yang dapat diverifikasi (BR-10)."* | ✅ Lulus |
| **TC-16** | BR-11 | Kepala Toko | Kepala Toko melakukan inspect network / memanggil query Supabase ke tabel `riwayat_harga_modal`. | Query mengembalikan response kosong atau 403 Forbidden (RLS memblokir non-owner). | Kebijakan RLS `Only Owner can view cost history` membatasi akses eksklusif untuk role `owner`. Kepala Toko hanya menerima array kosong `[]`. | ✅ Lulus |
| **TC-17** | BR-12 | Kepala Toko | Kepala Toko melakukan penyesuaian stok barang rusak di cabangnya. | Stok cabang terupdate, baris baru tercatat di `audit_log` dengan nilai sebelum dan nilai sesudah. | `penyesuaian_stok_atomic` mengupdate jumlah di `stok_cabang` dan otomatis menginsert baris audit ke `audit_log` dengan aksi `penyesuaian_stok`. | ✅ Lulus |
| **TC-18** | C3 / Non-Fungsional | Tamu / Kasir | Mengakses URL rahasia `/pengaturan` atau `/laporan` tanpa hak akses. | Diarahkan kembali (redirect) ke halaman masing-masing dengan pesan akses ditolak. | Next.js Middleware route-guard mencegat akses URL langsung dan me-redirect kasir/tamu ke `/kasir` atau `/login` dengan parameter error akses ditolak. | ✅ Lulus |

---

## 📊 Ringkasan Hasil Pengujian Fase 9
- **Total Test Cases:** 18
- **Lulus (Passed):** 18 (100%)
- **Gagal (Failed):** 0 (0%)
- **Kepatuhan Aturan Bisnis:** 100% (Mencakup seluruh aturan BR-01 sampai BR-12 dan Non-Fungsional C3)
- **Status Audit Keamanan:** Seluruh proteksi aktif di level Stored Procedure, Database Constraint, Row Level Security (RLS), dan Next.js Middleware.
