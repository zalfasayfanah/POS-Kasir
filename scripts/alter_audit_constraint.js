const https = require('https');
const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'rwsynpppttvwmneysezt';

const sql = `
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_aksi_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_aksi_check 
CHECK (aksi IN (
    'void_transaksi',
    'verifikasi_shift',
    'penyesuaian_stok',
    'ubah_harga_jual',
    'ubah_harga_modal',
    'nonaktifkan_produk',
    'ubah_akun',
    'nonaktifkan_akun'
));
`;

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, body));
});
req.write(JSON.stringify({ query: sql }));
req.end();
