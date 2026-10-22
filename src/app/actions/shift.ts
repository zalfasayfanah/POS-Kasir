'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';

export interface ShiftActionResult {
  success: boolean;
  message?: string;
  error?: string;
  shiftId?: string;
}

/**
 * BR-02: Pembukaan Shift Kasir Baru
 * - Kas awal: Rp 0 s/d Rp 2.000.000
 * - Kasir hanya boleh punya maksimal 1 shift aktif berstatus 'buka'
 */
export async function bukaShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi Anda tidak valid atau akun dinonaktifkan.' };
  }

  if (profile.peran !== 'kasir' && profile.peran !== 'owner') {
    return { success: false, error: 'Hanya Kasir atau Owner yang dapat membuka shift transaksi.' };
  }

  const cabangId = profile.cabang_id;
  if (!cabangId) {
    return { success: false, error: 'Profil Anda belum terhubung ke cabang tertentu.' };
  }

  const rawKasAwal = formData.get('kas_awal');
  const kasAwal = Number(rawKasAwal);

  // Validasi BR-02: rentang kas awal
  if (isNaN(kasAwal) || kasAwal < 0 || kasAwal > 2000000) {
    return {
      success: false,
      error: 'Kas awal wajib berada di antara Rp 0 dan Rp 2.000.000 (BR-02).',
    };
  }

  const supabase = await createClient();

  // Validasi BR-02: Pencegahan multi-shift
  const { data: existingOpenShift, error: checkError } = await supabase
    .from('shift_kasir')
    .select('id, dibuka_pada')
    .eq('kasir_id', profile.id)
    .eq('status', 'buka')
    .maybeSingle();

  if (checkError) {
    return { success: false, error: `Gagal memeriksa status shift: ${checkError.message}` };
  }

  if (existingOpenShift) {
    return {
      success: false,
      error: 'Anda sudah memiliki shift yang masih aktif. Harap tutup shift tersebut sebelum membuka shift baru (BR-02).',
    };
  }

  // Insert shift baru
  const { data: newShift, error: insertError } = await (supabase
    .from('shift_kasir') as any)
    .insert({
      cabang_id: cabangId,
      kasir_id: profile.id,
      status: 'buka',
      kas_awal: Math.round(kasAwal),
      kas_seharusnya: Math.round(kasAwal),
      total_tunai: 0,
      total_qris: 0,
      dibuka_pada: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: `Gagal membuka shift: ${insertError.message}` };
  }

  // Catat audit log (BR-12)
  await (supabase.from('audit_log') as any).insert({
    pelaku_id: profile.id,
    aksi: 'buka_shift',
    tabel: 'shift_kasir',
    data_id: newShift.id,
    nilai_sebelum: null,
    nilai_sesudah: {
      status: 'buka',
      kas_awal: Math.round(kasAwal),
      cabang_id: cabangId,
      kasir_id: profile.id,
    },
  });

  revalidatePath('/shift');
  revalidatePath('/kasir');
  revalidatePath('/shift-cabang');

  return {
    success: true,
    message: 'Shift kasir berhasil dibuka. Anda sekarang dapat memproses transaksi POS.',
    shiftId: newShift.id,
  };
}

/**
 * BR-09: Penutupan Shift Kasir
 * - Hitung kas_seharusnya = kas_awal + total_tunai transaksi lunas
 * - Hitung selisih = uang_fisik - kas_seharusnya
 * - Jika |selisih| > 20.000, catatan_tutup WAJIB diisi
 * - Bekukan shift: status = 'ditutup'
 */
