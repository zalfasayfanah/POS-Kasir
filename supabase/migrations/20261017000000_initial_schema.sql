-- ==============================================================================
-- CAPSTONE PROJECT: POS KASIR MULTI-CABANG (LUMBUNG KOPI DAN ROTI)
-- Migration: 20261017000000_initial_schema.sql
-- Stack: Supabase PostgreSQL, RLS, Stored Procedures, Triggers
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL-TABEL UTAMA (9 TABEL SESUAI ERD & PRD)
-- ==============================================================================

-- 2.1 TABEL CABANG
CREATE TABLE IF NOT EXISTS public.cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT NOT NULL UNIQUE CHECK (kode ~ '^[A-Z]{3}$'),
    nama TEXT NOT NULL,
    alamat TEXT,
    aktif BOOLEAN NOT NULL DEFAULT true,
    urut_struk_tanggal DATE,
    urut_struk_terakhir INT NOT NULL DEFAULT 0 CHECK (urut_struk_terakhir >= 0)
);

-- 2.2 TABEL PROFILES (Terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    peran TEXT NOT NULL CHECK (peran IN ('kasir', 'kepala_toko', 'owner')),
    cabang_id UUID REFERENCES public.cabang(id) ON DELETE SET NULL,
    aktif BOOLEAN NOT NULL DEFAULT false,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_profile_cabang_role CHECK (
        (peran = 'owner' AND cabang_id IS NULL) OR
        (peran IN ('kasir', 'kepala_toko') AND cabang_id IS NOT NULL) OR
        (aktif = false)
    )
);

-- Hanya 1 kepala toko aktif per cabang
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_kepala_toko 
ON public.profiles(cabang_id) 
WHERE peran = 'kepala_toko' AND aktif = true;

-- 2.3 TABEL PRODUK
CREATE TABLE IF NOT EXISTS public.produk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('kopi', 'non_kopi', 'roti', 'snack', 'kemasan')),
    harga_jual INT NOT NULL CHECK (harga_jual > 0),
    lacak_stok BOOLEAN NOT NULL DEFAULT true,
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 TABEL RIWAYAT HARGA MODAL (DATA RAHASIA - HANYA OWNER)
CREATE TABLE IF NOT EXISTS public.riwayat_harga_modal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE CASCADE,
    harga_modal INT NOT NULL CHECK (harga_modal >= 0),
    berlaku_mulai TIMESTAMPTZ NOT NULL,
    dibuat_oleh UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_produk_berlaku_mulai UNIQUE (produk_id, berlaku_mulai)
);

-- 2.5 TABEL STOK CABANG
CREATE TABLE IF NOT EXISTS public.stok_cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE CASCADE,
    jumlah INT NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
    stok_minimum INT NOT NULL DEFAULT 5 CHECK (stok_minimum >= 0),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cabang_produk UNIQUE (cabang_id, produk_id)
);

-- 2.6 TABEL SHIFT KASIR
CREATE TABLE IF NOT EXISTS public.shift_kasir (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE RESTRICT,
    kasir_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'ditutup', 'diverifikasi')),
    dibuka_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    kas_awal INT NOT NULL CHECK (kas_awal >= 0 AND kas_awal <= 2000000),
    ditutup_pada TIMESTAMPTZ,
    total_tunai INT NOT NULL DEFAULT 0 CHECK (total_tunai >= 0),
    total_qris INT NOT NULL DEFAULT 0 CHECK (total_qris >= 0),
    kas_seharusnya INT NOT NULL DEFAULT 0 CHECK (kas_seharusnya >= 0),
    uang_fisik INT CHECK (uang_fisik IS NULL OR uang_fisik >= 0),
    selisih INT,
    catatan_tutup TEXT,
    diverifikasi_oleh UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    diverifikasi_pada TIMESTAMPTZ,
    catatan_verifikasi TEXT,
    CONSTRAINT chk_shift_closed_time CHECK (
        (status = 'buka' AND ditutup_pada IS NULL) OR
        (status IN ('ditutup', 'diverifikasi') AND ditutup_pada IS NOT NULL)
    ),
    CONSTRAINT chk_shift_selisih_catatan CHECK (
        (status = 'buka') OR
        (selisih IS NULL) OR
        (abs(selisih) <= 20000) OR
        (abs(selisih) > 20000 AND catatan_tutup IS NOT NULL AND length(trim(catatan_tutup)) > 0)
    )
);

