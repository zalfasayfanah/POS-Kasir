**Bootcamp AI Web Programming · Capstone Project**

PRD Aplikasi Kasir (POS) Multi-Cabang

**Lumbung Kopi dan Roti**

## **1\. Latar Belakang**

Lumbung Kopi dan Roti adalah kedai kopi dan roti dengan tiga cabang: Tebet (kode TBT), Bintaro (BTR), dan Depok (DPK). Setiap cabang menjual minuman racikan, roti dan kue yang dikirim dari dapur pusat, serta produk kemasan seperti biji kopi dan tumbler. Saat ini setiap cabang memakai mesin kasir yang berbeda dan stok dicatat di buku. Akibatnya sering terjadi:

* roti terakhir terjual dua kali karena dua kasir melayani bersamaan, padahal barangnya hanya satu;

* nomor struk ditulis manual, sehingga ada nomor ganda dan nomor yang hilang;

* uang di laci kasir tidak cocok dengan penjualan, tetapi tidak ada catatan siapa yang bertugas;

* pembatalan transaksi dilakukan kasir sendiri tanpa persetujuan;

* pemilik tidak tahu laba harian per cabang karena harga modal hanya ada di catatan pribadi.

Aplikasi ini menggantikan mesin kasir dan buku stok dengan satu aplikasi web yang dipakai di tiga cabang.

## **2\. Tujuan**

1. Kasir mencatat penjualan dengan cepat, lengkap dengan struk bernomor urut.

2. Stok setiap cabang selalu benar dan tidak pernah minus, termasuk saat dua kasir melayani bersamaan.

3. Setiap shift kasir dibuka dan ditutup dengan hitungan kas, lalu diperiksa kepala toko.

4. Pembatalan transaksi (*void*) dan perubahan stok hanya dilakukan orang yang berwenang dan tercatat.

5. Owner melihat penjualan dan laba per cabang, sedangkan harga modal tetap rahasia.

## **3\. Pengguna dan Peran**

| Peran | Siapa | Yang bisa dilakukan |
| :---- | :---- | :---- |
| Kasir | Staf yang melayani pembayaran di satu cabang | Membuka dan menutup shift miliknya, membuat transaksi, memberi diskon dalam batas, melihat transaksi miliknya dan stok cabangnya |
| Kepala Toko | Penanggung jawab satu cabang (satu orang per cabang) | Melihat semua transaksi, shift, dan stok cabangnya; melakukan *void*; memverifikasi shift; mencatat penyesuaian stok; melihat laporan penjualan cabangnya |
| Owner | Pemilik usaha | Melihat semua cabang; mengelola produk, harga jual, harga modal, dan akun; melihat laporan penjualan dan laba; melihat *audit log*; dapat melakukan *void* dan verifikasi di cabang mana pun |

Kasir dan kepala toko selalu terikat ke satu cabang. Owner tidak terikat ke cabang. Akun yang dinonaktifkan tidak bisa membuka data apa pun.

## **4\. Aturan Bisnis**

