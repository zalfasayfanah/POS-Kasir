const data = require('./parsed_excel.json');

for (const [k, v] of Object.entries(data)) {
  console.log(`\n=== SHEET: ${k} (${v.length} rows) ===`);
  if (v.length > 0) {
    console.log('Row 0 (Header?):', JSON.stringify(v[0]));
    if (v.length > 1) {
      console.log('Row 1:', JSON.stringify(v[1]));
    }
  }
}