-- Satu kasir hanya boleh memiliki 1 shift buka pada saat yang sama
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_shift_per_kasir 
ON public.shift_kasir(kasir_id) 
WHERE status = 'buka';

-- 2.7 TABEL TRANSAKSI
CREATE TABLE IF NOT EXISTS public.transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_struk TEXT NOT NULL UNIQUE,
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES public.shift_kasir(id) ON DELETE RESTRICT,
    kasir_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'lunas' CHECK (status IN ('lunas', 'void', 'menunggu_bayar', 'batal')),
    subtotal INT NOT NULL CHECK (subtotal > 0),
    diskon INT NOT NULL DEFAULT 0 CHECK (diskon >= 0 AND diskon <= (subtotal * 0.10)::numeric),
    alasan_diskon TEXT,
    total INT NOT NULL,
    metode_bayar TEXT NOT NULL CHECK (metode_bayar IN ('tunai', 'qris')),
    uang_diterima INT NOT NULL CHECK (uang_diterima >= 0),
    kembalian INT NOT NULL DEFAULT 0 CHECK (kembalian >= 0),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    dibayar_pada TIMESTAMPTZ,
    void_oleh UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    void_pada TIMESTAMPTZ,
    alasan_void TEXT,
    mayar_invoice_id TEXT UNIQUE,
    CONSTRAINT chk_total_subtotal_diskon CHECK (total = subtotal - diskon),
    CONSTRAINT chk_diskon_alasan CHECK (
        (diskon = 0) OR
        (diskon > 0 AND alasan_diskon IS NOT NULL AND length(trim(alasan_diskon)) > 0)
    ),
    CONSTRAINT chk_tunai_validasi CHECK (
        (metode_bayar <> 'tunai') OR
        (metode_bayar = 'tunai' AND uang_diterima >= total AND kembalian = uang_diterima - total)
    ),
    CONSTRAINT chk_qris_validasi CHECK (
        (metode_bayar <> 'qris') OR
        (metode_bayar = 'qris' AND uang_diterima = total AND kembalian = 0)
    ),
    CONSTRAINT chk_void_validasi CHECK (
        (status <> 'void') OR
        (status = 'void' AND void_oleh IS NOT NULL AND void_pada IS NOT NULL AND length(trim(alasan_void)) >= 10)
    )
);

-- 2.8 TABEL TRANSAKSI_ITEM
CREATE TABLE IF NOT EXISTS public.transaksi_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaksi_id UUID NOT NULL REFERENCES public.transaksi(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    nama_produk TEXT NOT NULL,
    harga_satuan INT NOT NULL CHECK (harga_satuan > 0),
    jumlah INT NOT NULL CHECK (jumlah >= 1 AND jumlah <= 99),
    subtotal INT NOT NULL,
    CONSTRAINT uq_transaksi_produk UNIQUE (transaksi_id, produk_id),
    CONSTRAINT chk_item_subtotal CHECK (subtotal = harga_satuan * jumlah)
);

-- 2.9 TABEL AUDIT_LOG (DATA PERMANEN / IMMUTABLE)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pelaku_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    aksi TEXT NOT NULL CHECK (aksi IN (
        'void_transaksi',
        'verifikasi_shift',
        'penyesuaian_stok',
        'ubah_harga_jual',
        'ubah_harga_modal',
        'nonaktifkan_produk',
        'ubah_akun',
        'nonaktifkan_akun'
    )),
    tabel TEXT NOT NULL,
    data_id UUID,
    nilai_sebelum JSONB,
    nilai_sesudah JSONB,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper: Ambil Peran Pengguna Aktif
