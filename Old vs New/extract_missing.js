const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const newCsvPath = 'reports_rows.csv';
const missingCsvPath = 'missing_records.csv';

const records = [];

fs.createReadStream(newCsvPath)
  .pipe(csv())
  .on('data', (row) => {
    records.push(row);
  })
  .on('end', async () => {
    // The original file had exactly 53 data rows (54 lines including header).
    // The 23 records we appended are at the end.
    const missingRecords = records.slice(53);
    
    const csvWriter = createObjectCsvWriter({
      path: missingCsvPath,
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
    
    await csvWriter.writeRecords(missingRecords);
    console.log(`Extracted ${missingRecords.length} records to ${missingCsvPath}`);
  });
