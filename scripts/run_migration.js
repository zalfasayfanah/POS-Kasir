const fs = require('fs');
const https = require('https');
const path = require('path');

const token = '';
const projectRef = 'rwsynpppttvwmneysezt';
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20261017000000_initial_schema.sql');

const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('Applying migration to Supabase project:', projectRef);

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
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('SUCCESS: Migration applied cleanly!');
    } else {
      console.error('ERROR Response:', body);
    }
  });
});

req.on('error', err => {
  console.error('Request failed:', err);
});

req.write(JSON.stringify({ query: sql }));
req.end();