| Kode | Aturan |
| :---- | :---- |
| BR-01 | Kasir dan kepala toko hanya dapat melihat dan mengubah data cabangnya sendiri. Kasir hanya melihat transaksi dan shift miliknya. Owner melihat semua cabang. Akun nonaktif tidak dapat masuk ke data apa pun. |
| BR-02 | Transaksi hanya dapat dibuat oleh kasir yang sedang memiliki shift berstatus buka. Satu kasir paling banyak memiliki 1 shift buka. Kas awal shift Rp0 sampai Rp2.000.000. |
| BR-03 | Stok produk yang dilacak tidak boleh negatif. Bila satu item di keranjang stoknya kurang, seluruh transaksi ditolak (tidak ada penjualan sebagian). Pengurangan stok dan pencatatan transaksi terjadi bersamaan: berhasil semua atau gagal semua. Minuman racikan tidak dilacak stoknya. |
| BR-04 | Nomor struk berformat KODE-YYYYMMDD-NNNN (contoh TBT-20261015-0004), unik, dan berurutan per cabang per hari mulai 0001\. Tidak boleh ada nomor ganda atau nomor yang terlewat, termasuk saat dua kasir menyimpan transaksi pada detik yang sama. Transaksi yang di-*void* tetap memakai nomornya. |
| BR-05 | Harga jual diambil dari data produk saat transaksi dibuat dan disimpan pada item transaksi. Perubahan harga sesudahnya tidak mengubah transaksi lama. Kasir tidak dapat mengubah harga. Produk nonaktif tidak dapat dijual. Jumlah per produk 1 sampai 99\. |
| BR-06 | Diskon per transaksi paling besar 10% dari subtotal dan wajib disertai alasan. Total \= subtotal dikurangi diskon. |
| BR-07 | Pembayaran tunai: uang diterima harus lebih besar atau sama dengan total, dan kembalian dihitung otomatis. Pembayaran QRIS: nominal sama persis dengan total. |
| BR-08 | *Void* hanya dapat dilakukan Kepala Toko cabang tersebut atau Owner, hanya untuk transaksi berstatus lunas, dibuat hari ini, dan shift-nya masih buka. Alasan *void* minimal 10 karakter. *Void* mengembalikan stok. Kasir tidak dapat melakukan *void*. |
| BR-09 | Saat menutup shift, kasir mengisi uang fisik di laci. Kas seharusnya \= kas awal \+ total tunai yang lunas (transaksi *void* tidak dihitung). Bila selisih lebih dari Rp20.000 (lebih atau kurang), catatan wajib diisi. Setelah shift ditutup, kasir tidak dapat menambah transaksi atau mengubah angka shift. |
| BR-10 | Status shift berjalan buka, ditutup, diverifikasi, dan tidak dapat mundur. Hanya Kepala Toko cabang tersebut atau Owner yang dapat memverifikasi, dan hanya untuk shift berstatus ditutup. |
| BR-11 | Harga modal dan laba hanya dapat dilihat Owner, termasuk di laporan dan hasil ekspor. Perubahan harga modal disimpan sebagai riwayat dengan tanggal berlaku dan tidak boleh berlaku mundur. Laba dihitung dari harga modal yang berlaku pada saat transaksi. |
| BR-12 | Penyesuaian stok (barang masuk, barang rusak, hasil *stock opname*) hanya oleh Kepala Toko cabang tersebut atau Owner dan wajib disertai alasan. Hanya Owner yang dapat mengubah produk, harga jual, harga modal, dan akun. *Void*, verifikasi shift, penyesuaian stok, perubahan harga, dan perubahan akun tercatat di *audit log* lengkap dengan nilai sebelum dan sesudah. *Audit log* tidak dapat diubah atau dihapus siapa pun. |

## **5\. User Story**

| Kode | User story | Aturan terkait |
| :---- | :---- | :---- |
| US-01 | Sebagai kasir, saya ingin membuka shift dengan mengisi kas awal agar bisa mulai melayani. | BR-02 |
| US-02 | Sebagai kasir, saya ingin mencari produk, memasukkannya ke keranjang, dan melihat total sebelum pelanggan membayar. | BR-03, BR-05, BR-06 |
| US-03 | Sebagai kasir, saya ingin menerima pembayaran tunai atau QRIS dan mencetak struk bernomor. | BR-04, BR-07 |
| US-04 | Sebagai kasir, saya ingin menutup shift dan melihat selisih kas sebelum menyerahkan laci. | BR-09 |
| US-05 | Sebagai kepala toko, saya ingin memverifikasi shift kasir di cabang saya. | BR-10 |
| US-06 | Sebagai kepala toko, saya ingin melakukan *void* transaksi yang salah input dengan alasan yang jelas. | BR-08, BR-12 |
| US-07 | Sebagai kepala toko, saya ingin mencatat barang masuk dan barang rusak serta melihat produk yang stoknya menipis. | BR-01, BR-03, BR-12 |
| US-08 | Sebagai owner, saya ingin mengelola produk, harga jual, dan harga modal. | BR-05, BR-11, BR-12 |
| US-09 | Sebagai owner, saya ingin melihat penjualan dan laba per cabang per hari. | BR-11 |
| US-10 | Sebagai owner, saya ingin mengelola akun staf dan melihat *audit log*. | BR-01, BR-12 |

## **6\. Alur Status**

Aplikasi memiliki dua alur status.

**Status shift kasir**

| Status | Arti | Perpindahan yang diizinkan | Oleh |
| :---- | :---- | :---- | :---- |
| buka | Kasir sedang bertugas dan dapat membuat transaksi | buka ke ditutup | Kasir pemilik shift |
| ditutup | Kasir sudah menghitung uang fisik; menunggu pemeriksaan | ditutup ke diverifikasi | Kepala Toko cabang tersebut, Owner |
| diverifikasi | Shift sudah diperiksa dan final | Tidak ada | Tidak ada |

**Status transaksi**

