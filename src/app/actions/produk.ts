'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/app/auth/actions';
import type { KategoriProduk } from '@/types/database';

export interface ProdukActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * US-08: Tambah Produk Baru (Khusus Owner)
 */
export async function tambahProdukAction(formData: FormData): Promise<ProdukActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif || profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Owner yang berhak menambah produk baru (US-08).',
    };
  }

  const sku = (formData.get('sku') as string || '').trim().toUpperCase();
  const nama = (formData.get('nama') as string || '').trim();
  const kategori = formData.get('kategori') as KategoriProduk;
  const hargaJual = Math.round(Number(formData.get('harga_jual')));
  const lacakStok = formData.get('lacak_stok') === 'true';
  const rawModalAwal = formData.get('harga_modal_awal');
  const hargaModalAwal = rawModalAwal ? Math.round(Number(rawModalAwal)) : null;

  if (!sku || !nama || !kategori) {
    return { success: false, error: 'SKU, nama produk, dan kategori wajib diisi.' };
  }

  if (isNaN(hargaJual) || hargaJual <= 0) {
    return { success: false, error: 'Harga jual harus berupa nominal lebih dari 0.' };
  }

  const supabase = await createClient();

  // 1. Insert Produk
  const { data: newProd, error: insertError } = await (supabase
    .from('produk') as any)
    .insert({
      sku,
      nama,
      kategori,
      harga_jual: hargaJual,
      lacak_stok: lacakStok,
      aktif: true,
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: `Gagal membuat produk: ${insertError.message}` };
  }

  // 2. Jika produk melacak stok, inisialisasi baris di stok_cabang untuk semua cabang aktif
  if (lacakStok) {
    const { data: cabangList } = await (supabase.from('cabang') as any).select('id').eq('aktif', true);
    if (cabangList && cabangList.length > 0) {
      const stokRows = cabangList.map((c: any) => ({
        cabang_id: c.id,
        produk_id: newProd.id,
        jumlah: 0,
        stok_minimum: 5,
      }));
      await (supabase.from('stok_cabang') as any).insert(stokRows);
    }
  }

  // 3. Jika harga modal awal diinput, tambahkan ke riwayat_harga_modal
  if (hargaModalAwal !== null && !isNaN(hargaModalAwal) && hargaModalAwal >= 0) {
    await (supabase.from('riwayat_harga_modal') as any).insert({
      produk_id: newProd.id,
      harga_modal: hargaModalAwal,
      berlaku_mulai: new Date().toISOString(),
      dibuat_oleh: profile.id,
    });
  }

  revalidatePath('/produk');
  revalidatePath('/kasir');
  revalidatePath('/stok');

  return {
    success: true,
    message: `Produk "${nama}" (${sku}) berhasil ditambahkan ke katalog.`,
  };
}

/**
 * US-08: Edit Detail & Harga Jual Produk (Khusus Owner)
 */
