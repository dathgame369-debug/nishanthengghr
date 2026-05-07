import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollEntry, Employee, Advance } from '@/types/hr';

// Helvetica (jsPDF default) doesn't support the ₹ glyph — it renders as a box
// or superscript "1". Use "Rs." prefix for reliable rendering across viewers.
function money(n: number): string {
  return 'Rs. ' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generatePayslipPDF(entry: PayrollEntry, employees: Employee[], advances: Advance[] = []) {
  const emp = employees.find(e => e.id === entry.employeeId);
  const doc = new jsPDF('p', 'mm', 'a4');
  const adv = advances.find(a => a.employeeId === entry.employeeId);
  renderPayslip(doc, entry, emp, 15, false, adv);
  doc.save(`Payslip_${entry.employeeId}_${entry.month}_${entry.year || ''}.pdf`);
}

export function generateBulkPayslipPDF(entries: PayrollEntry[], employees: Employee[], layout: 'full' | 'compact', advances: Advance[] = []) {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (layout === 'full') {
    entries.forEach((entry, i) => {
      if (i > 0) doc.addPage();
      const emp = employees.find(e => e.id === entry.employeeId);
      const adv = advances.find(a => a.employeeId === entry.employeeId);
      renderPayslip(doc, entry, emp, 15, false, adv);
    });
  } else {
    // 4 payslips per A4 page in a 2x2 grid
    const margin = 8;
    const gap = 6;
    const pageW = 210;
    const pageH = 297;
    const slipW = (pageW - margin * 2 - gap) / 2;   // ~94mm
    const slipH = (pageH - margin * 2 - gap) / 2;   // ~138mm
    const perPage = 4;
    entries.forEach((entry, i) => {
      const pos = i % perPage;
      if (i > 0 && pos === 0) doc.addPage();
      const col = pos % 2;
      const row = Math.floor(pos / 2);
      const x = margin + col * (slipW + gap);
      const y = margin + row * (slipH + gap);
      const emp = employees.find(e => e.id === entry.employeeId);
      const adv = advances.find(a => a.employeeId === entry.employeeId);
      renderPayslipMini(doc, entry, emp, x, y, slipW, slipH, adv);
    });
  }

  doc.save(`Bulk_Payslips_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.pdf`);
}

// Compact payslip rendering for 4-up grid layout (positioned by x,y,w,h)
function renderPayslipMini(doc: jsPDF, entry: PayrollEntry, emp: Employee | undefined, x: number, y: number, w: number, h: number, adv?: Advance) {
  const grossEarnings =
    entry.presentAmount + entry.holidayAmount + entry.otAmount + entry.welfareAmount + entry.bonus;

  // Outer border
  doc.setDrawColor(60);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);

  // Header band
  const headerH = 14;
  doc.setFillColor(30, 58, 95);
  doc.rect(x, y, w, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NISHANTH ENGINEERING WORKS', x + w / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Chinnavedampatti, Coimbatore, TN 641049', x + w / 2, y + 8.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`PAYSLIP — ${entry.month.toUpperCase()} ${entry.year || ''}`, x + w / 2, y + 12, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Employee info
  let iy = y + headerH + 4;
  const lh = 3.8;
  doc.setFontSize(7);
  const pair = (lx: number, label: string, value: string, maxW = w / 2 - 4) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(label, lx, iy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const v = doc.splitTextToSize(value, maxW - 16)[0];
    doc.text(v, lx + 16, iy);
  };
  pair(x + 2, 'ID', entry.employeeId);
  pair(x + w / 2, 'Date', entry.date);
  iy += lh;
  pair(x + 2, 'Name', entry.employeeName);
  iy += lh;
  pair(x + 2, 'Dept', emp?.department || '-');
  pair(x + w / 2, 'Desig', emp?.designation || '-');
  iy += lh;
  pair(x + 2, 'Salary', money(entry.monthlySalary));

  // Earnings / Deductions tables
  const tableTop = iy + 3;
  const halfW = (w - 6) / 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['EARNINGS', 'AMT']],
    body: [
      [`Present (${entry.presentDays}d)`, money(entry.presentAmount)],
      [`Holiday (${entry.holidays}d)`, money(entry.holidayAmount)],
      [`OT (${entry.otHours}h)`, money(entry.otAmount)],
      ['Welfare', money(entry.welfareAmount)],
      ['Bonus', money(entry.bonus)],
      [{ content: 'Gross', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
       { content: money(grossEarnings), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 244, 250] } }],
    ],
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 6, halign: 'left' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: x + 2 },
    tableWidth: halfW,
  });
  const earnEndY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: tableTop,
    head: [['DEDUCTIONS', 'AMT']],
    body: [
      ['Total Adv Ded', money(adv?.totalDeducted || 0)],
      ['Remaining Adv', money(adv ? Math.max(0, adv.advanceAmount - adv.totalDeducted) : 0)],
      ['', ''],
      ['', ''],
      ['', ''],
      [{ content: 'Total', styles: { fontStyle: 'bold', fillColor: [250, 240, 240] } },
       { content: money(entry.advanceDeduction), styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 240, 240] } }],
    ],
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [120, 35, 35], textColor: 255, fontSize: 6, halign: 'left' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: x + 4 + halfW },
    tableWidth: halfW,
  });
  const dedEndY = (doc as any).lastAutoTable.finalY;

  // Net payable band
  const ny = Math.max(earnEndY, dedEndY) + 2;
  const netH = 8;
  doc.setFillColor(30, 58, 95);
  doc.rect(x + 2, ny, w - 4, netH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NET PAYABLE', x + 5, ny + 5.2);
  doc.text(money(entry.netPayable), x + w - 5, ny + 5.2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

// Excel export specifically for payslips (per-row breakdown)
export function exportPayslipsExcel(entries: PayrollEntry[], employees: Employee[]) {
  import('xlsx').then(XLSX => {
    import('file-saver').then(({ saveAs }) => {
      const data = entries.map(e => {
        const emp = employees.find(x => x.id === e.employeeId);
        const gross = e.presentAmount + e.holidayAmount + e.otAmount + e.welfareAmount + e.bonus;
        return {
          'Employee ID': e.employeeId,
          'Name': e.employeeName,
          'Department': emp?.department || '',
          'Designation': emp?.designation || '',
          'Month': e.month,
          'Year': e.year || '',
          'Pay Date': e.date,
          'Fixed Salary': e.monthlySalary,
          'Present Days': e.presentDays,
          'Present Amount': e.presentAmount,
          'Holidays': e.holidays,
          'Holiday Amount': e.holidayAmount,
          'OT Hours': e.otHours,
          'OT Amount': e.otAmount,
          'Welfare': e.welfareAmount,
          'Bonus': e.bonus,
          'Gross Earnings': gross,
          'Advance Deduction': e.advanceDeduction,
          'Net Payable': e.netPayable,
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payslips');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Payslips_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.xlsx`);
    });
  });
}

function renderPayslip(doc: jsPDF, entry: PayrollEntry, emp: Employee | undefined, startY: number, compact = false, adv?: Advance) {
  const x = 15;          // left edge
  const w = 180;         // content width
  let y = startY;

  const grossEarnings =
    entry.presentAmount + entry.holidayAmount + entry.otAmount + entry.welfareAmount + entry.bonus;

  // ---- Outer border ----
  const totalH = compact ? 130 : 175;
  doc.setDrawColor(60);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, totalH);

  // ---- Header band ----
  const headerH = compact ? 18 : 22;
  doc.setFillColor(30, 58, 95);
  doc.rect(x, y, w, headerH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 12 : 15);
  doc.text('NISHANTH ENGINEERING WORKS', x + w / 2, y + (compact ? 7 : 8.5), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(compact ? 6.5 : 7.5);
  doc.text(
    '102/1, Subbanaickenpalayam School Street, Chinnavedampatti, Coimbatore, TN 641049',
    x + w / 2, y + (compact ? 12 : 14), { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 8 : 9);
  doc.text(`PAYSLIP FOR ${entry.month.toUpperCase()} ${entry.year || ''}`, x + w / 2, y + (compact ? 16.5 : 19.5), { align: 'center' });

  doc.setTextColor(0, 0, 0);
  y += headerH;

  // ---- Employee details block ----
  const infoH = compact ? 22 : 26;
  const fs = compact ? 8.5 : 9.5;
  const lh = compact ? 5 : 5.5;
  const colA = x + 4;
  const colB = x + w / 2 + 2;
  const labelColor: [number, number, number] = [110, 110, 110];

  doc.setFontSize(fs);
  let iy = y + (compact ? 5 : 6);

  const drawPair = (lx: number, label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...labelColor);
    doc.text(label, lx, iy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, lx + 28, iy);
  };

  drawPair(colA, 'Employee ID', entry.employeeId);
  drawPair(colB, 'Name', entry.employeeName);
  iy += lh;
  drawPair(colA, 'Department', emp?.department || '-');
  drawPair(colB, 'Designation', emp?.designation || '-');
  iy += lh;
  drawPair(colA, 'Fixed Salary', money(entry.monthlySalary));
  drawPair(colB, 'Pay Date', entry.date);

  y += infoH;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);

  // ---- Earnings & Deductions side-by-side tables ----
  const tableTop = y + 3;
  const halfW = (w - 6) / 2;

  autoTable(doc, {
    startY: tableTop,
    head: [['EARNINGS', 'AMOUNT']],
    body: [
      [`Present (${entry.presentDays} days)`, money(entry.presentAmount)],
      [`Holiday (${entry.holidays} days)`, money(entry.holidayAmount)],
      [`Overtime (${entry.otHours} hrs)`, money(entry.otAmount)],
      ['Welfare', money(entry.welfareAmount)],
      ['Bonus', money(entry.bonus)],
      [{ content: 'Gross Earnings', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
       { content: money(grossEarnings), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 244, 250] } }],
    ],
    theme: 'grid',
    styles: { fontSize: compact ? 7.5 : 8.5, cellPadding: compact ? 1.5 : 2, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: compact ? 7.5 : 8.5, halign: 'left' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: x + 2 },
    tableWidth: halfW,
  });

  const earnEndY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: tableTop,
    head: [['DEDUCTIONS', 'AMOUNT']],
    body: [
      ['Total Advance Deduction', money(adv?.totalDeducted || 0)],
      ['Remaining Advance Amount', money(adv ? Math.max(0, adv.advanceAmount - adv.totalDeducted) : 0)],
      ['', ''],
      ['', ''],
      ['', ''],
      [{ content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [250, 240, 240] } },
       { content: money(entry.advanceDeduction), styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 240, 240] } }],
    ],
    theme: 'grid',
    styles: { fontSize: compact ? 7.5 : 8.5, cellPadding: compact ? 1.5 : 2, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [120, 35, 35], textColor: 255, fontSize: compact ? 7.5 : 8.5, halign: 'left' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: x + 4 + halfW },
    tableWidth: halfW,
  });

  const dedEndY = (doc as any).lastAutoTable.finalY;
  y = Math.max(earnEndY, dedEndY) + 4;

  // ---- Net Payable band ----
  const netH = compact ? 10 : 12;
  doc.setFillColor(30, 58, 95);
  doc.rect(x + 2, y, w - 4, netH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 10 : 12);
  doc.text('NET PAYABLE', x + 6, y + (compact ? 6.5 : 8));
  doc.text(money(entry.netPayable), x + w - 6, y + (compact ? 6.5 : 8), { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += netH + (compact ? 4 : 8);

  // ---- Footer / signatures (full only) ----
  if (!compact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('This is a computer generated payslip and does not require a signature.', x + w / 2, y + 4, { align: 'center' });

    y += 14;
    doc.setDrawColor(150);
    doc.line(x + 10, y, x + 60, y);
    doc.line(x + w - 60, y, x + w - 10, y);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text('Employee Signature', x + 35, y + 4, { align: 'center' });
    doc.text('Authorized Signatory', x + w - 35, y + 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);
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
      e.employeeId, e.employeeName, money(e.monthlySalary),
      e.presentDays, money(e.presentAmount), e.holidays, money(e.holidayAmount),
      e.otHours, money(e.otAmount), money(e.welfareAmount),
      money(e.advanceDeduction), money(e.bonus), money(e.netPayable),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  doc.save(`Payroll_Summary_${entries[0]?.month || 'All'}_${entries[0]?.year || ''}.pdf`);
}
