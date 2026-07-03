const fs = require('fs');
const dotenvContent = fs.readFileSync('.env', 'utf8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0]] = parts.slice(1).join('=').replace(/^\"|\"$/g, '').trim();
  }
});
const url = env.VITE_SUPABASE_URL + '/rest/v1/payroll?select=*';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(j => fs.writeFileSync('payroll.json', JSON.stringify(j, null, 2)));

const url2 = env.VITE_SUPABASE_URL + '/rest/v1/advances?select=*';
fetch(url2, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(j => fs.writeFileSync('advances.json', JSON.stringify(j, null, 2)));