| Status | Arti | Perpindahan yang diizinkan | Oleh |
| :---- | :---- | :---- | :---- |
| lunas | Pembayaran diterima, stok sudah berkurang | lunas ke void (syarat BR-08) | Kepala Toko cabang tersebut, Owner |
| void | Dibatalkan, stok sudah dikembalikan | Tidak ada | Tidak ada |
| menunggu\_bayar | Hanya untuk fitur nilai tambah QRIS Mayar (bagian 11\) | ke lunas atau batal | Sistem setelah kabar dari *payment gateway*; Kasir untuk batal |
| batal | Tagihan QRIS Mayar tidak dibayar, stok dikembalikan | Tidak ada | Tidak ada |

Perpindahan lain, misalnya diverifikasi ke buka atau void ke lunas, harus ditolak oleh aplikasi dan database.

## **7\. Halaman**

| Halaman | Akses | Isi |
| :---- | :---- | :---- |
| Kasir | Kasir | Pencarian dan kategori produk, keranjang, diskon dengan alasan, pilihan tunai atau QRIS, uang diterima, kembalian, tombol Simpan dan Cetak Struk. Stok cabang tampil di kartu produk. |
| Shift Saya | Kasir | Tombol Buka Shift dengan kas awal; ringkasan shift berjalan (total tunai, total QRIS, kas seharusnya); formulir Tutup Shift dengan uang fisik dan catatan |
| Transaksi | Kasir (miliknya), Kepala Toko (cabangnya), Owner | Daftar transaksi dengan filter tanggal, cabang, status, metode; detail struk; tombol *Void* untuk peran yang berwenang |
| Stok Cabang | Kepala Toko (cabangnya), Owner | Tabel stok per produk, penanda stok di bawah minimum, formulir penyesuaian stok (jenis, jumlah baru, alasan) |
| Shift Cabang | Kepala Toko (cabangnya), Owner | Daftar shift dengan status dan selisih kas; detail shift; tombol Verifikasi |
| Produk | Owner (Kepala Toko hanya melihat tanpa harga modal) | Daftar produk, tambah dan ubah produk, harga jual, aktif atau nonaktif, riwayat harga modal |
| Laporan | Kepala Toko (cabangnya, tanpa laba), Owner | Grafik dan tabel penjualan; laba hanya untuk Owner (lihat bagian 9\) |
| Pengaturan | Owner | Akun staf (peran, cabang, aktif), data cabang, *audit log* |

Halaman Masuk tersedia untuk semua. Setelah masuk, kasir langsung diarahkan ke halaman Kasir, kepala toko ke Transaksi, dan owner ke Laporan.

## **8\. Data Utama**

Rincian tabel dan kolom ada di file ERD\_POS.pdf. Ringkasnya:

| Data | Isi penting |
| :---- | :---- |
| Akun (profil) | nama, email, peran, cabang, aktif |
| Cabang | kode tiga huruf, nama, alamat, nomor struk terakhir per tanggal |
| Produk | SKU, nama, kategori, harga jual, dilacak stoknya atau tidak, aktif |
| Riwayat harga modal | produk, harga modal, berlaku mulai (rahasia, hanya Owner) |
| Stok cabang | cabang, produk, jumlah, stok minimum |
| Shift kasir | cabang, kasir, status, kas awal, total tunai, total QRIS, kas seharusnya, uang fisik, selisih, catatan, verifikator |
| Transaksi | nomor struk, cabang, shift, kasir, status, subtotal, diskon, total, metode bayar, uang diterima, kembalian, data *void* |
| Item transaksi | transaksi, produk, nama dan harga saat transaksi, jumlah, subtotal |
| *Audit log* | pelaku, aksi, data, nilai sebelum, nilai sesudah, waktu |

## **9\. Dashboard dan Laporan**

Halaman Laporan memiliki filter rentang tanggal dan cabang (Kepala Toko hanya cabangnya).

1. Kartu ringkasan: omzet, jumlah transaksi, rata-rata nilai transaksi, jumlah *void*.

2. Grafik batang penjualan harian per cabang.

3. Grafik batang 10 produk terlaris (jumlah terjual).

4. Grafik donat komposisi metode bayar (tunai dan QRIS).

5. Tabel selisih kas per shift, dengan penanda untuk selisih lebih dari Rp20.000.

6. Khusus Owner: kartu laba kotor dan margin, serta grafik garis laba harian per cabang. Bagian ini tidak boleh dikirim ke peramban Kepala Toko sama sekali, bukan hanya disembunyikan.

Omzet dan laba hanya menghitung transaksi lunas. Tanggal laporan memakai zona waktu WIB.

## **10\. Kebutuhan Non-Fungsional**

1. Halaman Kasir siap dipakai paling lama 2 detik setelah dibuka, dan menyimpan transaksi paling lama 1 detik pada koneksi normal.

2. Aplikasi bersifat internal: semua halaman memakai *noindex* dan tidak ada halaman publik selain Masuk.

