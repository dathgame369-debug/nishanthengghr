const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const inputCsv = 'reports_rows.csv';
const outputCsv = 'perfect_reports.csv';

const records = [];
let nextId = Date.now();

fs.createReadStream(inputCsv)
  .pipe(csv())
  .on('data', (row) => {
    // If we have a merged created_at string due to missing newline
    // E.g. "2026-06-06 15:02:12.782004+00KAKATIKARSHAKPVTLTD_10-Jun-2026_11-08"
    // We can detect it if created_at contains letters like KAKATI
    if (row.created_at && row.created_at.includes('+00') && row.created_at.length > 30) {
       // This row is corrupted, but wait, if created_at has KAKATIKARSHAK, it means
       // the CURRENT row's created_at absorbed the NEXT row's ID and report_no?
       // Actually, the csv-parser would just see a very long created_at.
       // Let's just fix it at the text level first before parsing.
    }
  });

// Instead of parsing the corrupted CSV, let's fix the text of reports_rows.csv first.
const rawText = fs.readFileSync('reports_rows.csv', 'utf8');

// Find the missing newline spot
// It looks like: ...+00KAKATIKARSHAK... OR ...+001784...
// Let's just use regex to insert a newline after +00 if it's followed by word characters or digits.
const fixedText = rawText.replace(/(\+00)([^,\n]{5,})/g, '$1\n$2');

fs.writeFileSync('reports_rows_fixed_temp.csv', fixedText);

// Now parse the fixed one
fs.createReadStream('reports_rows_fixed_temp.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Check if ID is exactly 13 digits
    if (!row.id || !/^\d{13}$/.test(row.id)) {
      row.id = (nextId++).toString();
    }
    
    // Some rows from the old DB might not have created_at, let's fill it
    if (!row.created_at || row.created_at.trim() === '') {
      row.created_at = new Date().toISOString().replace('T', ' ').replace('Z', '+00');
    }

    records.push(row);
  })
  .on('end', async () => {
    const csvWriter = createObjectCsvWriter({
      path: outputCsv,
      header: [
        { id: 'id', title: 'id' },
        { id: 'report_no', title: 'report_no' },
        { id: 'current_page', title: 'current_page' },
        { id: 'customer_id', title: 'customer_id' },
        { id: 'customer_name', title: 'customer_name' },
        { id: 'date', title: 'date' },
        { id: 'description', title: 'description' },
        { id: 'details_of_pattern', title: 'details_of_pattern' },
        { id: 'drawing_no', title: 'drawing_no' },
        { id: 'rows', title: 'rows' },
        { id: 'total_pages', title: 'total_pages' },
        { id: 'unit_mode', title: 'unit_mode' },
        { id: 'created_at', title: 'created_at' }
      ]
    });
    
    await csvWriter.writeRecords(records);
    console.log(`Successfully built perfect CSV with ${records.length} records!`);
  });
