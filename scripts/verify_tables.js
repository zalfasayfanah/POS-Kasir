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
    try {
      const data = JSON.parse(body);
      console.log('Public Tables in Database:');
      console.table(data);
    } catch (e) {
      console.log('Response:', body);
    }
  });
});

req.write(JSON.stringify({
  query: `
    SELECT 
      table_name, 
      (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `
}));
req.end();
