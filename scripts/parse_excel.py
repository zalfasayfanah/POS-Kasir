import zipfile
import xml.etree.ElementTree as ET
import json
import os

z = zipfile.ZipFile('docs/Data_Contoh_POS.xlsx')

# Load shared strings
shared_strings = []
if 'xl/sharedStrings.xml' in z.namelist():
    sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in sst_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        text = "".join([t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
        shared_strings.append(text)

# Load workbook to map sheet name to rId and path
wb_root = ET.fromstring(z.read('xl/workbook.xml'))
sheets_elem = wb_root.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets')
sheet_map = {}
for s in sheets_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
    sheet_name = s.attrib['name']
    r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
    sheet_map[r_id] = sheet_name

# Load relationships
rels_root = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
sheet_files = {}
for rel in rels_root.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
    r_id = rel.attrib['Id']
    target = rel.attrib['Target']
    if r_id in sheet_map:
        sheet_files[sheet_map[r_id]] = 'xl/' + target if not target.startswith('xl/') else target

print('Found sheets:', list(sheet_files.keys()))

all_data = {}

for sheet_name, sheet_path in sheet_files.items():
    if sheet_path not in z.namelist():
        continue
    sheet_root = ET.fromstring(z.read(sheet_path))
    rows_data = []
    sheet_data = sheet_root.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
    if sheet_data is None:
        continue
    for row in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row_vals = {}
        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            cell_ref = c.attrib.get('r', '')
            col_letter = "".join([ch for ch in cell_ref if ch.isalpha()])
            cell_type = c.attrib.get('t', '')
            val_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = val_elem.text if val_elem is not None else None
            if cell_type == 's' and val is not None:
                val = shared_strings[int(val)]
            row_vals[col_letter] = val
        if row_vals:
            rows_data.append(row_vals)
    all_data[sheet_name] = rows_data

with open('scripts/parsed_excel.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)

print('Parsed all sheets successfully! Written to scripts/parsed_excel.json')
