import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollEntry, Employee, formatCurrency } from '@/types/hr';

export function generatePayslipPDF(entry: PayrollEntry, employees: Employee[]) {
  const emp = employees.find(e => e.id === entry.employeeId);
  const doc = new jsPDF('p', 'mm', 'a4');
  renderPayslip(doc, entry, emp, 15);
  doc.save(`Payslip_${entry.employeeId}_${entry.month}_${entry.year || ''}.pdf`);
}

export function generateBulkPayslipPDF(entries: PayrollEntry[], employees: Employee[], layout: 'full' | 'compact') {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (layout === 'full') {
    entries.forEach((entry, i) => {
      if (i > 0) doc.addPage();
      const emp = employees.find(e => e.id === entry.employeeId);
      renderPayslip(doc, entry, emp, 15);
    });
  } else {
    const slipH = 130;
    const margin = 10;
    const perPage = 2;
    entries.forEach((entry, i) => {
      const pos = i % perPage;
      if (i > 0 && pos === 0) doc.addPage();
      const y = margin + pos * (slipH + 5);
      const emp = employees.find(e => e.id === entry.employeeId);
      renderPayslip(doc, entry, emp, y, true);
    });
  }

  doc.save(`Bulk_Payslips_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.pdf`);
}

function renderPayslip(doc: jsPDF, entry: PayrollEntry, emp: Employee | undefined, startY: number, compact = false) {
  const x = 15;
  const w = 180;
  const fs = compact ? 8 : 10;
  const lh = compact ? 5 : 6;
  let y = startY;

  // Border
  const h = compact ? 125 : 180;
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.rect(x - 2, y - 2, w + 4, h);

  // Company header
  doc.setFontSize(compact ? 11 : 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Nishanth Engineering Works', x + w / 2, y + 5, { align: 'center' });
  y += compact ? 7 : 9;

  doc.setFontSize(compact ? 6 : 7);
  doc.setFont('helvetica', 'normal');
  doc.text('102/1, Subbanaickenpalayam School, Street, Chinnavedampatti, Coimbatore, TN 641049', x + w / 2, y + 2, { align: 'center' });
  y += compact ? 6 : 8;

  doc.setFontSize(compact ? 9 : 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYSLIP - ${entry.month} ${entry.year || ''}`, x + w / 2, y + 3, { align: 'center' });
  y += compact ? 7 : 10;

  doc.setDrawColor(180);
  doc.line(x, y, x + w, y);
  y += 3;

  // Employee info
  doc.setFontSize(fs);
  doc.setFont('helvetica', 'normal');
  const info = [
    [`Emp ID: ${entry.employeeId}`, `Name: ${entry.employeeName}`],
    [`Dept: ${emp?.department || '-'}`, `Designation: ${emp?.designation || '-'}`],
    [`Salary: ${formatCurrency(entry.monthlySalary)}`, `Date: ${entry.date}`],
  ];
  info.forEach(row => {
    doc.text(row[0], x, y + lh);
    doc.text(row[1], x + 95, y + lh);
    y += lh;
  });
  y += 2;
  doc.line(x, y, x + w, y);
  y += 3;

  // Earnings table
  const grossEarnings = entry.presentAmount + entry.holidayAmount + entry.otAmount + entry.welfareAmount + entry.bonus;

  const tableData = [
    ['Present Days', `${entry.presentDays} days`, 'Present Amount', formatCurrency(entry.presentAmount)],
    ['Holidays', `${entry.holidays} days`, 'Holiday Amount', formatCurrency(entry.holidayAmount)],
    ['OT Hours', `${entry.otHours} hrs`, 'OT Amount', formatCurrency(entry.otAmount)],
    ['Welfare', '', 'Welfare Amount', formatCurrency(entry.welfareAmount)],
    ['Bonus', '', 'Bonus', formatCurrency(entry.bonus)],
    ['', '', 'Advance Deduction', formatCurrency(entry.advanceDeduction)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Details', 'Component', 'Amount (₹)']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: compact ? 7 : 8, cellPadding: compact ? 1.5 : 2 },
    headStyles: { fillColor: [30, 58, 95], fontSize: compact ? 7 : 8 },
    margin: { left: x, right: x },
    tableWidth: w,
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Summary
  doc.setFontSize(fs);
  doc.setFont('helvetica', 'normal');
  doc.text('Gross Earnings:', x, y + lh);
  doc.text(formatCurrency(grossEarnings), x + 80, y + lh, { align: 'right' });
  doc.text('Total Deductions:', x + 100, y + lh);
  doc.text(formatCurrency(entry.advanceDeduction), x + w, y + lh, { align: 'right' });
  y += lh + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 10 : 12);
  doc.text('Net Payable:', x, y + lh);
  doc.text(formatCurrency(entry.netPayable), x + 80, y + lh, { align: 'right' });

  if (!compact) {
    y += 18;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system generated payslip', x, y);
    doc.line(x + 110, y, x + 145, y);
    doc.text('Authorized Signature', x + 112, y + 4);
    doc.line(x + 150, y, x + w, y);
    doc.text('Company Seal', x + 158, y + 4);
  }
}

export function exportPayrollExcel(entries: PayrollEntry[]) {
  import('xlsx').then(XLSX => {
    import('file-saver').then(({ saveAs }) => {
      const data = entries.map(e => ({
        'Employee ID': e.employeeId, 'Name': e.employeeName, 'Month': e.month, 'Year': e.year || '', 'Date': e.date,
        'Monthly Salary': e.monthlySalary, 'Present Days': e.presentDays, 'Present Amount': e.presentAmount,
        'Holidays': e.holidays, 'Holiday Amount': e.holidayAmount, 'OT Hours': e.otHours,
        'OT Amount': e.otAmount, 'Welfare': e.welfareAmount, 'Advance Deduction': e.advanceDeduction,
        'Bonus': e.bonus, 'Net Payable': e.netPayable,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Payroll_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.xlsx`);
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
  doc.text(`Month: ${entries[0]?.month || 'All'} ${entries[0]?.year || ''}`, 15, 22);

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

  doc.save(`Payroll_Summary_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.pdf`);
}
