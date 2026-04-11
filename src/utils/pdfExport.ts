import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollEntry, Employee, formatCurrency } from '@/types/hr';

export function generatePayslipPDF(entry: PayrollEntry, employees: Employee[]) {
  const emp = employees.find(e => e.id === entry.employeeId);
  const doc = new jsPDF('p', 'mm', 'a4');
  renderPayslip(doc, entry, emp, 15, false);
  doc.save(`Payslip_${entry.employeeId}_${entry.month}.pdf`);
}

export function generateBulkPayslipPDF(entries: PayrollEntry[], employees: Employee[], layout: 'full' | 'compact') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageH = 297;

  if (layout === 'full') {
    entries.forEach((entry, i) => {
      if (i > 0) doc.addPage();
      const emp = employees.find(e => e.id === entry.employeeId);
      renderPayslip(doc, entry, emp, 15, false);
    });
  } else {
    const slipHeight = 90;
    const margin = 10;
    const perPage = Math.floor((pageH - 2 * margin) / (slipHeight + 5));
    entries.forEach((entry, i) => {
      const posOnPage = i % perPage;
      if (i > 0 && posOnPage === 0) doc.addPage();
      const y = margin + posOnPage * (slipHeight + 5);
      const emp = employees.find(e => e.id === entry.employeeId);
      renderPayslip(doc, entry, emp, y, true);
    });
  }

  doc.save(`Bulk_Payslips_${entries[0]?.month || 'All'}.pdf`);
}

function renderPayslip(doc: jsPDF, entry: PayrollEntry, emp: Employee | undefined, startY: number, compact: boolean) {
  const w = 180;
  const x = 15;
  const fs = compact ? 7 : 9;
  const lh = compact ? 4 : 5.5;
  let y = startY;

  // Border
  const height = compact ? 85 : 200;
  doc.setDrawColor(150);
  doc.rect(x - 2, y - 2, w + 4, height);

  // Header
  doc.setFontSize(compact ? 10 : 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Nishanth Engineering Works', x + w / 2, y + (compact ? 4 : 6), { align: 'center' });
  y += compact ? 5 : 8;

  doc.setFontSize(compact ? 6 : 7);
  doc.setFont('helvetica', 'normal');
  doc.text('102/1, Subbanaickenpalayam School, Street, Chinnavedampatti, Coimbatore, TN 641049', x + w / 2, y + 2, { align: 'center' });
  y += compact ? 5 : 8;

  doc.setFontSize(compact ? 8 : 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYSLIP - ${entry.month}`, x + w / 2, y + 3, { align: 'center' });
  y += compact ? 6 : 10;

  doc.setDrawColor(200);
  doc.line(x, y, x + w, y);
  y += 2;

  // Employee info
  doc.setFontSize(fs);
  doc.setFont('helvetica', 'normal');
  const info = [
    [`Employee ID: ${entry.employeeId}`, `Name: ${entry.employeeName}`],
    [`Department: ${emp?.department || '-'}`, `Designation: ${emp?.designation || '-'}`],
    [`Fixed Salary: ${formatCurrency(entry.monthlySalary)}`, `Date: ${entry.date}`],
  ];
  info.forEach(row => {
    doc.text(row[0], x, y + lh);
    doc.text(row[1], x + 95, y + lh);
    y += lh;
  });
  y += 2;
  doc.line(x, y, x + w, y);
  y += 2;

  // Earnings & Deductions side by side
  const grossEarnings = entry.presentAmount + entry.holidayAmount + entry.otAmount + entry.welfareAmount + entry.bonus;
  const earnings = [
    ['Present Days', `${entry.presentDays} days`],
    ['Present Amount', formatCurrency(entry.presentAmount)],
    ['Holidays', `${entry.holidays} days`],
    ['Holiday Amount', formatCurrency(entry.holidayAmount)],
    ['OT Hours', `${entry.otHours} hrs`],
    ['OT Amount', formatCurrency(entry.otAmount)],
    ['Welfare', formatCurrency(entry.welfareAmount)],
    ['Bonus', formatCurrency(entry.bonus)],
  ];

  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS', x, y + lh);
  doc.text('DEDUCTIONS', x + 100, y + lh);
  y += lh + 1;

  doc.setFont('helvetica', 'normal');
  earnings.forEach((row, i) => {
    doc.text(row[0], x, y + lh);
    doc.text(row[1], x + 80, y + lh, { align: 'right' });
    if (i === 0) {
      doc.text('Advance Deduction', x + 100, y + lh);
      doc.text(formatCurrency(entry.advanceDeduction), x + w, y + lh, { align: 'right' });
    }
    y += lh;
  });

  y += 2;
  doc.line(x, y, x + w, y);
  y += lh;

  // Summary
  doc.setFont('helvetica', 'normal');
  doc.text('Gross Earnings:', x, y + lh);
  doc.text(formatCurrency(grossEarnings), x + 80, y + lh, { align: 'right' });
  doc.text('Total Deductions:', x + 100, y + lh);
  doc.text(formatCurrency(entry.advanceDeduction), x + w, y + lh, { align: 'right' });
  y += lh + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 9 : 11);
  doc.text('Net Payable:', x, y + lh);
  doc.text(formatCurrency(entry.netPayable), x + 80, y + lh, { align: 'right' });

  if (!compact) {
    y += 20;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system generated payslip', x, y);
    doc.line(x + 100, y, x + 140, y);
    doc.text('Authorized Signature', x + 105, y + 4);
    doc.line(x + 150, y, x + w, y);
    doc.text('Company Seal', x + 158, y + 4);
  }
}

export function exportPayrollExcel(entries: PayrollEntry[]) {
  import('xlsx').then(XLSX => {
    import('file-saver').then(({ saveAs }) => {
      const data = entries.map(e => ({
        'Employee ID': e.employeeId, 'Name': e.employeeName, 'Month': e.month, 'Date': e.date,
        'Monthly Salary': e.monthlySalary, 'Present Days': e.presentDays, 'Present Amount': e.presentAmount,
        'Holidays': e.holidays, 'Holiday Amount': e.holidayAmount, 'OT Hours': e.otHours,
        'OT Amount': e.otAmount, 'Welfare': e.welfareAmount, 'Advance Deduction': e.advanceDeduction,
        'Bonus': e.bonus, 'Net Payable': e.netPayable,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Payroll_${entries[0]?.month || 'All'}.xlsx`);
    });
  });
}

export function exportPayrollPDF(entries: PayrollEntry[]) {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Nishanth Engineering Works — Payroll Summary', 15, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Month: ${entries[0]?.month || 'All'}`, 15, 22);

  autoTable(doc, {
    startY: 28,
    head: [['Emp ID', 'Name', 'Salary', 'Present', 'Pres Amt', 'Holidays', 'Hol Amt', 'OT Hrs', 'OT Amt', 'Welfare', 'Adv Ded', 'Bonus', 'Net Pay']],
    body: entries.map(e => [
      e.employeeId, e.employeeName, formatCurrency(e.monthlySalary),
      e.presentDays, formatCurrency(e.presentAmount), e.holidays, formatCurrency(e.holidayAmount),
      e.otHours, formatCurrency(e.otAmount), formatCurrency(e.welfareAmount),
      formatCurrency(e.advanceDeduction), formatCurrency(e.bonus), formatCurrency(e.netPayable),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  doc.save(`Payroll_Summary_${entries[0]?.month || 'All'}.pdf`);
}
