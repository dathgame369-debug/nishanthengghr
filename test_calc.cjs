const fs = require('fs');
const payroll = JSON.parse(fs.readFileSync('payroll.json', 'utf8'));
const advances = JSON.parse(fs.readFileSync('advances.json', 'utf8'));

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getBalanceAtMonth(employeeId, entryMonth, entryYear, allPayroll, allAdvances) {
  const entryMonthIdx = MONTHS.indexOf(entryMonth);
  const eYear = Number(entryYear);

  const totalAdvances = allAdvances
    .filter(a => a.employee_id === employeeId)
    .reduce((sum, a) => sum + (Number(a.advance_amount) || 0), 0);

  const deductedSoFar = allPayroll.reduce((sum, p) => {
    if (p.employee_id !== employeeId) return sum;
    
    const pYear = Number(p.year) || eYear;
    const pMonthIdx = MONTHS.indexOf(p.month);
    
    if (pYear < eYear || (pYear === eYear && pMonthIdx <= entryMonthIdx)) {
      return sum + (Number(p.advance_deduction) || 0);
    }
    return sum;
  }, 0);
  
  console.log({ employeeId, entryMonth, entryYear, totalAdvances, deductedSoFar });
  return Math.max(0, totalAdvances - deductedSoFar);
}

console.log("June Balance:", getBalanceAtMonth("EMP002", "June", 2026, payroll, advances));
console.log("July Balance:", getBalanceAtMonth("EMP002", "July", 2026, payroll, advances));