CREATE OR REPLACE FUNCTION public.get_auth_peran()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT peran FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: Ambil Cabang ID Pengguna Aktif
CREATE OR REPLACE FUNCTION public.get_auth_cabang_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT cabang_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: Cek Apakah Akun Aktif
CREATE OR REPLACE FUNCTION public.get_auth_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT aktif FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Trigger: Otomatis Buat Profil Saat User Baru Terdaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, email, peran, cabang_id, aktif)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'peran', 'kasir'),
        NULLIF(NEW.raw_user_meta_data->>'cabang_id', '')::uuid,
        COALESCE((NEW.raw_user_meta_data->>'aktif')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_harga_modal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_kasir ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 4.1 POLICIES: cabang
DROP POLICY IF EXISTS "Active users can view active branches" ON public.cabang;
CREATE POLICY "Active users can view active branches"
ON public.cabang FOR SELECT
TO authenticated
USING (public.get_auth_is_active() = true AND (aktif = true OR public.get_auth_peran() = 'owner'));

DROP POLICY IF EXISTS "Only owner can modify cabang" ON public.cabang;
CREATE POLICY "Only owner can modify cabang"
ON public.cabang FOR ALL
TO authenticated
USING (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true)
WITH CHECK (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

-- 4.2 POLICIES: profiles
DROP POLICY IF EXISTS "Users can read relevant profiles" ON public.profiles;
CREATE POLICY "Users can read relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        id = auth.uid() OR
        public.get_auth_peran() = 'owner' OR
        (public.get_auth_peran() IN ('kasir', 'kepala_toko') AND cabang_id = public.get_auth_cabang_id())
    )
);

DROP POLICY IF EXISTS "Owner can update profiles" ON public.profiles;
CREATE POLICY "Owner can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true)
WITH CHECK (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

-- 4.3 POLICIES: produk
DROP POLICY IF EXISTS "Active users can view products" ON public.produk;
CREATE POLICY "Active users can view products"
ON public.produk FOR SELECT
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        aktif = true OR
        public.get_auth_peran() = 'owner'
    )
);

DROP POLICY IF EXISTS "Owner can modify products" ON public.produk;
CREATE POLICY "Owner can modify products"
ON public.produk FOR ALL
TO authenticated
USING (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true)
WITH CHECK (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

-- 4.4 POLICIES: riwayat_harga_modal (DATA RAHASIA HANYA OWNER)
DROP POLICY IF EXISTS "Only Owner can view cost history" ON public.riwayat_harga_modal;
CREATE POLICY "Only Owner can view cost history"
ON public.riwayat_harga_modal FOR SELECT
TO authenticated
USING (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

DROP POLICY IF EXISTS "Only Owner can insert cost history" ON public.riwayat_harga_modal;
CREATE POLICY "Only Owner can insert cost history"
ON public.riwayat_harga_modal FOR INSERT
TO authenticated
WITH CHECK (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

-- 4.5 POLICIES: stok_cabang
DROP POLICY IF EXISTS "Users view branch stock" ON public.stok_cabang;
CREATE POLICY "Users view branch stock"
ON public.stok_cabang FOR SELECT
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        public.get_auth_peran() = 'owner' OR
        cabang_id = public.get_auth_cabang_id()
    )
);

DROP POLICY IF EXISTS "Staff update branch stock" ON public.stok_cabang;
CREATE POLICY "Staff update branch stock"
ON public.stok_cabang FOR UPDATE
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        public.get_auth_peran() = 'owner' OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id())
    )
);

