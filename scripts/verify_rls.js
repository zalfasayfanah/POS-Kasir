const https = require('https');

const token = '';
const projectRef = 'rwsynpppttvwmneysezt';

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
    const data = JSON.parse(body);
    console.log('RLS Status on Public Tables:');
    console.table(data);
  });
});

req.write(JSON.stringify({
  query: `
    SELECT 
      relname AS table_name,
      relrowsecurity AS rls_enabled,
      relforcerowsecurity AS rls_forced
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE pg_namespace.nspname = 'public' 
      AND relkind = 'r'
    ORDER BY relname;
  `
}));
req.end();
