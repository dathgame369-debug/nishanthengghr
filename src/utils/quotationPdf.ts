import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '@/assets/logoBase64';
import { Quotation, QuotationItem } from '@/types/quotation';
import { getCompanyInfo } from '@/utils/companySettings';

function money(n: number): string {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateQuotationPDF(q: Quotation, items: QuotationItem[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 12;
  const innerW = pageW - margin * 2;
  const company = getCompanyInfo();
  const logo = company.logoDataUrl || logoBase64;

  // ---- Header band ----
  let y = margin;
  try { doc.addImage(logo, 'PNG', margin, y, 18, 18); } catch {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 40, 80);
  doc.text(company.name || '', pageW / 2, y + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60);
  const addrLines2 = (company.address || '').split('\n').slice(0, 2);
  addrLines2.forEach((ln, i) => doc.text(ln, pageW / 2, y + 11 + i * 4, { align: 'center' }));
  if (company.phone) doc.text(company.phone, pageW / 2, y + 11 + addrLines2.length * 4, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  doc.text('MFRS OF : ALL KINDS OF WOODEN AND ALUMINUM PATTERNS', pageW / 2, y + 23, { align: 'center' });

  // Divider
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 26, pageW - margin, y + 26);

  y += 30;

  // ---- Quotation title banner ----
  doc.setFillColor(20, 40, 80);
  doc.rect(margin, y, innerW, 8, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('QUOTATION', pageW / 2, y + 5.6, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  // ---- Meta + To block ----
  const leftW = innerW * 0.62;
  const rightX = margin + leftW + 4;
  const rightW = innerW - leftW - 4;
  const metaH = 32;

  // To box
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, leftW, metaH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  doc.text('TO', margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  const nameLines = doc.splitTextToSize(`M/s. ${q.customerName}`, leftW - 6);
  doc.text(nameLines, margin + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const addrLines = doc.splitTextToSize(q.customerAddress, leftW - 6);
  doc.text(addrLines, margin + 3, y + 11 + nameLines.length * 4.5);

  // Meta box
  doc.rect(rightX, y, rightW, metaH);
  const metaRow = (label: string, value: string, row: number) => {
    const rH = metaH / 4;
    const ry = y + row * rH;
    if (row > 0) doc.line(rightX, ry, rightX + rightW, ry);
    doc.line(rightX + rightW * 0.42, ry, rightX + rightW * 0.42, ry + rH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(label, rightX + 2, ry + rH / 2 + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(value || '', rightX + rightW * 0.42 + 2, ry + rH / 2 + 1);
  };
  metaRow('Quote No.', q.quotationNumber, 0);
  metaRow('Date', q.quotationDate, 1);
  metaRow('Your Ref', q.yourRef, 2);
  metaRow('Due On', q.dueOn, 3);

  y += metaH + 4;

  // ---- Items table ----
  const body = items.map(it => [
    String(it.slNo),
    it.description,
    it.qty,
    it.rate ? money(it.rate) : '',
    it.amount ? money(it.amount) : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Sl.No.', 'Description', 'Qty', 'Rate Per', 'Amount']],
    body,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: [160, 160, 160], valign: 'top' },
    headStyles: { fillColor: [20, 40, 80], textColor: 255, halign: 'center', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
  });

  let tableEnd = (doc as any).lastAutoTable.finalY;

  tableEnd += 4;

  // Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Terms :', margin, tableEnd + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const termLines = doc.splitTextToSize(q.terms || '', innerW - 80);
  doc.text(termLines, margin, tableEnd + 11);

  // Signature
  const sigY = Math.max(tableEnd + 11 + termLines.length * 4 + 14, 260);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('For', pageW - margin - 60, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || '', pageW - margin - 55, sigY);
  doc.setDrawColor(120);
  doc.line(pageW - margin - 60, sigY + 18, pageW - margin, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text('Authorised Signatory', pageW - margin - 30, sigY + 23, { align: 'center' });

  doc.save(`Quotation_${q.quotationNumber.replace(/[\/\\]/g, '_')}.pdf`);
}