3. Hak akses dijaga di database, bukan hanya dengan menyembunyikan tombol. Kunci rahasia (*service role*, kunci *payment gateway*) tidak boleh ada di kode sisi peramban.

4. Tampilan halaman Kasir nyaman di tablet berukuran 10 inci (lebar 1024 piksel atau lebih).

5. Database dicadangkan setiap hari, dan cadangan disimpan paling sedikit 7 hari.

6. Struk dapat dicetak dari peramban ke printer struk 58 mm atau disimpan sebagai PDF.

## **11\. Fitur Nilai Tambah (opsional)**

**Pembayaran QRIS dinamis lewat Mayar.** Pada versi dasar, QRIS dicatat manual: kasir memastikan dana masuk di aplikasi bank, lalu menyimpan transaksi. Fitur opsional ini membuat tagihan QRIS per transaksi:

1. Kasir memilih "QRIS Mayar". Aplikasi membuat tagihan lewat Mayar API V2 (sandbox https\://api.mayar.io/hl/v2, POST /invoices/create) sebesar total transaksi, lalu menampilkan tautan atau kode pembayaran ke pelanggan.

2. Transaksi berstatus menunggu\_bayar dan stok sudah dipesan (dikurangi) agar tidak terjual ke pelanggan lain.

3. Saat menerima *webhook* payment.received, aplikasi memeriksa ulang status tagihan dengan GET /invoices/{id} sebelum mengubah transaksi menjadi lunas. Kabar yang sama yang datang dua kali tidak boleh memproses transaksi dua kali.

4. Bila tidak dibayar dalam 10 menit atau dibatalkan kasir, transaksi menjadi batal dan stok dikembalikan.

5. Shift tidak dapat ditutup selama masih ada transaksi menunggu\_bayar.

Kunci API Mayar hanya disimpan di sisi server (*environment variable* Netlify).

## **12\. Akun Uji dan Data Contoh**

Akun uji, data cabang, produk, harga modal, stok, shift, transaksi, item, dan *audit log* contoh ada di file Data\_Contoh\_POS.xlsx. Semua akun memakai kata sandi latihan yang sama, tertulis di sheet "Akun Uji". Data contoh mencakup 3 cabang, 9 akun (1 akun nonaktif), 18 produk (1 nonaktif), dan 62 transaksi pada 1 sampai 15 Oktober 2026, termasuk kasus batas: stok tersisa 1, stok 0, diskon tepat 10%, uang pas, 2 transaksi *void*, shift dengan selisih Rp35.000 beserta catatan, shift yang belum diverifikasi, dan satu shift yang masih buka.

## **13\. Kriteria Selesai**

* ☐ Ketiga peran dapat masuk dan diarahkan ke halaman yang sesuai; akun nonaktif ditolak.

* ☐ Kasir tanpa shift buka tidak dapat menyimpan transaksi.

* ☐ Transaksi lengkap tersimpan dengan nomor struk sesuai format BR-04 dan struk dapat dicetak.

* ☐ Dua kasir yang menjual stok terakhir bersamaan: hanya satu yang berhasil, stok menjadi 0, bukan minus.

* ☐ Diskon di atas 10% dan uang tunai kurang ditolak dengan pesan yang jelas.

* ☐ Tutup shift menghitung kas seharusnya dan selisih dengan benar; selisih di atas Rp20.000 wajib catatan.

* ☐ Verifikasi shift dan *void* hanya bisa dilakukan peran yang berwenang dan sesuai urutan status.

* ☐ Kasir dan Kepala Toko tidak dapat membaca harga modal dan laba, walaupun memanggil API Supabase langsung dari konsol peramban.

* ☐ Data cabang lain tidak terlihat oleh Kasir dan Kepala Toko.

* ☐ Halaman Laporan menampilkan minimal 3 grafik dengan data contoh, dan bagian laba hanya muncul untuk Owner.

* ☐ *Audit log* mencatat *void*, verifikasi shift, penyesuaian stok, perubahan harga, dan perubahan akun.

* ☐ Minimal 10 *test case* dari aturan bisnis dijalankan dan hasilnya dicatat.

* ☐ Aplikasi tayang di Netlify dengan *noindex*.

## **14\. Di Luar Lingkup**

Program loyalitas dan poin pelanggan, pemesanan *online* atau aplikasi ojek *online*, resep dan bahan baku (stok biji kopi, susu, gula), produksi di dapur pusat, transfer stok antarcabang, pembelian ke pemasok, pajak dan faktur, pembayaran kartu debit atau kredit, mode *offline*, dan aplikasi ponsel *native*.