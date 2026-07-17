import { Report } from '@/types/report';

export function exportReportExcel(data: Report) {
  import('xlsx').then((XLSX) => {
    import('file-saver').then(({ saveAs }) => {
      const showInchesColumn = data.unitMode === 'IN';
      const rowsPerPage = 39;
      const rows = data.rows || [];
      const totalPages = Math.ceil(Math.max(1, rows.length) / rowsPerPage);
      
      const wb = XLSX.utils.book_new();

      const formatDate = (dateString: string) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day} - ${month} - ${year}`;
      };

      let globalRowCounter = 1;

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const sheetName = `Page_${pageIndex + 1}`;
        const sheetData: any[][] = [];

        // Fixed Header rows
        sheetData.push(['NISHANTH ENGINEERING WORKS']);
        sheetData.push(['PATTERN INSPECTION REPORT']);
        
        // Row 3
        let row3 = ['Customer         :', '', data.customerName, '', 'Page:', `${pageIndex + 1} of ${totalPages}`, 'Date:', formatDate(data.date)];
        sheetData.push(row3);

        // Row 4
        let row4 = ['Description      :', '', data.description, '', `Details of Pattern: ${data.detailsOfPattern}`];
        sheetData.push(row4);

        // Row 5
        let row5 = ['Drg. No            :', '', data.drawingNo];
        sheetData.push(row5);

        // Table Header
        let headerTitles;
        if (showInchesColumn) {
            headerTitles = [
                'Sr No', 'View', 'Inches', 'Drg Dim', '%', 'M/c ing allowance',
                'Shrinkage allowance in %', 'Dimn. To be maintained', 'Actual Dimn', 'Remark'
            ];
        } else {
            headerTitles = [
                'Sr No', 'View', 'Drg Dim', '%', 'M/c ing allowance',
                'Shrinkage allowance in %', 'Dimn. To be maintained', 'Actual Dimn', 'Remark'
            ];
        }
        sheetData.push(headerTitles);

        // Table Data
        const start = pageIndex * rowsPerPage;
        const end = Math.min(start + rowsPerPage, rows.length);
        const pageSlice = rows.slice(start, end);

        pageSlice.forEach((row: any) => {
            let rowData;
            if (showInchesColumn) {
                rowData = [
                    globalRowCounter,
                    row.view || '',
                    row.inchValue || '',
                    row.drgDim || '',
                    row.percentage || '',
                    row.mcIngAllowance || '',
                    row.shrinkageAllowance || '',
                    row.dimnToBeMaintained || '',
                    row.actualDimn || '',
                    row.remark || ''
                ];
            } else {
                rowData = [
                    globalRowCounter,
                    row.view || '',
                    row.drgDim || '',
                    row.percentage || '',
                    row.mcIngAllowance || '',
                    row.shrinkageAllowance || '',
                    row.dimnToBeMaintained || '',
                    row.actualDimn || '',
                    row.remark || ''
                ];
            }
            sheetData.push(rowData);
            globalRowCounter++;
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Set column widths roughly
        const wscols = showInchesColumn 
          ? [{wch: 6}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 6}, {wch: 18}, {wch: 30}, {wch: 25}, {wch: 15}, {wch: 15}]
          : [{wch: 6}, {wch: 15}, {wch: 12}, {wch: 6}, {wch: 18}, {wch: 30}, {wch: 25}, {wch: 15}, {wch: 15}];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(
        new Blob([buf], { type: "application/octet-stream" }),
        `Report_${data.reportNo}.xlsx`
      );
    });
  });
}
