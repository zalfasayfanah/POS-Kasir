-- ==============================================================================
-- Fix create_transaksi_atomic Stored Procedure
-- Fixes:
-- 1. Declare v_last_struk_date to resolve undefined column urut_struk_tanggal in IF statement
-- 2. Preserve v_today_wib calculation
-- 3. Validate diskon <= 10% and non-empty alasan_diskon if diskon > 0 (BR-06)
-- 4. Validate uang_diterima and kembalian for tunai and qris (BR-07)
-- ==============================================================================

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
    v_last_struk_date DATE;
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
    INTO v_cabang_kode, v_last_struk_date, v_next_counter
    FROM public.cabang
    WHERE id = v_cabang_id
    FOR UPDATE;

    IF v_last_struk_date IS NULL OR v_last_struk_date < v_today_wib THEN
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

    -- Validasi diskon (maksimal 10% subtotal dan wajib alasan jika > 0, BR-06)
    IF p_diskon < 0 OR p_diskon > ROUND(p_subtotal * 0.10) THEN
        RAISE EXCEPTION 'Diskon maksimal adalah 10%% dari subtotal (BR-06).';
    END IF;

    IF p_diskon > 0 AND (p_alasan_diskon IS NULL OR length(trim(p_alasan_diskon)) = 0) THEN
        RAISE EXCEPTION 'Alasan diskon wajib diisi jika diskon diberikan (BR-06).';
    END IF;

    IF p_total <> (p_subtotal - p_diskon) THEN
        RAISE EXCEPTION 'Total akhir harus sama dengan subtotal dikurangi diskon.';
    END IF;

    -- Validasi pembayaran (BR-07)
    IF p_metode_bayar = 'tunai' THEN
        IF p_uang_diterima < p_total THEN
            RAISE EXCEPTION 'Uang tunai yang diterima tidak boleh kurang dari total belanja (BR-07).';
        END IF;
        IF p_kembalian <> (p_uang_diterima - p_total) THEN
            RAISE EXCEPTION 'Perhitungan kembalian tidak valid (BR-07).';
        END IF;
    ELSIF p_metode_bayar = 'qris' THEN
        IF p_uang_diterima <> p_total THEN
            RAISE EXCEPTION 'Pembayaran QRIS harus sesuai dengan total transaksi (BR-07).';
        END IF;
        IF p_kembalian <> 0 THEN
            RAISE EXCEPTION 'Kembalian QRIS harus Rp 0 (BR-07).';
        END IF;
    ELSE
        RAISE EXCEPTION 'Metode pembayaran tidak valid: %', p_metode_bayar;
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

GRANT EXECUTE ON FUNCTION public.create_transaksi_atomic TO authenticated;
