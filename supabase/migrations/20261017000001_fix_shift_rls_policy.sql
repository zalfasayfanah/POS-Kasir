-- Migration: 20261017000001_fix_shift_rls_policy.sql
-- Fix: Menambahkan WITH CHECK clause pada policy UPDATE shift_kasir
-- agar Kasir diizinkan mengubah status shift dari 'buka' menjadi 'ditutup' (BR-09).

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
)
WITH CHECK (
    public.get_auth_is_active() = true AND (
        (public.get_auth_peran() = 'kasir' AND kasir_id = auth.uid() AND status IN ('buka', 'ditutup')) OR
        (public.get_auth_peran() = 'kepala_toko' AND cabang_id = public.get_auth_cabang_id()) OR
        (public.get_auth_peran() = 'owner')
    )
);
