-- ==============================================================================
-- CAPSTONE PROJECT: POS KASIR MULTI-CABANG (LUMBUNG KOPI DAN ROTI)
-- Migration: 20261017000003_create_penyesuaian_stok_atomic.sql
-- Function: penyesuaian_stok_atomic (US-07, BR-12)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.penyesuaian_stok_atomic(
    p_cabang_id UUID,
    p_produk_id UUID,
    p_tipe TEXT, -- 'masuk' | 'rusak' | 'opname'
    p_jumlah INT, -- Untuk 'masuk' & 'rusak': kuantitas delta; untuk 'opname': total fisik baru
    p_alasan TEXT
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
    v_stok_id UUID;
    v_old_jumlah INT;
    v_new_jumlah INT;
    v_stok_min INT;
    v_prod_nama TEXT;
    v_prod_lacak BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_user_peran := public.get_auth_peran();
    v_user_cabang := public.get_auth_cabang_id();

    -- 1. Validasi wewenang (Hanya Kepala Toko cabang terkait atau Owner)
    IF NOT public.get_auth_is_active() THEN
        RAISE EXCEPTION 'Akun Anda tidak aktif atau tidak memiliki izin.';
    END IF;

    IF v_user_peran = 'owner' THEN
        -- Diizinkan untuk semua cabang
    ELSIF v_user_peran = 'kepala_toko' AND v_user_cabang = p_cabang_id THEN
        -- Diizinkan untuk cabang sendiri
    ELSE
        RAISE EXCEPTION 'Penyesuaian stok hanya dapat dilakukan oleh Kepala Toko cabang terkait atau Owner.';
    END IF;

    -- 2. Validasi input
    IF p_alasan IS NULL OR length(trim(p_alasan)) < 5 THEN
        RAISE EXCEPTION 'Alasan penyesuaian stok wajib diisi minimal 5 karakter (US-07).';
    END IF;

    IF p_jumlah < 0 THEN
        RAISE EXCEPTION 'Nilai jumlah tidak boleh negatif.';
    END IF;

    -- 3. Cek produk apakah melacak stok
    SELECT nama, lacak_stok INTO v_prod_nama, v_prod_lacak
    FROM public.produk
    WHERE id = p_produk_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produk tidak ditemukan.';
    END IF;

    IF v_prod_lacak = false THEN
        RAISE EXCEPTION 'Produk % tidak dilacak stok fisiknya (katalog bar).', v_prod_nama;
    END IF;

    -- 4. Kunci baris stok_cabang dengan FOR UPDATE
    SELECT id, jumlah, stok_minimum
    INTO v_stok_id, v_old_jumlah, v_stok_min
    FROM public.stok_cabang
    WHERE cabang_id = p_cabang_id AND produk_id = p_produk_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Jika belum ada baris stok untuk cabang ini, inisialisasi baris baru
        INSERT INTO public.stok_cabang (cabang_id, produk_id, jumlah, stok_minimum)
        VALUES (p_cabang_id, p_produk_id, 0, 5)
        RETURNING id, jumlah, stok_minimum INTO v_stok_id, v_old_jumlah, v_stok_min;
    END IF;

    -- 5. Hitung jumlah baru sesuai tipe
    IF p_tipe = 'masuk' THEN
        IF p_jumlah <= 0 THEN
            RAISE EXCEPTION 'Jumlah barang masuk harus lebih dari 0.';
        END IF;
        v_new_jumlah := v_old_jumlah + p_jumlah;
    ELSIF p_tipe = 'rusak' THEN
        IF p_jumlah <= 0 THEN
            RAISE EXCEPTION 'Jumlah barang rusak harus lebih dari 0.';
        END IF;
        IF v_old_jumlah < p_jumlah THEN
            RAISE EXCEPTION 'Jumlah barang rusak (%) melebihi stok yang ada di cabang (%).', p_jumlah, v_old_jumlah;
        END IF;
        v_new_jumlah := v_old_jumlah - p_jumlah;
    ELSIF p_tipe = 'opname' THEN
        v_new_jumlah := p_jumlah;
    ELSE
        RAISE EXCEPTION 'Tipe penyesuaian stok tidak valid (harus masuk, rusak, atau opname).';
    END IF;

    -- 6. Update stok_cabang
    UPDATE public.stok_cabang
    SET jumlah = v_new_jumlah,
        diubah_pada = now()
    WHERE id = v_stok_id;

    -- 7. Catat audit log permanen (BR-12)
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
        'penyesuaian_stok',
        'stok_cabang',
        v_stok_id,
        jsonb_build_object(
            'cabang_id', p_cabang_id,
            'produk_id', p_produk_id,
            'produk_nama', v_prod_nama,
            'jumlah', v_old_jumlah,
            'stok_minimum', v_stok_min
        ),
        jsonb_build_object(
            'tipe', p_tipe,
            'input_jumlah', p_jumlah,
            'jumlah_sebelum', v_old_jumlah,
            'jumlah_sesudah', v_new_jumlah,
            'alasan', p_alasan
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Stok ' || v_prod_nama || ' berhasil disesuaikan (' || v_old_jumlah || ' ➔ ' || v_new_jumlah || ').',
        'old_jumlah', v_old_jumlah,
        'new_jumlah', v_new_jumlah
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.penyesuaian_stok_atomic TO authenticated;