-- 4.6 POLICIES: shift_kasir
DROP POLICY IF EXISTS "Users view shift_kasir" ON public.shift_kasir;
CREATE POLICY "Users view shift_kasir"
ON public.shift_kasir FOR SELECT
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        public.get_auth_peran() = 'owner' OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id()) OR
        (public.get_auth_peran() = 'kasir' AND kasir_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Kasir insert shift" ON public.shift_kasir;
CREATE POLICY "Kasir insert shift"
ON public.shift_kasir FOR INSERT
TO authenticated
WITH CHECK (
    public.get_auth_is_active() = true AND
    public.get_auth_peran() = 'kasir' AND
    kasir_id = auth.uid() AND
    cabang_id = public.get_auth_cabang_id()
);

DROP POLICY IF EXISTS "Update shift permissions" ON public.shift_kasir;
CREATE POLICY "Update shift permissions"
ON public.shift_kasir FOR UPDATE
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        (public.get_auth_peran() = 'kasir' AND kasir_id = auth.uid() AND status = 'buka') OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id()) OR
        (public.get_auth_peran() = 'owner')
    )
);

-- 4.7 POLICIES: transaksi
DROP POLICY IF EXISTS "Users view transactions" ON public.transaksi;
CREATE POLICY "Users view transactions"
ON public.transaksi FOR SELECT
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        public.get_auth_peran() = 'owner' OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id()) OR
        (public.get_auth_peran() = 'kasir' AND kasir_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Authorized users update transactions" ON public.transaksi;
CREATE POLICY "Authorized users update transactions"
ON public.transaksi FOR UPDATE
TO authenticated
USING (
    public.get_auth_is_active() = true AND (
        public.get_auth_peran() = 'owner' OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id())
    )
);

-- 4.8 POLICIES: transaksi_item
DROP POLICY IF EXISTS "Users view transaction items" ON public.transaksi_item;
CREATE POLICY "Users view transaction items"
ON public.transaksi_item FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.transaksi t
        WHERE t.id = transaksi_item.transaksi_id
        AND (
            public.get_auth_peran() = 'owner' OR
            (public.get_auth_peran() = 'kepala_toko' AND t.cabang_id = public.get_auth_cabang_id()) OR
            (public.get_auth_peran() = 'kasir' AND t.kasir_id = auth.uid())
        )
    )
);

-- 4.9 POLICIES: audit_log (Hanya Owner yang bisa membaca; tidak bisa diubah/dihapus)
DROP POLICY IF EXISTS "Owner can view audit log" ON public.audit_log;
CREATE POLICY "Owner can view audit log"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.get_auth_peran() = 'owner' AND public.get_auth_is_active() = true);

DROP POLICY IF EXISTS "System and functions can insert audit log" ON public.audit_log;
CREATE POLICY "System and functions can insert audit log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================================================
-- 5. STORED PROCEDURES (OPERASI ATOMIC RAWAN BENTROK)
-- ==============================================================================

