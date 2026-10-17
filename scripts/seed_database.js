const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const data = JSON.parse(fs.readFileSync('scripts/parsed_excel.json', 'utf8'));

async function seed() {
  console.log('--- START SEEDING SUPABASE DATABASE ---');

  // 1. CABANG
  console.log('1. Seeding cabang...');
  const cabangRows = data['cabang'].map(c => ({
    id: c.id,
    kode: c.kode,
    nama: c.nama,
    alamat: c.alamat || null,
    aktif: c.aktif !== false,
    urut_struk_tanggal: c.urut_struk_tanggal || null,
    urut_struk_terakhir: c.urut_struk_terakhir || 0
  }));
  const { error: errCabang } = await supabase.from('cabang').upsert(cabangRows);
  if (errCabang) throw new Error('Error seeding cabang: ' + JSON.stringify(errCabang));
  console.log(`   Seeded ${cabangRows.length} cabang.`);

  // 2. AUTH USERS & PROFILES
  console.log('2. Seeding auth.users and profiles...');
  const defaultPassword = 'Latihan#2026';
  for (const prof of data['profiles']) {
    const email = prof.email;
    const cabangId = prof.cabang_id ? prof.cabang_id : null;
    const isAktif = prof.aktif === true || prof.aktif === 'true';

    // Check if user exists
    const { data: usersData } = await supabase.auth.admin.listUsers();
    let existing = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!existing) {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        id: prof.id,
        email: email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          nama_lengkap: prof.nama_lengkap,
          peran: prof.peran,
          cabang_id: cabangId,
          aktif: isAktif
        }
      });
      if (createErr) {
        console.warn(`   Warning creating auth user ${email}:`, createErr.message);
      }
    }

    // Upsert into public.profiles to ensure all fields are exact
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: prof.id,
      nama_lengkap: prof.nama_lengkap,
      email: prof.email,
      peran: prof.peran,
      cabang_id: cabangId,
      aktif: isAktif
    });
    if (profErr) {
      console.warn(`   Warning upserting profile ${email}:`, profErr);
    }
  }
  console.log(`   Seeded ${data['profiles'].length} profiles.`);

  // 3. PRODUK
  console.log('3. Seeding produk...');
  const produkRows = data['produk'].map(p => ({
    id: p.id,
    sku: p.sku,
    nama: p.nama,
    kategori: p.kategori,
    harga_jual: p.harga_jual,
    lacak_stok: p.lacak_stok !== false,
    aktif: p.aktif !== false
  }));
  const { error: errProduk } = await supabase.from('produk').upsert(produkRows);
  if (errProduk) throw new Error('Error seeding produk: ' + JSON.stringify(errProduk));
  console.log(`   Seeded ${produkRows.length} produk.`);

  // 4. RIWAYAT HARGA MODAL
  console.log('4. Seeding riwayat_harga_modal...');
  const modalRows = data['riwayat_harga_modal'].map(m => ({
    id: m.id,
    produk_id: m.produk_id,
    harga_modal: m.harga_modal,
    berlaku_mulai: m.berlaku_mulai,
    dibuat_oleh: m.dibuat_oleh || null
  }));
  const { error: errModal } = await supabase.from('riwayat_harga_modal').upsert(modalRows);
  if (errModal) throw new Error('Error seeding riwayat_harga_modal: ' + JSON.stringify(errModal));
  console.log(`   Seeded ${modalRows.length} riwayat harga modal.`);

  // 5. STOK CABANG
  console.log('5. Seeding stok_cabang...');
  const stokRows = data['stok_cabang'].map(s => ({
    id: s.id,
    cabang_id: s.cabang_id,
    produk_id: s.produk_id,
    jumlah: s.jumlah,
    stok_minimum: s.stok_minimum,
    diubah_pada: s.diubah_pada || new Date().toISOString()
  }));
  const { error: errStok } = await supabase.from('stok_cabang').upsert(stokRows);
  if (errStok) throw new Error('Error seeding stok_cabang: ' + JSON.stringify(errStok));
  console.log(`   Seeded ${stokRows.length} stok cabang.`);

  // 6. SHIFT KASIR
  console.log('6. Seeding shift_kasir...');
  const shiftRows = data['shift_kasir'].map(s => ({
    id: s.id,
    cabang_id: s.cabang_id,
    kasir_id: s.kasir_id,
    status: s.status,
    dibuka_pada: s.dibuka_pada,
    kas_awal: s.kas_awal,
    ditutup_pada: s.ditutup_pada || null,
    total_tunai: s.total_tunai || 0,
    total_qris: s.total_qris || 0,
    kas_seharusnya: s.kas_seharusnya || 0,
    uang_fisik: s.uang_fisik != null ? s.uang_fisik : null,
    selisih: s.selisih != null ? s.selisih : null,
    catatan_tutup: s.catatan_tutup || null,
    diverifikasi_oleh: s.diverifikasi_oleh || null,
    diverifikasi_pada: s.diverifikasi_pada || null,
    catatan_verifikasi: s.catatan_verifikasi || null
  }));
  const { error: errShift } = await supabase.from('shift_kasir').upsert(shiftRows);
  if (errShift) throw new Error('Error seeding shift_kasir: ' + JSON.stringify(errShift));
  console.log(`   Seeded ${shiftRows.length} shift kasir.`);

  // 7. TRANSAKSI
  console.log('7. Seeding transaksi...');
  const trxRows = data['transaksi'].map(t => ({
    id: t.id,
    nomor_struk: t.nomor_struk,
    cabang_id: t.cabang_id,
    shift_id: t.shift_id,
    kasir_id: t.kasir_id,
    status: t.status,
    subtotal: t.subtotal,
    diskon: t.diskon || 0,
    alasan_diskon: t.alasan_diskon || null,
    total: t.total,
    metode_bayar: t.metode_bayar,
    uang_diterima: t.uang_diterima,
    kembalian: t.kembalian || 0,
    dibuat_pada: t.dibuat_pada,
    dibayar_pada: t.dibayar_pada || t.dibuat_pada,
    void_oleh: t.void_oleh || null,
    void_pada: t.void_pada || null,
    alasan_void: t.alasan_void || null
  }));
  const { error: errTrx } = await supabase.from('transaksi').upsert(trxRows);
  if (errTrx) throw new Error('Error seeding transaksi: ' + JSON.stringify(errTrx));
  console.log(`   Seeded ${trxRows.length} transaksi.`);

  // 8. TRANSAKSI ITEM
  console.log('8. Seeding transaksi_item...');
  const itemRows = data['transaksi_item'].map(ti => ({
    id: ti.id,
    transaksi_id: ti.transaksi_id,
    produk_id: ti.produk_id,
    nama_produk: ti.nama_produk,
    harga_satuan: ti.harga_satuan,
    jumlah: ti.jumlah,
    subtotal: ti.subtotal
  }));
  // Insert in batches of 50
  for (let i = 0; i < itemRows.length; i += 50) {
    const chunk = itemRows.slice(i, i + 50);
    const { error: errItem } = await supabase.from('transaksi_item').upsert(chunk);
    if (errItem) throw new Error('Error seeding transaksi_item chunk: ' + JSON.stringify(errItem));
  }
  console.log(`   Seeded ${itemRows.length} transaksi items.`);

  // 9. AUDIT LOG
  console.log('9. Seeding audit_log...');
  const auditRows = data['audit_log'].map(a => {
    let pre = null;
    let post = null;
    try {
      pre = typeof a.nilai_sebelum === 'string' ? JSON.parse(a.nilai_sebelum) : a.nilai_sebelum;
    } catch (e) { pre = a.nilai_sebelum; }
    try {
      post = typeof a.nilai_sesudah === 'string' ? JSON.parse(a.nilai_sesudah) : a.nilai_sesudah;
    } catch (e) { post = a.nilai_sesudah; }

    return {
      pelaku_id: a.pelaku_id,
      aksi: a.aksi,
      tabel: a.tabel,
      data_id: a.data_id || null,
      nilai_sebelum: pre,
      nilai_sesudah: post,
      dibuat_pada: a.dibuat_pada
    };
  });
  const { error: errAudit } = await supabase.from('audit_log').insert(auditRows);
  if (errAudit) throw new Error('Error seeding audit_log: ' + JSON.stringify(errAudit));
  console.log(`   Seeded ${auditRows.length} audit logs.`);

  console.log('--- ALL SEEDING COMPLETED SUCCESSFULLY! ---');
}

seed().catch(err => {
  console.error('SEEDING FAILED:', err);
  process.exit(1);
});
