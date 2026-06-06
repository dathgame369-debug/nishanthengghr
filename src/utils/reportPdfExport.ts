import jsPDF from 'jspdf';
import { Report } from '@/types/report';

export function exportReportPDF(data: Report) {
  const doc = new jsPDF('p', 'pt', 'a4');

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const usableWidth = pageWidth - (2 * margin);
  
  const showInchesColumn = data.unitMode === 'IN';

  let columnWidths: number[], headerTitles: string[];

  if (showInchesColumn) {
      columnWidths = [28, 45, 40, 55, 25, 55, 75, 85, 55, 52];
      headerTitles = [
          'Sr No', 'View', 'Inches', 'Drg Dim', '%', 'M/c ing allowance',
          'Shrinkage allowance in %', 'Dimn. To be maintained', 'Actual Dimn', 'Remark'
      ];
  } else {
      columnWidths = [32, 58, 52, 32, 68, 70, 70, 60, 73];
      headerTitles = [
          'Sr No', 'View', 'Drg Dim', '%', 'M/c ing allowance',
          'Shrinkage allowance in %', 'Dimn. To be maintained', 'Actual Dimn', 'Remark'
      ];
  }

  const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);

  const tableHeaderHeight = 35;
  const dataRowHeight = 16;
  const rowsPerPage = 39;

  const rows = data.rows || [];
  const totalPages = Math.ceil(Math.max(1, rows.length) / rowsPerPage);
  let globalRowCounter = 1;

  const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day} - ${month} - ${year}`;
  };

  const drawCell = (x: number, y: number, width: number, height: number, text: string, options: any = {}) => {
      const {
          align = 'left',
          valign = 'middle',
          bold = false,
          fontSize = 10,
          padding = 4,
      } = options;

      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(x, y, width, height);

      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(0);

      const textValue = (text === null || text === undefined) ? '' : String(text);
      
      const splitText = doc.splitTextToSize(textValue, width - 2 * padding);
      
      let textY = y + padding;
      if (valign === 'middle') {
          const dims = doc.getTextDimensions(splitText);
          textY = y + (height - dims.h) / 2 + dims.h / 2; // approximation for middle
      } else if (valign === 'center') { // pdfkit compat
          const dims = doc.getTextDimensions(splitText);
          textY = y + (height - dims.h) / 2 + dims.h / 2;
      } else if (valign === 'top') {
          const dims = doc.getTextDimensions(splitText);
          textY = y + padding + dims.h / 2;
      }

      let textX = x + padding;
      if (align === 'center') {
          textX = x + width / 2;
      } else if (align === 'right') {
          textX = x + width - padding;
      }

      doc.text(splitText, textX, textY, { align: align === 'left' ? 'left' : (align === 'right' ? 'right' : 'center'), baseline: 'middle' });
  };

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) doc.addPage();

      let currentY = margin;
      const startX = margin;

      drawCell(startX, currentY, totalTableWidth, 20, 'NISHANTH ENGINEERING PORTAL', { align: 'center', bold: true, fontSize: 12, valign: 'center' });
      currentY += 20;

      drawCell(startX, currentY, totalTableWidth, 20, 'PATTERN INSPECTION REPORT', { align: 'center', bold: true, fontSize: 12, valign: 'center' });
      currentY += 20;

      let colX = startX;

      const labelWidth = showInchesColumn ? (columnWidths[0] + columnWidths[1]) : (columnWidths[0] + columnWidths[1]);
      const customerFieldWidth = showInchesColumn ?
          (columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + 20) :
          (columnWidths[2] + columnWidths[3] + columnWidths[4] + 30);
      const pageColWidth = 40;
      const pageNumWidth = 45;
      const dateColWidth = 40;
      const dateValueWidth = showInchesColumn ?
          (totalTableWidth - labelWidth - customerFieldWidth - pageColWidth - pageNumWidth - dateColWidth) :
          (totalTableWidth - labelWidth - customerFieldWidth - pageColWidth - pageNumWidth - dateColWidth);

      const customerText = data.customerName || '';
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitCustomer = doc.splitTextToSize(customerText, customerFieldWidth - 8);
      const row3Height = Math.max(20, splitCustomer.length * 12 + 8);

      drawCell(colX, currentY, labelWidth, row3Height, 'Customer         :', { bold: true, valign: 'center', fontSize: 9 });
      colX += labelWidth;

      drawCell(colX, currentY, customerFieldWidth, row3Height, customerText, { valign: 'center', fontSize: 9 });
      colX += customerFieldWidth;

      drawCell(colX, currentY, pageColWidth, row3Height, 'Page:', { bold: true, valign: 'center', fontSize: 9 });
      colX += pageColWidth;

      drawCell(colX, currentY, pageNumWidth, row3Height, `${pageIndex + 1} of ${totalPages}`, { align: 'center', valign: 'center', fontSize: 9 });
      colX += pageNumWidth;

      drawCell(colX, currentY, dateColWidth, row3Height, 'Date:', { bold: true, valign: 'center', fontSize: 9 });
      colX += dateColWidth;

      drawCell(colX, currentY, dateValueWidth, row3Height, formatDate(data.date), { align: 'center', valign: 'center', fontSize: 9 });

      currentY += row3Height;
      colX = startX;

      const patternDetailsWidth = pageColWidth + pageNumWidth + dateColWidth + dateValueWidth;
      
      const descText = data.description || '';
      const splitDesc = doc.splitTextToSize(descText, customerFieldWidth - 8);
      const baseRow4Height = Math.max(20, splitDesc.length * 12 + 8);

      const drgText = data.drawingNo || '';
      const splitDrg = doc.splitTextToSize(drgText, customerFieldWidth - 8);
      let baseRow5Height = Math.max(20, splitDrg.length * 12 + 8);

      const patternText = `Details of Pattern: ${data.detailsOfPattern || ''}`;
      const splitPattern = doc.splitTextToSize(patternText, patternDetailsWidth - 8);
      const minPatternHeight = splitPattern.length * 12 + 8;

      if (baseRow4Height + baseRow5Height < minPatternHeight) {
          baseRow5Height += (minPatternHeight - (baseRow4Height + baseRow5Height));
      }

      const row4Height = baseRow4Height;
      const row5Height = baseRow5Height;
      const finalMergedHeight = row4Height + row5Height;

      drawCell(colX, currentY, labelWidth, row4Height, 'Description      :', { bold: true, valign: 'center', fontSize: 9 });
      colX += labelWidth;

      drawCell(colX, currentY, customerFieldWidth, row4Height, descText, { valign: 'center', fontSize: 9 });
      colX += customerFieldWidth;

      drawCell(colX, currentY, patternDetailsWidth, finalMergedHeight, patternText,
          { bold: true, valign: 'top', fontSize: 9, padding: 4 });

      currentY += row4Height;
      colX = startX;

      drawCell(colX, currentY, labelWidth, row5Height, 'Drg. No            :', { bold: true, valign: 'center', fontSize: 9 });
      colX += labelWidth;

      drawCell(colX, currentY, customerFieldWidth, row5Height, drgText, { valign: 'center', fontSize: 9 });

      currentY += row5Height;
      colX = startX;

      headerTitles.forEach((title, index) => {
          drawCell(colX, currentY, columnWidths[index], tableHeaderHeight, title,
              { align: 'center', bold: true, valign: 'center', fontSize: 8 });
          colX += columnWidths[index];
      });

      currentY += tableHeaderHeight;

      const start = pageIndex * rowsPerPage;
      const end = Math.min(start + rowsPerPage, rows.length);
      const pageSlice = rows.slice(start, end);

      pageSlice.forEach((row: any) => {
          colX = startX;
          let rowData;

          if (showInchesColumn) {
              rowData = [
                  String(globalRowCounter),
                  (row.view !== null && row.view !== undefined) ? String(row.view) : '',
                  (row.inchValue !== null && row.inchValue !== undefined) ? String(row.inchValue) : '',
                  (row.drgDim !== null && row.drgDim !== undefined) ? String(row.drgDim) : '',
                  (row.percentage !== null && row.percentage !== undefined) ? String(row.percentage) : '',
                  (row.mcIngAllowance !== null && row.mcIngAllowance !== undefined) ? String(row.mcIngAllowance) : '',
                  (row.shrinkageAllowance !== null && row.shrinkageAllowance !== undefined) ? String(row.shrinkageAllowance) : '',
                  (row.dimnToBeMaintained !== null && row.dimnToBeMaintained !== undefined) ? String(row.dimnToBeMaintained) : '',
                  (row.actualDimn !== null && row.actualDimn !== undefined) ? String(row.actualDimn) : '',
                  (row.remark !== null && row.remark !== undefined) ? String(row.remark) : ''
              ];
          } else {
              rowData = [
                  String(globalRowCounter),
                  (row.view !== null && row.view !== undefined) ? String(row.view) : '',
                  (row.drgDim !== null && row.drgDim !== undefined) ? String(row.drgDim) : '',
                  (row.percentage !== null && row.percentage !== undefined) ? String(row.percentage) : '',
                  (row.mcIngAllowance !== null && row.mcIngAllowance !== undefined) ? String(row.mcIngAllowance) : '',
                  (row.shrinkageAllowance !== null && row.shrinkageAllowance !== undefined) ? String(row.shrinkageAllowance) : '',
                  (row.dimnToBeMaintained !== null && row.dimnToBeMaintained !== undefined) ? String(row.dimnToBeMaintained) : '',
                  (row.actualDimn !== null && row.actualDimn !== undefined) ? String(row.actualDimn) : '',
                  (row.remark !== null && row.remark !== undefined) ? String(row.remark) : ''
              ];
          }

          rowData.forEach((value, index) => {
              drawCell(colX, currentY, columnWidths[index], dataRowHeight, value,
                  { align: 'center', valign: 'center', fontSize: 8 });
              colX += columnWidths[index];
          });

          currentY += dataRowHeight;
          globalRowCounter++;
      });
  }

  doc.save(`Report_${data.reportNo}.pdf`);
}
