import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PayrollEntry, Employee, Advance, MONTHS } from "@/types/hr";
import { logoBase64 } from "@/assets/logoBase64";
import { buildPayslipBreakdown } from "@/utils/payslipBreakdown";
import { numberToIndianWords } from "@/utils/numberToWords";
import { getCompanyInfo } from "@/utils/companySettings";

// Helvetica (jsPDF default) doesn't support the ₹ glyph — use "Rs." prefix.
function money(n: number): string {
  return "Rs. " + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Returns the advance balance as it was right after this payslip's month deduction. */
function getBalanceAtMonth(employeeId: string, entryMonth: string, entryYear: number, allPayroll: PayrollEntry[] = [], allAdvances: Advance[] = []): number {
  const entryMonthIdx = MONTHS.indexOf(entryMonth);
  const eYear = Number(entryYear);

  // Sum all advances given to this employee (no date restriction needed since deductions perfectly offset them)
  const totalAdvances = allAdvances
    .filter(a => a.employeeId === employeeId)
    .reduce((sum, a) => sum + (a.advanceAmount || 0), 0);

  // Sum all deductions for this employee up to this month
  const deductedSoFar = allPayroll.reduce((sum, p) => {
    if (p.employeeId !== employeeId) return sum;
    
    const pYear = Number(p.year) || eYear;
    const pMonthIdx = MONTHS.indexOf(p.month);
    
    if (pYear < eYear || (pYear === eYear && pMonthIdx <= entryMonthIdx)) {
      return sum + (p.advanceDeduction || 0);
    }
    return sum;
  }, 0);
  
  return Math.max(0, totalAdvances - deductedSoFar);
}

export function generatePayslipPDF(entry: PayrollEntry, employees: Employee[], advances: Advance[] = [], allPayroll: PayrollEntry[] = []) {
  const emp = employees.find((e) => e.id === entry.employeeId);
  const doc = new jsPDF("p", "mm", "a4");
  renderPayslip(doc, entry, emp, 15, false, allPayroll, advances);
  doc.save(`Payslip_${entry.employeeId}_${entry.month}_${entry.year || ""}.pdf`);
}

// Multi-entry PDF: one full-page payslip per entry.
// Use for single emp many months, many emps many months, all employees etc.
export function generateMultiPayslipPDF(
  entries: PayrollEntry[],
  employees: Employee[],
  advances: Advance[] = [],
  filename = "Payslips.pdf",
  allPayroll: PayrollEntry[] = []
) {
  if (entries.length === 0) return;
  const doc = new jsPDF("p", "mm", "a4");
  entries.forEach((entry, i) => {
    if (i > 0) doc.addPage();
    const emp = employees.find((e) => e.id === entry.employeeId);
    renderPayslip(doc, entry, emp, 15, false, allPayroll, advances);
  });
  doc.save(filename);
}

export function generateBulkPayslipPDF(
  entries: PayrollEntry[],
  employees: Employee[],
  layout: "1" | "2" | "4" | "6",
  advances: Advance[] = [],
  allPayroll: PayrollEntry[] = []
) {
  const doc = new jsPDF("p", "mm", "a4");

  if (layout === "1") {
    entries.forEach((entry, i) => {
      if (i > 0) doc.addPage();
      const emp = employees.find((e) => e.id === entry.employeeId);
      renderPayslip(doc, entry, emp, 15, false, allPayroll, advances);
    });
  } else {
    const margin = 6;
    const gapX = 5;
    const gapY = 4;
    const pageW = 210;
    const pageH = 297;
    
    let cols = 2;
    let rows = 3;
    if (layout === "2") { cols = 1; rows = 2; }
    else if (layout === "4") { cols = 2; rows = 2; }
    else if (layout === "6") { cols = 2; rows = 3; }
    
    const slipW = (pageW - margin * 2 - gapX * (cols - 1)) / cols;
    const slipH = (pageH - margin * 2 - gapY * (rows - 1)) / rows;
    const perPage = cols * rows;

    entries.forEach((entry, i) => {
      const pos = i % perPage;
      if (i > 0 && pos === 0) doc.addPage();
      const col = pos % cols;
      const row = Math.floor(pos / cols);
      const x = margin + col * (slipW + gapX);
      const y = margin + row * (slipH + gapY);
      const emp = employees.find((e) => e.id === entry.employeeId);
      renderPayslipMini(doc, entry, emp, x, y, slipW, slipH, allPayroll, advances);
    });
  }

  doc.save(`Bulk_Payslips_${entries[0]?.month || "All"}_${entries[0]?.year || ""}.pdf`);
}

function renderPayslipMini(
  doc: jsPDF,
  entry: PayrollEntry,
  emp: Employee | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  allPayroll: PayrollEntry[] = [],
  allAdvances: Advance[] = []
) {
  const calcLeaves = entry.noOfLeaves || 0;
  const leaveAmt = calcLeaves * (entry.monthlySalary / 26);
  const totalEarning = entry.presentAmount + entry.holidayAmount + (entry.otAmount || 0) + (entry.welfareAmount || 0) + (entry.bonus || 0);
  const totalDeductionDisplay = entry.advanceDeduction || 0;
  const calculatedNet = entry.netPayable;
  const company = getCompanyInfo();
  const logo = company.logoDataUrl || logoBase64;

  doc.setDrawColor(60);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);

  const headerH = 11;
  doc.setFillColor(220, 234, 248);
  doc.rect(x, y, w, headerH, "F");
  doc.setDrawColor(180, 210, 240);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, headerH);
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text((company.name || "").toUpperCase(), x + w / 2, y + 4, { align: "center" });
  try {
    doc.addImage(logo, "PNG", x + 1.5, y + 1, 9, 9);
  } catch {}
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  const addrShort = (company.address || "").split("\n")[0].slice(0, 80);
  doc.text(addrShort, x + w / 2, y + 7, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`PAYSLIP — ${entry.month.toUpperCase()} ${entry.year || ""}`, x + w / 2, y + 10, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let iy = y + headerH + 2.5;
  const lh = 3.2;
  doc.setFontSize(7);
  const pair = (lx: number, label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(label, lx, iy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const v = doc.splitTextToSize(value, w / 2 - 18)[0];
    doc.text(v, lx + 16, iy);
  };
  pair(x + 2, "ID", entry.employeeId);
  pair(x + w / 2, "Date", entry.date ? entry.date.split('-').reverse().join('-') : "");
  iy += lh;
  pair(x + 2, "Name", entry.employeeName);
  iy += lh;
  pair(x + 2, "Dept", emp?.department || "-");
  pair(x + w / 2, "Desig", emp?.designation || "-");
  iy += lh;
  pair(x + 2, "Present", String(entry.presentDays || 0));
  pair(x + w / 2, "Leaves", String(calcLeaves));

  const tableTop = iy + 2;

  const earningsMiniRows = [
    ["Monthly Salary",                        money(entry.monthlySalary)],
    [`Present Days - ${entry.presentDays}`,   money(entry.presentAmount)],
    [`Holidays - ${entry.holidays}`,          money(entry.holidayAmount)],
    [`OT - ${entry.otHours} hrs`,            money(entry.otAmount)],
    ["Welfare",                               money(entry.welfareAmount)],
    ["Bonus",                                 money(entry.bonus)],
    [{ content: "TOTAL EARNINGS", styles: { halign: "right", fontStyle: "bold" } }, money(totalEarning)]
  ];

  autoTable(doc, {
    startY: tableTop,
    head: [[
      { content: "EARNINGS", styles: { halign: "left" } },
      { content: "AMT", styles: { halign: "right" } },
    ]],
    body: earningsMiniRows,
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.6, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [220, 234, 248], textColor: [30, 58, 95], fontSize: 5.5, fontStyle: 'bold' },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: x + 2 },
    tableWidth: w - 4,
  });

  const deductionMiniTop = (doc as any).lastAutoTable.finalY + 1;
  const miniBalanceAdv = getBalanceAtMonth(entry.employeeId, entry.month, entry.year || new Date().getFullYear(), allPayroll, allAdvances);

  autoTable(doc, {
    startY: deductionMiniTop,
    head: [[
      { content: "DEDUCTIONS", styles: { halign: "left" } },
      { content: "AMT", styles: { halign: "right" } },
    ]],
    body: [
      ["Adv Ded.", money(entry.advanceDeduction)],
      [{ content: "TOTAL DEDS", styles: { halign: "right", fontStyle: "bold" } }, money(totalDeductionDisplay)],
      ["Balance Advance", money(miniBalanceAdv)],
    ],
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.6, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [253, 232, 232], textColor: [122, 35, 35], fontSize: 5.5, fontStyle: 'bold' },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: x + 2 },
    tableWidth: w - 4,
  });

  const ny = (doc as any).lastAutoTable.finalY + 1.5;
  const netH = 6;
  doc.setFillColor(220, 234, 248);
  doc.rect(x + 2, ny, w - 4, netH, "F");
  doc.setDrawColor(180, 210, 240);
  doc.setLineWidth(0.3);
  doc.rect(x + 2, ny, w - 4, netH);
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NET SALARY", x + 5, ny + 4);
  doc.text(money(calculatedNet), x + w - 5, ny + 4, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

// Excel export for payslips — includes attendance, all earnings/deductions, totals
export function exportPayslipsExcel(entries: PayrollEntry[], employees: Employee[]) {
  import("xlsx").then((XLSX) => {
    import("file-saver").then(({ saveAs }) => {
      const data = entries.map((e) => {
        const emp = employees.find((x) => x.id === e.employeeId);
        const b = buildPayslipBreakdown(e);
        const workingDays = (e.presentDays || 0) + (e.holidays || 0);
        const leaveDays = Math.max(0, 26 - workingDays);
        return {
          "Employee ID": e.employeeId,
          Name: e.employeeName,
          Department: emp?.department || "",
          Designation: emp?.designation || "",
          Status: emp?.status || "",
          "Payroll Month": e.month,
          "Payroll Year": e.year || "",
          "Pay Date": e.date ? e.date.split('-').reverse().join('-') : "",
          "Mode of Payment": e.modeOfPayment || "Bank Transfer",
          "Fixed Salary": e.monthlySalary,
          "Present Days": e.presentDays,
          Holidays: e.holidays,
          "Working Days": workingDays,
          "Leave Days": leaveDays,
          "No. of Leaves": e.noOfLeaves || 0,
          "OT Hours": e.otHours,
          "Basic Salary": b.earnings.find((r) => r.label === "Basic Salary")?.amount || 0,
          HRA: 0,
          "Special Allowance": 0,
          "Medical Allowance": 0,
          "Travel Allowance": 0,
          Overtime: e.otAmount,
          Incentives: e.welfareAmount,
          Bonus: e.bonus,
          "Other Earnings": 0,
          "Gross Salary": b.grossSalary,
          PF: 0,
          ESI: 0,
          "Professional Tax": 0,
          "Advance Recovery": e.advanceDeduction,
          "Loan Recovery": 0,
          "Other Deductions": 0,
          "Total Deductions": b.totalDeductions,
          "Net Salary": b.netSalary,
          "Net Salary (In Words)": numberToIndianWords(b.netSalary),
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payslips");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(
        new Blob([buf], { type: "application/octet-stream" }),
        `Payslips_${entries[0]?.month || "All"}_${entries[0]?.year || ""}.xlsx`,
      );
    });
  });
}

function renderPayslip(
  doc: jsPDF,
  entry: PayrollEntry,
  emp: Employee | undefined,
  startY: number,
  compact = false,
  allPayroll: PayrollEntry[] = [],
  allAdvances: Advance[] = []
) {
  const x = 15;
  const w = 180;
  let y = startY;

  const calcLeaves = entry.noOfLeaves || 0;
  const leaveAmt = calcLeaves * (entry.monthlySalary / 26);
  const totalEarning = entry.presentAmount + entry.holidayAmount + (entry.otAmount || 0) + (entry.welfareAmount || 0) + (entry.bonus || 0);
  const totalDeductionDisplay = entry.advanceDeduction || 0;
  const calculatedNet = entry.netPayable;
  const company = getCompanyInfo();
  const logo = company.logoDataUrl || logoBase64;

  const totalH = compact ? 150 : 220;
  doc.setDrawColor(60);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, totalH);

  // Header band
  const headerH = compact ? 18 : 22;
  doc.setFillColor(220, 234, 248);
  doc.rect(x, y, w, headerH, "F");
  doc.setDrawColor(180, 210, 240);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, headerH);

  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 12 : 15);
  doc.text((company.name || "").toUpperCase(), x + w / 2, y + (compact ? 7 : 8.5), { align: "center" });
  try {
    doc.addImage(logo, "PNG", x + 3, y + 3, compact ? 12 : 16, compact ? 12 : 16);
  } catch {}

  doc.setFont("helvetica", "normal");
  doc.setFontSize(compact ? 6.5 : 7.5);
  doc.text(company.address || "", x + w / 2, y + (compact ? 12 : 14), { align: "center", maxWidth: w - 10 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 8 : 9);
  doc.text(`PAYSLIP FOR ${entry.month.toUpperCase()} ${entry.year || ""}`, x + w / 2, y + (compact ? 16.5 : 19.5), {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  y += headerH;

  // Employee info — 5 rows
  const infoH = compact ? 18 : 22;
  const fs = compact ? 8 : 9;
  const lh = compact ? 5 : 6;
  const colA = x + 4;
  const colB = x + w / 2 + 2;
  const labelColor: [number, number, number] = [110, 110, 110];

  doc.setFontSize(fs);
  let iy = y + (compact ? 5 : 6);

  const drawPair = (lx: number, label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...labelColor);
    doc.text(label, lx, iy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), lx + 30, iy);
  };

  const e: any = emp || {};
  drawPair(colA, "Employee ID", entry.employeeId);
  drawPair(colB, "Name", entry.employeeName);
  iy += lh;
  drawPair(colA, "Department", emp?.department || "-");
  drawPair(colB, "Designation", emp?.designation || "-");
  iy += lh;
  drawPair(colA, "Date of Join", emp?.dateOfJoining ? emp.dateOfJoining.split('-').reverse().join('-') : "-");
  drawPair(colB, "Pay Date", entry.date ? entry.date.split('-').reverse().join('-') : "");
  iy += lh;
  drawPair(colA, "Present Days", String(entry.presentDays || 0));
  drawPair(colB, "No. of Leaves", String(calcLeaves));

  y += infoH + (compact ? 2 : 4);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);

  const tableTop = y + 3;

  const formatCell = (val: number | string, isCurrency = true) => {
    if (typeof val === 'number') {
      return isCurrency ? money(val) : String(val);
    }
    return val;
  };

  const earningsRows = [
    ["Monthly Salary",                        formatCell(entry.monthlySalary)],
    [`Present Days - ${entry.presentDays}`,   formatCell(entry.presentAmount)],
    [`Holidays - ${entry.holidays}`,          formatCell(entry.holidayAmount)],
    [`OT - ${entry.otHours} hrs`,            formatCell(entry.otAmount)],
    ["Welfare",                               formatCell(entry.welfareAmount)],
    ["Bonus",                                 formatCell(entry.bonus)],
    [{ content: "TOTAL EARNINGS", styles: { halign: "right", fontStyle: "bold" } }, formatCell(totalEarning)],
  ];

  autoTable(doc, {
    startY: tableTop,
    head: [
      [
        { content: "EARNINGS", styles: { halign: "left" } },
        { content: "AMOUNT", styles: { halign: "right" } },
      ]
    ],
    body: earningsRows,
    theme: "grid",
    styles: { fontSize: compact ? 7.5 : 8.5, cellPadding: compact ? 1.5 : 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: { fillColor: [220, 234, 248], textColor: [30, 58, 95], fontSize: compact ? 7.5 : 8.5, fontStyle: 'bold' },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: x + 2 },
    tableWidth: w - 4,
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // DEDUCTIONS table
  const balanceAdvance = getBalanceAtMonth(entry.employeeId, entry.month, entry.year || new Date().getFullYear(), allPayroll, allAdvances);
  const deductionsRows = [

    ["Advance Deduction", formatCell(entry.advanceDeduction)],
    [{ content: "TOTAL DEDUCTIONS", styles: { halign: "right", fontStyle: "bold" } }, formatCell(totalDeductionDisplay)],
    ["Balance Advance (Advance Mgmt/Balance)", money(balanceAdvance)],
  ];

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "DEDUCTIONS", styles: { halign: "left" } },
        { content: "AMOUNT", styles: { halign: "right" } },
      ]
    ],
    body: deductionsRows,
    theme: "grid",
    styles: { fontSize: compact ? 7.5 : 8.5, cellPadding: compact ? 1.5 : 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: { fillColor: [253, 232, 232], textColor: [122, 35, 35], fontSize: compact ? 7.5 : 8.5, fontStyle: 'bold' },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: x + 2 },
    tableWidth: w - 4,
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Net Salary band
  const netH = compact ? 10 : 12;
  doc.setFillColor(220, 234, 248);
  doc.rect(x + 2, y, w - 4, netH, "F");
  doc.setDrawColor(180, 210, 240);
  doc.setLineWidth(0.3);
  doc.rect(x + 2, y, w - 4, netH);
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 10 : 12);
  doc.text("NET SALARY", x + 6, y + (compact ? 6.5 : 8));
  doc.text(money(calculatedNet), x + w - 6, y + (compact ? 6.5 : 8), { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += netH + 3;

  // Amount in words
  doc.setFont("helvetica", "italic");
  doc.setFontSize(compact ? 7.5 : 8.5);
  doc.setTextColor(80, 80, 80);
  const wrapped = doc.splitTextToSize(`In words: ${numberToIndianWords(calculatedNet)}`, w - 8);
  doc.text(wrapped, x + 4, y + 3);
  y += wrapped.length * (compact ? 3.8 : 4.4) + 3;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // Signatures
  if (!compact) {
    y += 14;
    doc.setDrawColor(150);
    doc.line(x + 10, y, x + 70, y);
    doc.line(x + w - 70, y, x + w - 10, y);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text("Employee Signature", x + 40, y + 4, { align: "center" });
    doc.text("Employer Signature", x + w - 40, y + 4, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }
}

export function exportPayrollExcel(entries: PayrollEntry[]) {
  import("xlsx").then((XLSX) => {
    import("file-saver").then(({ saveAs }) => {
      const data = entries.map((e) => ({
        "Employee ID": e.employeeId,
        Name: e.employeeName,
        Month: e.month,
        Year: e.year || "",
        Date: e.date,
        "Monthly Salary": e.monthlySalary,
        "Present Days": e.presentDays,
        "Present Amount": e.presentAmount,
        Holidays: e.holidays,
        "Holiday Amount": e.holidayAmount,
        "OT Hours": e.otHours,
        "OT Amount": e.otAmount,
        Welfare: e.welfareAmount,
        "Advance Deduction": e.advanceDeduction,
        Bonus: e.bonus,
        "Net Payable": e.netPayable,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payroll");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(
        new Blob([buf], { type: "application/octet-stream" }),
        `Payroll_${entries[0]?.month || "All"}_${entries[0]?.year || ""}.xlsx`,
      );
    });
  });
}

export function exportPayrollPDF(entries: PayrollEntry[]) {
  const doc = new jsPDF("l", "mm", "a4");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Nishanth Engineering Portal — Payroll Summary", 15, 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Month: ${entries[0]?.month || "All"} ${entries[0]?.year || ""}`, 15, 22);

  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Emp ID",
        "Name",
        "Salary",
        "Present",
        "Pres Amt",
        "Holidays",
        "Hol Amt",
        "OT Hrs",
        "OT Amt",
        "Welfare",
        "Adv Ded",
        "Bonus",
        "Net Pay",
      ],
    ],
    body: entries.map((e) => [
      e.employeeId,
      e.employeeName,
      money(e.monthlySalary),
      e.presentDays,
      money(e.presentAmount),
      e.holidays,
      money(e.holidayAmount),
      e.otHours,
      money(e.otAmount),
      money(e.welfareAmount),
      money(e.advanceDeduction),
      money(e.bonus),
      money(e.netPayable),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  doc.save(`Payroll_Summary_${entries[0]?.month || "All"}_${entries[0]?.year || ""}.pdf`);
}
