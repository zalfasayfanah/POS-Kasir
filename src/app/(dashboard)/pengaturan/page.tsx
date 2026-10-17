import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { redirect } from 'next/navigation';
import PengaturanClient from '@/components/pengaturan/PengaturanClient';
import type { Profile, AuditLog, Cabang } from '@/types/database';

export const metadata = {
  title: 'Pengaturan & Audit Log - Lumbung Kopi dan Roti',
  description: 'Manajemen akun staf cabang dan viewer riwayat audit log keamanan',
};

export default async function PengaturanPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  // Khusus Owner yang diizinkan mengakses halaman pengaturan & akun (BR-01)
  if (profile.peran !== 'owner') {
    redirect('/transaksi');
  }

  const supabase = await createClient();

  // 1. Query seluruh akun staf dan cabangnya
  const { data: rawStaff } = await (supabase
    .from('profiles') as any)
    .select(`
      *,
      cabang:cabang(*)
    `)
    .order('peran', { ascending: true })
    .order('nama_lengkap', { ascending: true });

  const staffList: Profile[] = rawStaff || [];

  // 2. Query seluruh audit log
  const { data: rawAudit } = await (supabase
    .from('audit_log') as any)
    .select(`
      *,
      pelaku:profiles(*)
    `)
    .order('dibuat_pada', { ascending: false })
    .limit(100);

  const auditLogs: AuditLog[] = rawAudit || [];

  // 3. Query daftar cabang aktif untuk penugasan staf
  const { data: rawBranches } = await (supabase
    .from('cabang') as any)
    .select('*')
    .eq('aktif', true)
    .order('nama', { ascending: true });

  const branches: Cabang[] = rawBranches || [];

  return (
    <PengaturanClient
      currentProfile={profile}
      staffList={staffList}
      auditLogs={auditLogs}
      branches={branches}
    />
  );
}
