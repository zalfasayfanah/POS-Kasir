import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { formatDateWIB } from '@/lib/utils';
import { Settings, Users, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default async function PengaturanPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  // Query seluruh akun staf dan cabang
  const { data: profilesList } = await supabase
    .from('profiles')
    .select('*, cabang:cabang_id(kode, nama)')
    .order('peran', { ascending: true })
    .order('nama_lengkap', { ascending: true });

  // Query 20 audit log terbaru
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*, pelaku:pelaku_id(nama_lengkap, email, peran)')
    .order('dibuat_pada', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            Manajemen Staf & Audit Keamanan (US-10)
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            Pengaturan & Audit Log
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Khusus Owner: <span className="font-semibold text-stone-800">{profile?.nama_lengkap}</span>
          </p>
        </div>
      </div>

      {/* Bagian 1: Akun Staf Cabang */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-700" />
            Daftar 9 Akun Staf Lumbung Kopi dan Roti
          </span>
          <span className="text-xs text-stone-500 font-medium">
            Total Akun: {profilesList?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Cabang Penugasan</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {profilesList?.map((p: any) => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4 font-bold text-stone-900">
                    {p.nama_lengkap}
                  </td>
                  <td className="py-3 px-4 text-stone-600 text-xs font-mono">
                    {p.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                      p.peran === 'owner'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.peran === 'kepala_toko'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.peran}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-700 text-xs">
                    {p.cabang ? `${p.cabang.nama} (${p.cabang.kode})` : 'Pusat'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.aktif ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian 2: Audit Log Viewer (Immutable) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            Audit Log Riwayat Aksi Sensitif (Immutable · BR-12)
          </span>
          <span className="text-xs text-stone-500 font-medium">
            20 Aksi Terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-semibold text-xs uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Pelaku</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Tabel</th>
                <th className="py-3 px-4">Nilai Sebelum / Sesudah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {auditLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-stone-50 text-xs">
                  <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                    {formatDateWIB(log.dibuat_pada)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-800">
                    {log.pelaku?.nama_lengkap || 'System'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded font-bold">
                      {log.aksi}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-600 font-mono">
                    {log.tabel}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-stone-600 max-w-xs truncate">
                    {JSON.stringify(log.nilai_sesudah)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