-- 5.1 CREATE TRANSAKSI ATOMIC (BR-02, BR-03, BR-04, BR-05, BR-06, BR-07)
CREATE OR REPLACE FUNCTION public.create_transaksi_atomic(
    p_shift_id UUID,
    p_subtotal INT,
    p_diskon INT,
    p_alasan_diskon TEXT,
    p_total INT,
    p_metode_bayar TEXT,
    p_uang_diterima INT,
    p_kembalian INT,
    p_items JSONB -- Array of { "produk_id": "...", "jumlah": 2 }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kasir_id UUID;
    v_cabang_id UUID;
    v_cabang_kode TEXT;
    v_shift_status TEXT;
    v_today_wib DATE;
    v_next_counter INT;
    v_nomor_struk TEXT;
    v_transaksi_id UUID;
    v_item RECORD;
    v_prod_nama TEXT;
    v_prod_harga INT;
    v_prod_lacak BOOLEAN;
    v_prod_aktif BOOLEAN;
    v_stok_cur INT;
    v_item_subtotal INT;
    v_calc_subtotal INT := 0;
BEGIN
    v_kasir_id := auth.uid();

    -- 1. Validasi kasir dan peran
    IF NOT public.get_auth_is_active() THEN
        RAISE EXCEPTION 'Akun kasir tidak aktif atau tidak memiliki izin.';
    END IF;

    -- 2. Validasi shift kasir (harus berstatus buka dan milik kasir pemanggil)
    SELECT status, cabang_id INTO v_shift_status, v_cabang_id
    FROM public.shift_kasir
    WHERE id = p_shift_id AND kasir_id = v_kasir_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift kasir tidak ditemukan atau bukan milik Anda.';
    END IF;

    IF v_shift_status <> 'buka' THEN
        RAISE EXCEPTION 'Transaksi hanya dapat dibuat saat shift kasir berstatus buka (BR-02).';
    END IF;

    -- 3. Lock baris cabang dengan FOR UPDATE untuk urutan nomor struk harian (BR-04)
    v_today_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;

    SELECT kode, urut_struk_tanggal, urut_struk_terakhir
    INTO v_cabang_kode, v_today_wib, v_next_counter
    FROM public.cabang
    WHERE id = v_cabang_id
    FOR UPDATE;

    IF urut_struk_tanggal IS NULL OR urut_struk_tanggal < v_today_wib THEN
        v_next_counter := 1;
    ELSE
        v_next_counter := v_next_counter + 1;
    END IF;

    UPDATE public.cabang
    SET urut_struk_tanggal = v_today_wib,
        urut_struk_terakhir = v_next_counter
    WHERE id = v_cabang_id;

    -- Format: KODE-YYYYMMDD-NNNN (Contoh: TBT-20261017-0001)
    v_nomor_struk := v_cabang_kode || '-' || to_char(v_today_wib, 'YYYYMMDD') || '-' || lpad(v_next_counter::text, 4, '0');

    -- 4. Validasi items & stok dengan FOR UPDATE (BR-03: anti-minus, all-or-nothing rollback)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(produk_id UUID, jumlah INT)
    LOOP
        IF v_item.jumlah < 1 OR v_item.jumlah > 99 THEN
            RAISE EXCEPTION 'Jumlah per item harus antara 1 sampai 99 (BR-05).';
        END IF;

        -- Ambil data produk resmi
        SELECT nama, harga_jual, lacak_stok, aktif
        INTO v_prod_nama, v_prod_harga, v_prod_lacak, v_prod_aktif
        FROM public.produk
        WHERE id = v_item.produk_id;

        IF NOT FOUND OR v_prod_aktif = false THEN
            RAISE EXCEPTION 'Produk tidak ditemukan atau berstatus nonaktif (BR-05).';
        END IF;

        -- Cek stok cabang jika dilacak
        IF v_prod_lacak = true THEN
            SELECT jumlah INTO v_stok_cur
            FROM public.stok_cabang
            WHERE cabang_id = v_cabang_id AND produk_id = v_item.produk_id
            FOR UPDATE;

            IF NOT FOUND OR v_stok_cur < v_item.jumlah THEN
                RAISE EXCEPTION 'Stok produk % tidak mencukupi di cabang ini (Stok: %, Diminta: %). Seluruh transaksi dibatalkan (BR-03).',
                    v_prod_nama, COALESCE(v_stok_cur, 0), v_item.jumlah;
            END IF;

            -- Kurangi stok
            UPDATE public.stok_cabang
            SET jumlah = jumlah - v_item.jumlah,
                diubah_pada = now()
            WHERE cabang_id = v_cabang_id AND produk_id = v_item.produk_id;
        END IF;

        v_calc_subtotal := v_calc_subtotal + (v_prod_harga * v_item.jumlah);
    END LOOP;

    -- Validasi subtotal yang dihitung server
    IF v_calc_subtotal <> p_subtotal THEN
        RAISE EXCEPTION 'Perhitungan subtotal tidak valid (Server: %, Client: %).', v_calc_subtotal, p_subtotal;
    END IF;

    -- 5. Insert Transaksi
    INSERT INTO public.transaksi (
        nomor_struk,
        cabang_id,
        shift_id,
        kasir_id,
        status,
        subtotal,
        diskon,
        alasan_diskon,
        total,
        metode_bayar,
        uang_diterima,
        kembalian,
        dibuat_pada,
        dibayar_pada
    )
    VALUES (
        v_nomor_struk,
        v_cabang_id,
        p_shift_id,
        v_kasir_id,
        'lunas',
        p_subtotal,
        p_diskon,
        p_alasan_diskon,
        p_total,
        p_metode_bayar,
        p_uang_diterima,
        p_kembalian,
        now(),
        now()
    )
    RETURNING id INTO v_transaksi_id;

    -- 6. Insert Transaksi Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(produk_id UUID, jumlah INT)
    LOOP
        SELECT nama, harga_jual INTO v_prod_nama, v_prod_harga
        FROM public.produk WHERE id = v_item.produk_id;

        v_item_subtotal := v_prod_harga * v_item.jumlah;

        INSERT INTO public.transaksi_item (
            transaksi_id,
            produk_id,
            nama_produk,
            harga_satuan,
            jumlah,
            subtotal
        )
        VALUES (
            v_transaksi_id,
            v_item.produk_id,
            v_prod_nama,
            v_prod_harga,
            v_item.jumlah,
            v_item_subtotal
        );
    END LOOP;

    -- 7. Update akumulasi pembayaran pada shift kasir
    IF p_metode_bayar = 'tunai' THEN
        UPDATE public.shift_kasir
        SET total_tunai = total_tunai + p_total
        WHERE id = p_shift_id;
    ELSIF p_metode_bayar = 'qris' THEN
        UPDATE public.shift_kasir
        SET total_qris = total_qris + p_total
        WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transaksi_id', v_transaksi_id,
        'nomor_struk', v_nomor_struk,
        'total', p_total
    );
