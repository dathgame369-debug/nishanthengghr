const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');

const supabaseUrl = 'https://lqmmlgxlevfjqsggaouj.supabase.co';
const supabaseKey = 'sb_publishable_KUWE6Eomt2f3nA-Ys_m_cg_TrEI82cY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadCustomers() {
  const results = [];
  return new Promise((resolve) => {
    fs.createReadStream('d:/Software/nishanthengghr/Report/Company Details.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const row of results) {
          const { error } = await supabase.from('customers').upsert({
            id: row.id,
            name: row.companyName,
            address: row.address || '',
            phone: row.contactNumber || '',
            email: row.email || '',
            gst_number: '',
            contact_person: '',
            status: 'Active',
            number_prefix: ''
          }, { onConflict: 'id' });
          if (error) console.error('Customer error:', error);
        }
        console.log('Customers uploaded.');
        resolve();
      });
  });
}

async function uploadReports() {
  const results = [];
  return new Promise((resolve) => {
    fs.createReadStream('d:/Software/nishanthengghr/Report/Reports.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let i = 0;
        for (const row of results) {
          let id_val = row.id;
          if (!id_val) id_val = 'report_' + Math.abs(hashCode(row.reportNo));
          
          let date_val = row.date;
          if (!date_val) date_val = null;

          const { error } = await supabase.from('reports').upsert({
            id: id_val,
            report_no: row.reportNo,
            current_page: row.currentPage,
            customer_id: row.customerId,
            customer_name: row.customerName,
            date: date_val,
            description: row.description,
            details_of_pattern: row.detailsOfPattern,
            drawing_no: row.drawingNo,
            rows: JSON.parse(row.rows || '[]'),
            total_pages: row.totalPages,
            unit_mode: row.unitMode
          }, { onConflict: 'id' });
          
          if (error) console.error('Report error:', error);
          i++;
          if (i % 50 === 0) console.log(`Uploaded ${i} reports...`);
        }
        console.log('Reports uploaded.');
        resolve();
      });
  });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
  }
  return hash;
}

async function main() {
  await uploadCustomers();
  await uploadReports();
}

main();
