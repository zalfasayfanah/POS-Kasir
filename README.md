# Lumbung Kopi dan Roti - Aplikasi Kasir (POS) Multi-Cabang

Proyek Capstone Bootcamp AI Web Programming: Sistem Point of Sale (POS) Multi-Cabang berbasis Next.js App Router, Supabase, dan Netlify.

---

## 📌 Ringkasan Proyek

- **Klien**: Lumbung Kopi dan Roti (Kedai kopi & bakery 3 cabang: Tebet `TBT`, Bintaro `BTR`, Depok `DPK`)
- **Tujuan**: Menggantikan mesin kasir terpisah dan pencatatan manual dengan sistem POS terintegrasi real-time, nomor struk berurutan unik aman konkurensi, proteksi stok anti-minus atomic, shift tracking kasir dengan verifikasi fisik, serta isolasi data sensitif (harga modal & laba kotor) khusus Owner.
- **Tech Stack Wajib**:
  - **Frontend / Fullstack**: Next.js (App Router) + TypeScript
  - **Database & Auth**: Supabase (PostgreSQL, Auth, Row Level Security / RLS, Database Functions / Stored Procedures, Triggers)
  - **Deployment**: Netlify

---

## 📂 Struktur Dokumentasi (`docs/`)

Semua berkas spesifikasi, petunjuk teknis, dan data awal dirapikan di dalam folder [`docs/`](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs):

1. [Petunjuk_Capstone_Project.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/Petunjuk_Capstone_Project.md): Panduan lengkap pengerjaan, kriteria kelulusan, rubrik penilaian, dan checklist pengumpulan.
2. [PRD_POS.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/PRD_POS.md): *Product Requirement Document* berisi 3 peran, 12 aturan bisnis (BR-01 s/d BR-12), 10 user stories (US-01 s/d US-10), alur status shift & transaksi, serta spesifikasi halaman.
3. [ERD_POS.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/ERD_POS.md): Dokumentasi 9 tabel inti database, kolom, tipe data, foreign key, dan aturan constraint.
4. [ERD_POS.png](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/ERD_POS.png): Diagram visual relasi tabel database.
5. [Data_Contoh_POS.xlsx](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/Data_Contoh_POS.xlsx): Dataset awal (akun uji 3 cabang, produk, riwayat harga modal, stok awal, data transaksi, dan log audit).
6. [rencana_pengerjaan.md](file:///d:/MaSelf/Bootcamp%20Plan%20Indo/POS-Kasir/docs/rencana_pengerjaan.md): Roadmap dan checklist tahapan pengerjaan capstone dari awal hingga rilis.