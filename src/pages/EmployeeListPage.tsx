import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import { Employee, formatCurrency, MONTHS, getYearOptions, SalaryHistory } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Pencil, Trash2, Search, UserPlus, History, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { usePayslipComponents } from '@/hooks/useCompanySettings';
import { PayslipComponents } from '@/utils/companySettings';
import { TablePagination } from '@/components/TablePagination';
import { supabase } from '@/integrations/supabase/client';

export default function EmployeeListPage() {
  const { employees, setEmployees, departments, roles } = useHR();
  const [components] = usePayslipComponents();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [originalSalary, setOriginalSalary] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Salary-change effective-from pickers (default to current month/year)
  const now = new Date();
  const [effectiveMonth, setEffectiveMonth] = useState<string>(MONTHS[now.getMonth()]);
  const [effectiveYear, setEffectiveYear] = useState<number>(now.getFullYear());

  // Salary history for the currently-editing employee
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // View-only dialog
  const [viewEmp, setViewEmp] = useState<Employee | null>(null);
  const [viewHistory, setViewHistory] = useState<SalaryHistory[]>([]);

  const activeDepts = departments.filter(d => d.status === 'Active');
  const activeRoles = roles.filter(r => r.status === 'Active');

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fetchSalaryHistory = async (empId: string) => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('employee_salary_history')
      .select('*')
      .eq('employee_id', empId)
      .order('effective_year', { ascending: true });
    if (error) {
      console.error('[salary_history] fetch failed:', error.code, error.message, error.details);
    }
    if (data) {
      setSalaryHistory(data.map((r: any): SalaryHistory => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        effectiveMonth: r.effective_month,
        effectiveYear: Number(r.effective_year),
        basicSalary: Number(r.basic_salary),
        createdAt: r.created_at,
      })));
    }
    setHistoryLoading(false);
  };

  const openEdit = (emp: Employee) => {
    setEditEmp({ ...emp });
    setOriginalSalary(emp.fixedSalary);
    setEffectiveMonth(MONTHS[now.getMonth()]);
    setEffectiveYear(now.getFullYear());
    setHistoryOpen(false);
    fetchSalaryHistory(emp.id);
  };

  const openView = async (emp: Employee) => {
    setViewEmp(emp);
    const { data } = await supabase
      .from('employee_salary_history')
      .select('*')
      .eq('employee_id', emp.id)
      .order('effective_year', { ascending: true });
    if (data) {
      const sorted = data
        .map((r: any): SalaryHistory => ({
          id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
          effectiveMonth: r.effective_month, effectiveYear: Number(r.effective_year),
          basicSalary: Number(r.basic_salary), createdAt: r.created_at,
        }))
        .sort((a: SalaryHistory, b: SalaryHistory) => {
          if (a.effectiveYear !== b.effectiveYear) return a.effectiveYear - b.effectiveYear;
          return MONTHS.indexOf(a.effectiveMonth) - MONTHS.indexOf(b.effectiveMonth);
        });
      setViewHistory(sorted);
    } else {
      setViewHistory([]);
    }
  };

  const handleSave = async () => {
    if (!editEmp) return;
    const salaryChanged = editEmp.fixedSalary !== originalSalary;

    // Update employee record
    setEmployees(prev => prev.map(e => e.id === editEmp.id ? editEmp : e));

    // If salary changed → insert a history record.
    // NOTE: We intentionally do NOT touch past payroll records' monthly_salary.
    // Each payroll entry stores the salary that was in effect when that payslip
    // was created, so historical payslips must keep their original amounts.
    if (salaryChanged) {
      const histId = `SALH-${editEmp.id}-${effectiveMonth}-${effectiveYear}-${Date.now()}`;
      const { error } = await supabase.from('employee_salary_history').insert({
        id: histId,
        employee_id: editEmp.id,
        employee_name: editEmp.name,
        effective_month: effectiveMonth,
        effective_year: effectiveYear,
        basic_salary: editEmp.fixedSalary,
      });
      if (error) console.error('Failed to save salary history', error);
      else fetchSalaryHistory(editEmp.id);
    }

    setEditEmp(null);
    toast({ title: 'Updated', description: `${editEmp.name} updated successfully` });
  };

  const handleDelete = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({ title: 'Deleted', description: 'Employee removed' });
  };

  const salaryChanged = editEmp ? editEmp.fixedSalary !== originalSalary : false;

  // Sort history chronologically for display
  const sortedHistory = [...salaryHistory].sort((a, b) => {
    if (a.effectiveYear !== b.effectiveYear) return a.effectiveYear - b.effectiveYear;
    return MONTHS.indexOf(a.effectiveMonth) - MONTHS.indexOf(b.effectiveMonth);
  });

  const earningFields: { key: keyof PayslipComponents; emp: keyof Employee; label: string }[] = [
    { key: 'hra', emp: 'hra', label: 'HRA' },
    { key: 'specialAllowance', emp: 'specialAllowance', label: 'Special Allowance' },
    { key: 'medicalAllowance', emp: 'medicalAllowance', label: 'Medical Allowance' },
    { key: 'travelAllowance', emp: 'travelAllowance', label: 'Travel Allowance' },
    { key: 'otherEarnings', emp: 'otherEarnings', label: 'Other Earnings' },
  ];
  const deductionFields: { key: keyof PayslipComponents; emp: keyof Employee; label: string }[] = [
    { key: 'pf', emp: 'pf', label: 'PF' },
    { key: 'esi', emp: 'esi', label: 'ESI' },
    { key: 'professionalTax', emp: 'professionalTax', label: 'Professional Tax' },
    { key: 'loanRecovery', emp: 'loanRecovery', label: 'Loan Recovery' },
    { key: 'otherDeductions', emp: 'otherDeductions', label: 'Other Deductions' },
  ];
  const enabledEarnings = earningFields.filter(f => components[f.key]);
  const enabledDeductions = deductionFields.filter(f => components[f.key]);

  const setEmpNum = (key: keyof Employee, value: number) => {
    setEditEmp(prev => prev ? ({ ...prev, [key]: value } as Employee) : prev);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Employee List</h1>
            <p className="text-sm text-muted-foreground">{employees.length} employees</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or ID..." className="pl-9" />
          </div>
          <Button onClick={() => navigate('/add-employee')} className="shadow-md w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right">Fixed Salary</TableHead>
              <TableHead className="w-6"></TableHead>
              {enabledEarnings.map(f => <TableHead key={f.key} className="text-right">{f.label}</TableHead>)}
              {enabledDeductions.map(f => <TableHead key={f.key} className="text-right">{f.label}</TableHead>)}
              <TableHead>Joining</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium text-primary">{emp.id}</TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>{emp.designation}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(emp.fixedSalary)}</TableCell>
                <TableCell className="w-6"></TableCell>
                {enabledEarnings.map(f => (
                  <TableCell key={f.key} className="text-right font-mono text-xs">
                    {formatCurrency(Number(emp[f.emp] ?? 0))}
                  </TableCell>
                ))}
                {enabledDeductions.map(f => (
                  <TableCell key={f.key} className="text-right font-mono text-xs">
                    {formatCurrency(Number(emp[f.emp] ?? 0))}
                  </TableCell>
                ))}
                <TableCell>{emp.dateOfJoining ? emp.dateOfJoining.split('-').reverse().join('-') : '—'}</TableCell>
                <TableCell>
                  <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'}
                    className={emp.status === 'Active' ? 'bg-success text-success-foreground' : ''}>
                    {emp.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openView(emp)} title="View details"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8 + enabledEarnings.length + enabledDeductions.length} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editEmp && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Employee ID</label><Input value={editEmp.id} disabled className="bg-muted" /></div>
              <div><label className="text-sm font-medium block mb-1">Name</label><Input value={editEmp.name} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Fixed Salary (₹)</label>
                  <Input
                    type="number"
                    value={editEmp.fixedSalary}
                    onChange={e => setEditEmp({ ...editEmp, fixedSalary: parseFloat(e.target.value) || 0 })}
                  />
                  {salaryChanged && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      ⚠ Changed from {formatCurrency(originalSalary)} → {formatCurrency(editEmp.fixedSalary)}
                    </p>
                  )}
                </div>
                <div><label className="text-sm font-medium block mb-1">Date of Joining</label><Input type="date" value={editEmp.dateOfJoining} onChange={e => setEditEmp({ ...editEmp, dateOfJoining: e.target.value })} /></div>
              </div>

              {/* Effective-from pickers — only shown when salary is changed */}
              {salaryChanged && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Salary Change — Effective From
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select the month from which this new salary applies. Past payslips keep their original salary.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Month</label>
                      <Select value={effectiveMonth} onValueChange={setEffectiveMonth}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Year</label>
                      <Select value={String(effectiveYear)} onValueChange={v => setEffectiveYear(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Department</label>
                  <Select value={editEmp.department} onValueChange={v => setEditEmp({ ...editEmp, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {activeDepts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      {!activeDepts.find(d => d.name === editEmp.department) && editEmp.department && (
                        <SelectItem value={editEmp.department}>{editEmp.department} (legacy)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium block mb-1">Designation</label>
                  <Select value={editEmp.designation} onValueChange={v => setEditEmp({ ...editEmp, designation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {activeRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                      {!activeRoles.find(r => r.name === editEmp.designation) && editEmp.designation && (
                        <SelectItem value={editEmp.designation}>{editEmp.designation} (legacy)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Phone</label><Input value={editEmp.phone} onChange={e => setEditEmp({ ...editEmp, phone: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Status</label>
                <Select value={editEmp.status} onValueChange={v => setEditEmp({ ...editEmp, status: v as 'Active' | 'Inactive' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>

              {(enabledEarnings.length > 0 || enabledDeductions.length > 0) && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Payslip components enabled in <strong>Company Settings</strong>. Values flow to payslips.
                  </p>
                  {enabledEarnings.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Earnings</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {enabledEarnings.map(f => (
                          <div key={f.key}>
                            <label className="text-sm font-medium block mb-1">{f.label} (₹)</label>
                            <Input type="number" value={Number(editEmp[f.emp] ?? 0)}
                              onChange={e => setEmpNum(f.emp, parseFloat(e.target.value) || 0)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {enabledDeductions.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Deductions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {enabledDeductions.map(f => (
                          <div key={f.key}>
                            <label className="text-sm font-medium block mb-1">{f.label} (₹)</label>
                            <Input type="number" value={Number(editEmp[f.emp] ?? 0)}
                              onChange={e => setEmpNum(f.emp, parseFloat(e.target.value) || 0)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Salary History Section ── */}
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setHistoryOpen(o => !o)}
                >
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Salary History</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    {salaryHistory.length} record{salaryHistory.length !== 1 ? 's' : ''}
                  </Badge>
                  <span className="ml-auto">
                    {historyOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </span>
                </button>

                {historyOpen && (
                  <div className="mt-3">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading history…
                      </div>
                    ) : sortedHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No salary changes recorded yet. Changes will appear here when you update the salary above.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Effective Month</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Year</th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Basic Pay</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedHistory.map((h, idx) => (
                              <tr
                                key={h.id}
                                className={`border-b border-border last:border-0 ${
                                  idx === sortedHistory.length - 1 ? 'bg-primary/5' : ''
                                }`}
                              >
                                <td className="px-3 py-2.5 font-medium">{h.effectiveMonth}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{h.effectiveYear}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold text-primary">
                                  {formatCurrency(h.basicSalary)}
                                  {idx === sortedHistory.length - 1 && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">Current</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* View Employee Dialog */}
      <Dialog open={!!viewEmp} onOpenChange={() => setViewEmp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Employee Details
            </DialogTitle>
          </DialogHeader>
          {viewEmp && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Employee ID', viewEmp.id],
                  ['Name', viewEmp.name],
                  ['Department', viewEmp.department || '—'],
                  ['Designation', viewEmp.designation || '—'],
                  ['Phone', viewEmp.phone || '—'],
                  ['Date of Joining', viewEmp.dateOfJoining ? viewEmp.dateOfJoining.split('-').reverse().join('-') : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Salary + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">Current Fixed Salary</p>
                  <p className="font-bold text-primary font-mono text-base mt-0.5">{formatCurrency(viewEmp.fixedSalary)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <Badge variant={viewEmp.status === 'Active' ? 'default' : 'secondary'}
                      className={viewEmp.status === 'Active' ? 'bg-success text-success-foreground' : ''}>
                      {viewEmp.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Salary History */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Salary History</span>
                  <Badge variant="secondary" className="text-xs">{viewHistory.length} record{viewHistory.length !== 1 ? 's' : ''}</Badge>
                </div>
                {viewHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No salary history recorded yet.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewHistory.map((h, idx) => (
                          <tr key={h.id} className={`border-b border-border last:border-0 ${idx === viewHistory.length - 1 ? 'bg-primary/5' : ''}`}>
                            <td className="px-3 py-2.5 font-medium">{h.effectiveMonth}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{h.effectiveYear}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-primary">
                              {formatCurrency(h.basicSalary)}
                              {idx === viewHistory.length - 1 && (
                                <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">Current</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
