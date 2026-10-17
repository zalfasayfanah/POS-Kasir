const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('docs/Data_Contoh_POS.xlsx');
console.log('Sheets in workbook:', wb.SheetNames);

const output = {};
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  output[name] = XLSX.utils.sheet_to_json(ws);
  console.log(`Sheet "${name}": ${output[name].length} rows`);
}

fs.writeFileSync('scripts/parsed_excel.json', JSON.stringify(output, null, 2));
console.log('Successfully saved to scripts/parsed_excel.json');
