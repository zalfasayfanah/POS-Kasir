const http = require('http');

http.get('http://localhost:3000/login', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const matches = data.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || [];
    console.log('Stylesheets in HTML:', matches);
    const styles = data.match(/<style[^>]*>[\s\S]*?<\/style>/g) || [];
    console.log('Inline style tags count:', styles.length);
  });
});
