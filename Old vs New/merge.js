const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const newCsvPath = 'reports_rows.csv';
const oldCsvPath = 'report.csv';

const existingReportNos = new Set();

const csvWriter = createObjectCsvWriter({
  path: newCsvPath,
  append: true,
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

// 1. Read new CSV to find existing report_nos
fs.createReadStream(newCsvPath)
  .pipe(csv())
  .on('data', (row) => {
    existingReportNos.add(row.report_no);
  })
  .on('end', () => {
    console.log(`Found ${existingReportNos.size} reports in new database.`);
    
    // 2. Read old CSV and find missing
    const missingRecords = [];
    fs.createReadStream(oldCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        if (!existingReportNos.has(row.reportNo)) {
          let dateStr = row.date || '';
          if (dateStr.length === 10) {
            dateStr = dateStr + ' 00:00:00+00';
          }
          
          let idVal = row.id;
          if (!idVal) {
             idVal = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
          }

          missingRecords.push({
            id: idVal,
            report_no: row.reportNo,
            current_page: row.currentPage,
            customer_id: row.customerId,
            customer_name: row.customerName,
            date: dateStr,
            description: row.description,
            details_of_pattern: row.detailsOfPattern,
            drawing_no: row.drawingNo,
            rows: row.rows,
            total_pages: row.totalPages,
            unit_mode: row.unitMode,
            created_at: new Date().toISOString().replace('T', ' ').replace('Z', '+00')
          });
        }
      })
      .on('end', async () => {
        console.log(`Found ${missingRecords.length} missing reports from old database.`);
        if (missingRecords.length > 0) {
          try {
             await csvWriter.writeRecords(missingRecords);
             console.log('Successfully added missing records to new database.');
          } catch (e) {
             console.error('Error writing records', e);
          }
        }
      });
  });
