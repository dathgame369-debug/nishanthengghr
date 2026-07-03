import { useMemo, useState, useEffect } from 'react';
import { useHR, advFromRow } from '@/context/HRContext';
import { supabase } from '@/integrations/supabase/client';
import { MONTHS, getYearOptions } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { FileText, Download, FileSpreadsheet, Eye, RotateCcw, Files } from 'lucide-react';
import PayslipTemplate from '@/components/PayslipTemplate';
import {
  generatePayslipPDF,
  generateBulkPayslipPDF,
  exportPayslipsExcel,
} from '@/utils/pdfExport';
import { TablePagination } from '@/components/TablePagination';

// Mapper: DB row → PayrollEntry (mirrors HRContext payFromRow)
const payFromRow = (r: any) => ({
  id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
  date: r.date || '', month: r.month, year: r.year, modeOfPayment: r.mode_of_payment || 'Bank Transfer',
  monthlySalary: Number(r.monthly_salary), presentDays: Number(r.present_days),
  presentAmount: Number(r.present_amount), holidays: Number(r.holidays),
  holidayAmount: Number(r.holiday_amount), otHours: Number(r.ot_hours),
  otAmount: Number(r.ot_amount), welfareAmount: Number(r.welfare_amount),
  advanceDeduction: Number(r.advance_deduction), bonus: Number(r.bonus),
  netPayable: Math.round(Number(r.net_payable)), noOfLeaves: Number(r.no_of_leaves || 0),
});

export default function PayslipPage() {
  const { employees, session } = useHR();

  // Fetch ALL payroll records for client-side filtering (context only holds one page)
  const [allPayroll, setAllPayroll] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoadingPayroll(true);
    supabase
      .from('payroll')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setAllPayroll(data.map(payFromRow));
        setLoadingPayroll(false);
      });
  }, [session]);

  // Fetch ALL advances so balance shows correctly (context only holds one page)
  const [allAdvances, setAllAdvances] = useState<any[]>([]);
  useEffect(() => {
    if (!session) return;
    supabase
      .from('advances')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) {
          setAllAdvances(data.map(advFromRow));
        } else if (error) {
          console.error("Failed to fetch allAdvances:", error);
        }
      });
  }, [session]);
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
  const [bulkLayout, setBulkLayout] = useState<'1' | '2' | '4' | '6'>('1');
  const [previewMode, setPreviewMode] = useState<'compact' | 'full'>('compact');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

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
    setPage(1);
  };

  // Apply all filters
  const filteredEntries = useMemo(() => {
    const empById = new Map(employees.map(e => [e.id, e]));
    return allPayroll.filter(p => {
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
  }, [allPayroll, employees, months, years, empIds, departments, designations, statuses, dateFrom, dateTo, currentYear]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pagedEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  const selectAllEmployees = () => setEmpIds(employees.map(e => e.id));

  const downloadPDF = () => {
    generateBulkPayslipPDF(filteredEntries, employees, bulkLayout, allAdvances, allPayroll);
  };

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

        <div className="flex overflow-x-auto no-scrollbar gap-2 items-center pt-2 border-t border-border pb-1">
          <Button variant="outline" size="sm" onClick={selectAllEmployees} className="shrink-0">
            <Files className="w-4 h-4 mr-1.5" /> Select All Employees
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} className="shrink-0">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset Filters
          </Button>
          <span className="text-xs text-muted-foreground mx-2 shrink-0">
            {filteredEntries.length} payslip{filteredEntries.length === 1 ? '' : 's'} matched
          </span>

          <div className="flex-1 min-w-[1rem]"></div>
            <Select value={previewMode} onValueChange={v => setPreviewMode(v as 'compact' | 'full')}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact preview</SelectItem>
                <SelectItem value="full">Full preview</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkLayout} onValueChange={v => setBulkLayout(v as '1' | '2' | '4' | '6')}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 per page (Full)</SelectItem>
                <SelectItem value="2">2 per page</SelectItem>
                <SelectItem value="4">4 per page</SelectItem>
                <SelectItem value="6">6 per page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-emerald-600 shrink-0"
              disabled={!filteredEntries.length}
              onClick={() => exportPayslipsExcel(filteredEntries, employees)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Excel
            </Button>
            <Button disabled={!filteredEntries.length} onClick={downloadPDF} className="shrink-0">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
        </div>
      </div>

      {/* Preview */}
      {loadingPayroll ? (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading payroll data…</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payroll entries match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" /> Previewing {filteredEntries.length} payslip{filteredEntries.length === 1 ? '' : 's'} — page {page} of {totalPages}
          </div>
          <div className={previewMode === 'compact' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-6 max-w-2xl mx-auto'}>
            {pagedEntries.map(entry => (
              <PayslipTemplate key={entry.id} entry={entry} compact={previewMode === 'compact'} advances={allAdvances} allPayroll={allPayroll} />
            ))}
          </div>
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredEntries.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[3, 6, 12, 24]}
          />
        </div>
      )}
    </div>
  );
}
