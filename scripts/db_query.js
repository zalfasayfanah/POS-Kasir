const https = require('https');
const token = '';
const projectRef = 'rwsynpppttvwmneysezt';

const sql = process.argv[2];
if (!sql) {
  console.error('Please provide SQL query as argument');
  process.exit(1);
}

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
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.write(JSON.stringify({ query: sql }));
req.end();