export async function tutupShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi Anda tidak valid atau akun dinonaktifkan.' };
  }

  const shiftId = formData.get('shift_id') as string;
  const rawUangFisik = formData.get('uang_fisik');
  const catatanTutup = (formData.get('catatan_tutup') as string || '').trim();

  if (!shiftId) {
    return { success: false, error: 'ID Shift tidak ditemukan.' };
  }

  const uangFisik = Number(rawUangFisik);
  if (isNaN(uangFisik) || uangFisik < 0) {
    return { success: false, error: 'Jumlah uang fisik di laci tidak valid.' };
  }

  const supabase = await createClient();

  // Ambil data shift
  const { data: shift, error: fetchError } = await (supabase
    .from('shift_kasir') as any)
    .select('*')
    .eq('id', shiftId)
    .single();

  if (fetchError || !shift) {
    return { success: false, error: 'Shift tidak ditemukan di database.' };
  }

  if (shift.status !== 'buka') {
    return { success: false, error: `Shift ini sudah ${shift.status} dan tidak dapat ditutup lagi.` };
  }

  // Wewenang: hanya kasir pembuat shift atau owner
  if (shift.kasir_id !== profile.id && profile.peran !== 'owner') {
    return { success: false, error: 'Anda hanya dapat menutup shift milik Anda sendiri.' };
  }

  // Validasi PRD Bagian 11 poin 5: Shift tidak dapat ditutup selama masih ada transaksi menunggu_bayar
  const { count: pendingTrxCount, error: pendingTrxError } = await (supabase
    .from('transaksi') as any)
    .select('id', { count: 'exact', head: true })
    .eq('shift_id', shift.id)
    .eq('status', 'menunggu_bayar');

  if (pendingTrxError) {
    return { success: false, error: `Gagal memeriksa transaksi pending: ${pendingTrxError.message}` };
  }

  if (pendingTrxCount && pendingTrxCount > 0) {
    return {
      success: false,
      error: `Shift tidak dapat ditutup karena masih terdapat ${pendingTrxCount} transaksi QRIS berstatus 'menunggu_bayar'. Selesaikan pembayaran atau batalkan transaksi terlebih dahulu (PRD Bagian 11).`,
    };
  }

  // Hitung akumulasi riil dari transaksi lunas pada shift ini
  const { data: transaksiList, error: trxError } = await (supabase
    .from('transaksi') as any)
    .select('total, metode_bayar')
    .eq('shift_id', shift.id)
    .eq('status', 'lunas');

  if (trxError) {
    return { success: false, error: `Gagal menghitung transaksi shift: ${trxError.message}` };
  }

  let totalTunai = 0;
  let totalQris = 0;

  for (const trx of (transaksiList || []) as any[]) {
    if (trx.metode_bayar === 'tunai') {
      totalTunai += trx.total;
    } else if (trx.metode_bayar === 'qris') {
      totalQris += trx.total;
    }
  }

  const kasSeharusnya = shift.kas_awal + totalTunai;
  const selisih = Math.round(uangFisik) - kasSeharusnya;

  // Validasi BR-09: Selisih > Rp 20.000 wajib catatan
  if (Math.abs(selisih) > 20000 && (!catatanTutup || catatanTutup.length < 3)) {
    return {
      success: false,
      error: `Selisih kas (${selisih < 0 ? '-' : '+'}Rp ${Math.abs(selisih).toLocaleString('id-ID')}) melebihi batas toleransi Rp 20.000. Catatan penutupan wajib diisi dengan alasan yang jelas (BR-09).`,
    };
  }

  const sekarang = new Date().toISOString();

  // Update status shift menjadi 'ditutup'
  const { error: updateError } = await (supabase
    .from('shift_kasir') as any)
    .update({
      status: 'ditutup',
      ditutup_pada: sekarang,
      total_tunai: totalTunai,
      total_qris: totalQris,
      kas_seharusnya: kasSeharusnya,
      uang_fisik: Math.round(uangFisik),
      selisih: selisih,
      catatan_tutup: catatanTutup || null,
    })
    .eq('id', shift.id);

  if (updateError) {
    return { success: false, error: `Gagal menutup shift: ${updateError.message}` };
  }

  // Catat audit log (BR-12)
  await (supabase.from('audit_log') as any).insert({
    pelaku_id: profile.id,
    aksi: 'tutup_shift',
    tabel: 'shift_kasir',
    data_id: shift.id,
    nilai_sebelum: {
      status: shift.status,
      kas_awal: shift.kas_awal,
    },
    nilai_sesudah: {
      status: 'ditutup',
      ditutup_pada: sekarang,
      total_tunai: totalTunai,
      total_qris: totalQris,
      kas_seharusnya: kasSeharusnya,
      uang_fisik: Math.round(uangFisik),
      selisih: selisih,
      catatan_tutup: catatanTutup || null,
    },
  });

  revalidatePath('/shift');
  revalidatePath('/kasir');
  revalidatePath('/shift-cabang');

  return {
    success: true,
    message: 'Shift kasir berhasil ditutup dan dibekukan. Menunggu verifikasi dari Kepala Toko/Owner.',
  };
}

/**
 * BR-10 & BR-12: Verifikasi Shift Kasir oleh Kepala Toko / Owner
 * - Memanggil stored procedure `verifikasi_shift_atomic`
 * - Mengubah status 'ditutup' ➔ 'diverifikasi'
 * - Mencatat ke audit_log
 */
export async function verifikasiShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif) {
    return { success: false, error: 'Sesi Anda tidak valid atau akun dinonaktifkan.' };
  }

  if (profile.peran !== 'kepala_toko' && profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Kepala Toko cabang terkait atau Owner yang berhak memverifikasi shift (BR-10).',
    };
  }

  const shiftId = formData.get('shift_id') as string;
  const catatanVerifikasi = (formData.get('catatan_verifikasi') as string || '').trim();

  if (!shiftId) {
    return { success: false, error: 'ID Shift tidak ditemukan.' };
  }

  const supabase = await createClient();

  // Jalankan stored procedure atomic di Supabase
  const { data, error } = await supabase.rpc('verifikasi_shift_atomic', {
    p_shift_id: shiftId,
    p_catatan_verifikasi: catatanVerifikasi || null,
  } as any);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/shift');
  revalidatePath('/shift-cabang');

  return {
    success: true,
    message: 'Shift kasir berhasil diverifikasi dan disetujui (BR-10).',
  };
}