export async function updateProdukAction(formData: FormData): Promise<ProdukActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif || profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Owner yang berhak mengubah data produk (US-08).',
    };
  }

  const id = formData.get('id') as string;
  const nama = (formData.get('nama') as string || '').trim();
  const kategori = formData.get('kategori') as KategoriProduk;
  const hargaJual = Math.round(Number(formData.get('harga_jual')));
  const aktif = formData.get('aktif') === 'true';

  if (!id || !nama || !kategori) {
    return { success: false, error: 'Data produk tidak lengkap.' };
  }

  if (isNaN(hargaJual) || hargaJual <= 0) {
    return { success: false, error: 'Harga jual harus lebih dari 0.' };
  }

  const supabase = await createClient();

  // Ambil data produk lama untuk audit log (BR-12)
  const { data: oldProd } = await (supabase
    .from('produk') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (!oldProd) {
    return { success: false, error: 'Produk tidak ditemukan.' };
  }

  // Update Produk
  const { error: updateError } = await (supabase
    .from('produk') as any)
    .update({
      nama,
      kategori,
      harga_jual: hargaJual,
      aktif,
      diubah_pada: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return { success: false, error: `Gagal memperbarui produk: ${updateError.message}` };
  }

  // Catat Audit Log jika harga jual berubah (BR-12)
  if (oldProd.harga_jual !== hargaJual) {
    await (supabase.from('audit_log') as any).insert({
      pelaku_id: profile.id,
      aksi: 'ubah_harga_jual',
      tabel: 'produk',
      data_id: id,
      nilai_sebelum: { harga_jual: oldProd.harga_jual, nama: oldProd.nama },
      nilai_sesudah: { harga_jual: hargaJual, nama },
    });
  }

  // Catat Audit Log jika produk dinonaktifkan (BR-12)
  if (oldProd.aktif === true && aktif === false) {
    await (supabase.from('audit_log') as any).insert({
      pelaku_id: profile.id,
      aksi: 'nonaktifkan_produk',
      tabel: 'produk',
      data_id: id,
      nilai_sebelum: { aktif: true, nama: oldProd.nama },
      nilai_sesudah: { aktif: false, nama },
    });
  }

  revalidatePath('/produk');
  revalidatePath('/kasir');

  return {
    success: true,
    message: `Produk "${nama}" berhasil diperbarui.`,
  };
}

/**
 * BR-11: Tambah Harga Modal Baru dengan Tanggal Berlaku (Khusus Owner)
 * Aturan Bisnis:
 * - Hanya Owner yang berhak menambah atau melihat harga modal
 * - Tanggal berlaku (berlaku_mulai) tidak boleh di masa lalu (BR-11)
 * - Mencatat aksi ke audit_log
 */
export async function tambahHargaModalAction(formData: FormData): Promise<ProdukActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.aktif || profile.peran !== 'owner') {
    return {
      success: false,
      error: 'Hanya Owner yang memiliki wewenang untuk mengatur harga modal (BR-11).',
    };
  }

  const produkId = formData.get('produk_id') as string;
  const rawHargaModal = formData.get('harga_modal');
  const berlakuMulai = formData.get('berlaku_mulai') as string; // Format: YYYY-MM-DD atau ISO

  if (!produkId || !rawHargaModal || !berlakuMulai) {
    return { success: false, error: 'Data produk, harga modal, dan tanggal berlaku wajib diisi.' };
  }

  const hargaModal = Math.round(Number(rawHargaModal));
  if (isNaN(hargaModal) || hargaModal < 0) {
    return { success: false, error: 'Harga modal harus berupa angka 0 atau lebih.' };
  }

  // Validasi BR-11: berlaku_mulai tidak boleh di masa lalu
  // Cek tanggal hari ini di WIB (Asia/Jakarta)
  const todayWIBStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date()); // format YYYY-MM-DD

  const inputDateStr = berlakuMulai.slice(0, 10);
  if (inputDateStr < todayWIBStr) {
    return {
      success: false,
      error: `Tanggal berlaku (${inputDateStr}) tidak boleh di masa lalu (Hari ini WIB: ${todayWIBStr}) (BR-11).`,
    };
  }

  const supabase = await createClient();

  // Ambil data produk
  const { data: prod } = await (supabase
    .from('produk') as any)
    .select('nama, sku')
    .eq('id', produkId)
    .single();

  // Insert riwayat harga modal
  const effectiveTimestamp = new Date(berlakuMulai).toISOString();
  const { error: insertError } = await (supabase
    .from('riwayat_harga_modal') as any)
    .insert({
      produk_id: produkId,
      harga_modal: hargaModal,
      berlaku_mulai: effectiveTimestamp,
      dibuat_oleh: profile.id,
    });

  if (insertError) {
    return {
      success: false,
      error: `Gagal menyimpan harga modal: ${insertError.message}. Pastikan tanggal berlaku belum terdaftar untuk produk ini.`,
    };
  }

  // Catat ke Audit Log (BR-12)
  await (supabase.from('audit_log') as any).insert({
    pelaku_id: profile.id,
    aksi: 'ubah_harga_modal',
    tabel: 'riwayat_harga_modal',
    data_id: produkId,
    nilai_sebelum: null,
    nilai_sesudah: {
      produk_sku: prod?.sku,
      produk_nama: prod?.nama,
      harga_modal: hargaModal,
      berlaku_mulai: effectiveTimestamp,
    },
  });

  revalidatePath('/produk');
  revalidatePath('/laporan');

  return {
    success: true,
    message: `Harga modal baru untuk "${prod?.nama}" (Rp ${hargaModal.toLocaleString('id-ID')}) berhasil ditetapkan mulai ${inputDateStr}.`,
  };
}
