import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import { MONTHS, getYearOptions } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import PayslipTemplate from '@/components/PayslipTemplate';
import { generatePayslipPDF, generateBulkPayslipPDF, exportPayslipsExcel } from '@/utils/pdfExport';

export default function PayslipPage() {
  const { employees, payroll } = useHR();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLayout, setBulkLayout] = useState<'full' | 'compact'>('compact');

  const monthEntries = payroll.filter(p => p.month === selectedMonth && (p.year || currentYear) === selectedYear);
  const selectedEntry = monthEntries.find(p => p.employeeId === selectedEmpId);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Payslip Generator</h1>
            <p className="text-sm text-muted-foreground">Generate individual or bulk payslips</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 sm:p-6 card-shadow border border-border mb-6">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Year</label>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!bulkMode && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Employee</label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {monthEntries.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.employeeId} - {e.employeeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {bulkMode && (
            <div>
              <label className="text-sm font-medium block mb-1.5">Layout</label>
              <Select value={bulkLayout} onValueChange={v => setBulkLayout(v as 'full' | 'compact')}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Page (1 per page)</SelectItem>
                  <SelectItem value="compact">Compact (4 per page)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant={bulkMode ? 'outline' : 'default'} onClick={() => setBulkMode(false)}>Individual</Button>
            <Button variant={bulkMode ? 'default' : 'outline'} onClick={() => setBulkMode(true)}>Bulk Generate</Button>
          </div>
          <div className="sm:ml-auto flex gap-2 flex-wrap w-full sm:w-auto">
            {monthEntries.length > 0 && (
              <Button
                variant="outline"
                className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-emerald-600"
                onClick={() => exportPayslipsExcel(
                  !bulkMode && selectedEntry ? [selectedEntry] : monthEntries,
                  employees
                )}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel {!bulkMode && selectedEntry ? '' : `(${monthEntries.length})`}
              </Button>
            )}
            {!bulkMode && selectedEntry && (
              <Button onClick={() => generatePayslipPDF(selectedEntry, employees)}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            )}
            {bulkMode && monthEntries.length > 0 && (
              <Button onClick={() => generateBulkPayslipPDF(monthEntries, employees, bulkLayout)}>
                <Download className="w-4 h-4 mr-2" /> Download Bulk PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {!bulkMode && selectedEntry && (
        <div className="max-w-2xl mx-auto">
          <PayslipTemplate entry={selectedEntry} />
        </div>
      )}

      {!bulkMode && !selectedEntry && monthEntries.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">Select an employee to preview payslip</div>
      )}

      {monthEntries.length === 0 && (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payroll data for {selectedMonth} {selectedYear}. Process payroll first.</p>
        </div>
      )}

      {bulkMode && monthEntries.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{monthEntries.length} payslips for {selectedMonth} {selectedYear}</p>
          <div className={bulkLayout === 'compact' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-6'}>
            {monthEntries.map(entry => (
              <PayslipTemplate key={entry.id} entry={entry} compact={bulkLayout === 'compact'} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
