import { useMemo, useState } from 'react';
import { useHR } from '@/context/HRContext';
import { MONTHS, getYearOptions } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { FileText, Download, FileSpreadsheet, Eye, RotateCcw, Files } from 'lucide-react';
import PayslipTemplate from '@/components/PayslipTemplate';
import {
  generatePayslipPDF,
  generateMultiPayslipPDF,
  generateBulkPayslipPDF,
  exportPayslipsExcel,
} from '@/utils/pdfExport';

export default function PayslipPage() {
  const { employees, payroll, advances } = useHR();
  const currentYear = new Date().getFullYear();

  // Filters
  const [months, setMonths] = useState<string[]>([MONTHS[new Date().getMonth()]]);
  const [years, setYears] = useState<string[]>([String(currentYear)]);
  const [empIds, setEmpIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bulkLayout, setBulkLayout] = useState<'full' | 'compact'>('full');
  const [previewMode, setPreviewMode] = useState<'compact' | 'full'>('compact');

  // Option lists derived from data
  const monthOptions = MONTHS.map(m => ({ value: m, label: m }));
  const yearOptions = getYearOptions().map(y => ({ value: String(y), label: String(y) }));
  const empOptions = employees.map(e => ({ value: e.id, label: `${e.id} — ${e.name}` }));
  const deptOptions = useMemo(
    () => Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map(d => ({ value: d, label: d })),
    [employees]
  );
  const desigOptions = useMemo(
    () => Array.from(new Set(employees.map(e => e.designation).filter(Boolean))).map(d => ({ value: d, label: d })),
    [employees]
  );
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const resetFilters = () => {
    setMonths([MONTHS[new Date().getMonth()]]);
    setYears([String(currentYear)]);
    setEmpIds([]);
    setDepartments([]);
    setDesignations([]);
    setStatuses([]);
    setDateFrom('');
    setDateTo('');
  };

  // Apply all filters
  const filteredEntries = useMemo(() => {
    const empById = new Map(employees.map(e => [e.id, e]));
    return payroll.filter(p => {
      if (months.length && !months.includes(p.month)) return false;
      if (years.length && !years.includes(String(p.year || currentYear))) return false;
      if (empIds.length && !empIds.includes(p.employeeId)) return false;

      const emp = empById.get(p.employeeId);
      if (departments.length && (!emp || !departments.includes(emp.department))) return false;
      if (designations.length && (!emp || !designations.includes(emp.designation))) return false;
      if (statuses.length && (!emp || !statuses.includes(emp.status))) return false;

      if (dateFrom && p.date && p.date < dateFrom) return false;
      if (dateTo && p.date && p.date > dateTo) return false;

      return true;
    }).sort((a, b) => {
      // group by employee then by year/month
      if (a.employeeName !== b.employeeName) return a.employeeName.localeCompare(b.employeeName);
      const ay = a.year || currentYear, by = b.year || currentYear;
      if (ay !== by) return ay - by;
      return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
    });
  }, [payroll, employees, months, years, empIds, departments, designations, statuses, dateFrom, dateTo, currentYear]);

  const selectAllEmployees = () => setEmpIds(employees.map(e => e.id));

  const downloadPDF = () => {
    if (filteredEntries.length === 1) {
      generatePayslipPDF(filteredEntries[0], employees, advances);
    } else {
      generateMultiPayslipPDF(filteredEntries, employees, advances,
        `Payslips_${months.join('-') || 'All'}_${years.join('-') || ''}.pdf`);
    }
  };

  const bulkCompact = () => generateBulkPayslipPDF(filteredEntries, employees, bulkLayout, advances);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Payslip Generator</h1>
            <p className="text-sm text-muted-foreground">Filter, preview, and export payslips for any employees and months</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 sm:p-6 card-shadow border border-border mb-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Months</label>
            <MultiSelect options={monthOptions} selected={months} onChange={setMonths} placeholder="All months" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Years</label>
            <MultiSelect options={yearOptions} selected={years} onChange={setYears} placeholder="All years" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Employees</label>
            <MultiSelect options={empOptions} selected={empIds} onChange={setEmpIds} placeholder="All employees" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Department</label>
            <MultiSelect options={deptOptions} selected={departments} onChange={setDepartments} placeholder="Any department" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Designation</label>
            <MultiSelect options={desigOptions} selected={designations} onChange={setDesignations} placeholder="Any designation" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
            <MultiSelect options={statusOptions} selected={statuses} onChange={setStatuses} placeholder="Any status" width="w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pay Date From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pay Date To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={selectAllEmployees}>
            <Files className="w-4 h-4 mr-1.5" /> Select All Employees
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset Filters
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredEntries.length} payslip{filteredEntries.length === 1 ? '' : 's'} matched
          </span>

          <div className="sm:ml-auto flex gap-2 flex-wrap">
            <Select value={previewMode} onValueChange={v => setPreviewMode(v as 'compact' | 'full')}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact preview</SelectItem>
                <SelectItem value="full">Full preview</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkLayout} onValueChange={v => setBulkLayout(v as 'full' | 'compact')}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Bulk: Full page</SelectItem>
                <SelectItem value="compact">Bulk: 6 per page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-emerald-600"
              disabled={!filteredEntries.length}
              onClick={() => exportPayslipsExcel(filteredEntries, employees)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Excel
            </Button>
            <Button disabled={!filteredEntries.length} onClick={downloadPDF}>
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <Button variant="secondary" disabled={!filteredEntries.length} onClick={bulkCompact}>
              <Files className="w-4 h-4 mr-2" /> Bulk Generate
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {filteredEntries.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payroll entries match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" /> Previewing {filteredEntries.length} payslip{filteredEntries.length === 1 ? '' : 's'}
          </div>
          <div className={previewMode === 'compact' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-6 max-w-2xl mx-auto'}>
            {filteredEntries.map(entry => (
              <PayslipTemplate key={entry.id} entry={entry} compact={previewMode === 'compact'} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
