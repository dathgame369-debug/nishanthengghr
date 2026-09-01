const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const inputCsv = 'reports_rows.csv';
const outputCsv = 'cleaned_reports_rows.csv';

const records = [];
let nextId = Date.now(); // Starts with a 13-digit Unix timestamp

fs.createReadStream(inputCsv)
  .pipe(csv())
  .on('data', (row) => {
    // Check if ID is exactly 13 digits (which is the standard format here)
    // If not (e.g. it's 16 digits, or contains letters/words), we generate a new proper 13-digit ID
    if (!/^\d{13}$/.test(row.id)) {
      row.id = (nextId++).toString();
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
    console.log(`Successfully cleaned all records and saved to ${outputCsv}`);
  });