END;
$$;

-- 5.2 VOID TRANSAKSI ATOMIC (BR-08, BR-12)
CREATE OR REPLACE FUNCTION public.void_transaksi_atomic(
    p_transaksi_id UUID,
    p_alasan_void TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_peran TEXT;
    v_user_cabang UUID;
    v_trx RECORD;
    v_shift RECORD;
    v_item RECORD;
    v_today_wib DATE;
    v_trx_date_wib DATE;
    v_lacak BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_user_peran := public.get_auth_peran();
    v_user_cabang := public.get_auth_cabang_id();

    IF length(trim(p_alasan_void)) < 10 THEN
        RAISE EXCEPTION 'Alasan void harus minimal 10 karakter (BR-08).';
    END IF;

    -- Ambil transaksi
    SELECT * INTO v_trx
    FROM public.transaksi
    WHERE id = p_transaksi_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan.';
    END IF;

    -- Validasi wewenang (Kepala Toko cabang terkait atau Owner)
    IF v_user_peran = 'owner' THEN
        -- Diizinkan
    ELSIF v_user_peran = 'kepala_toko' AND v_user_cabang = v_trx.cabang_id THEN
        -- Diizinkan
    ELSE
        RAISE EXCEPTION 'Void hanya dapat dilakukan oleh Kepala Toko cabang terkait atau Owner (BR-08).';
    END IF;

    IF v_trx.status <> 'lunas' THEN
        RAISE EXCEPTION 'Hanya transaksi berstatus lunas yang dapat di-void (BR-08).';
    END IF;

    -- Validasi dibuat hari ini (WIB)
    v_today_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;
    v_trx_date_wib := (v_trx.dibuat_pada AT TIME ZONE 'Asia/Jakarta')::date;
    IF v_trx_date_wib <> v_today_wib THEN
        RAISE EXCEPTION 'Void hanya dapat dilakukan untuk transaksi yang dibuat hari ini (BR-08).';
    END IF;

    -- Validasi shift kasir masih berstatus buka
    SELECT * INTO v_shift
    FROM public.shift_kasir
    WHERE id = v_trx.shift_id
    FOR UPDATE;

    IF v_shift.status <> 'buka' THEN
        RAISE EXCEPTION 'Void hanya dapat dilakukan bila shift kasir masih berstatus buka (BR-08).';
    END IF;

    -- Kembalikan stok produk yang dilacak
    FOR v_item IN SELECT ti.produk_id, ti.jumlah, p.lacak_stok, p.nama
                  FROM public.transaksi_item ti
                  JOIN public.produk p ON p.id = ti.produk_id
                  WHERE ti.transaksi_id = p_transaksi_id
    LOOP
        IF v_item.lacak_stok = true THEN
            UPDATE public.stok_cabang
            SET jumlah = jumlah + v_item.jumlah,
                diubah_pada = now()
            WHERE cabang_id = v_trx.cabang_id AND produk_id = v_item.produk_id;
        END IF;
    END LOOP;

    -- Kurangi total di shift kasir
    IF v_trx.metode_bayar = 'tunai' THEN
        UPDATE public.shift_kasir
        SET total_tunai = GREATEST(0, total_tunai - v_trx.total)
        WHERE id = v_trx.shift_id;
    ELSIF v_trx.metode_bayar = 'qris' THEN
        UPDATE public.shift_kasir
        SET total_qris = GREATEST(0, total_qris - v_trx.total)
        WHERE id = v_trx.shift_id;
    END IF;

    -- Update status transaksi menjadi void
    UPDATE public.transaksi
    SET status = 'void',
        void_oleh = v_user_id,
        void_pada = now(),
        alasan_void = p_alasan_void
    WHERE id = p_transaksi_id;

    -- Catat ke audit log (BR-12)
    INSERT INTO public.audit_log (
        pelaku_id,
        aksi,
        tabel,
        data_id,
        nilai_sebelum,
        nilai_sesudah
    )
    VALUES (
        v_user_id,
        'void_transaksi',
        'transaksi',
        p_transaksi_id,
        jsonb_build_object('status', 'lunas', 'total', v_trx.total, 'nomor_struk', v_trx.nomor_struk),
        jsonb_build_object('status', 'void', 'alasan_void', p_alasan_void, 'void_oleh', v_user_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transaksi berhasil di-void dan stok dikembalikan.');
END;
$$;

-- 5.3 VERIFIKASI SHIFT ATOMIC (BR-10, BR-12)
CREATE OR REPLACE FUNCTION public.verifikasi_shift_atomic(
    p_shift_id UUID,
    p_catatan_verifikasi TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_peran TEXT;
    v_user_cabang UUID;
    v_shift RECORD;
BEGIN
    v_user_id := auth.uid();
    v_user_peran := public.get_auth_peran();
    v_user_cabang := public.get_auth_cabang_id();

    SELECT * INTO v_shift
    FROM public.shift_kasir
    WHERE id = p_shift_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift tidak ditemukan.';
    END IF;

    -- Hanya kepala toko cabang terkait atau Owner
    IF v_user_peran = 'owner' THEN
        -- OK
    ELSIF v_user_peran = 'kepala_toko' AND v_user_cabang = v_shift.cabang_id THEN
        -- OK
    ELSE
        RAISE EXCEPTION 'Verifikasi shift hanya dapat dilakukan oleh Kepala Toko cabang terkait atau Owner (BR-10).';
    END IF;

    IF v_shift.status <> 'ditutup' THEN
        RAISE EXCEPTION 'Hanya shift berstatus ditutup yang dapat diverifikasi (BR-10). Status saat ini: %', v_shift.status;
    END IF;

    UPDATE public.shift_kasir
    SET status = 'diverifikasi',
        diverifikasi_oleh = v_user_id,
        diverifikasi_pada = now(),
        catatan_verifikasi = p_catatan_verifikasi
    WHERE id = p_shift_id;

    -- Catat ke audit log (BR-12)
    INSERT INTO public.audit_log (
        pelaku_id,
        aksi,
        tabel,
        data_id,
        nilai_sebelum,
        nilai_sesudah
    )
    VALUES (
        v_user_id,
        'verifikasi_shift',
        'shift_kasir',
        p_shift_id,
        jsonb_build_object('status', 'ditutup'),
        jsonb_build_object('status', 'diverifikasi', 'diverifikasi_oleh', v_user_id, 'catatan', p_catatan_verifikasi)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Shift berhasil diverifikasi.');
END;
$$;
