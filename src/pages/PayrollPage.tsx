import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHR } from '@/context/HRContext';
import { PayrollEntry, MONTHS, getYearOptions, calculatePayroll, formatCurrency } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Plus, Search, Eye, Pencil, Trash2, Download, FileText, IndianRupee, Users, TrendingUp } from 'lucide-react';
import { generatePayslipPDF } from '@/utils/pdfExport';
import { TablePagination } from '@/components/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/context/ActivityLogContext';

interface PayrollFormData {
  employeeId: string;
  date: string;
  month: string;
  year: number;
  monthlySalary: number;
  presentDays: number;
  holidays: number;
  otHours: number;
  advanceDeduction: number;
  bonus: number;
  noOfLeaves: number;
  modeOfPayment: string;
}

const emptyForm = (): PayrollFormData => ({
  employeeId: '',
  date: new Date().toISOString().split('T')[0],
  month: MONTHS[new Date().getMonth()],
  year: new Date().getFullYear(),
  monthlySalary: 0,
  presentDays: 0,
  holidays: 0,
  otHours: 0,
  advanceDeduction: 0,
  bonus: 0,
  noOfLeaves: 0,
  modeOfPayment: 'Bank Transfer',
});

export default function PayrollPage() {
  const { employees, payroll, totalPayroll, fetchPayroll, setPayroll, roles } = useHR();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const currentYear = new Date().getFullYear();

  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>(currentYear);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayrollFormData>(emptyForm());

  const [viewEntry, setViewEntry] = useState<PayrollEntry | null>(null);
  const [viewAdvanceBalance, setViewAdvanceBalance] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch advance balance whenever the view modal opens
  useEffect(() => {
    if (!viewEntry) { setViewAdvanceBalance(null); return; }
    supabase
      .from('advances')
      .select('advance_amount,deduction_history')
      .eq('employee_id', viewEntry.employeeId)
      .then(({ data }) => {
        if (!data || data.length === 0) { setViewAdvanceBalance(null); return; }
        const adv = data[0];
        const entryMonthIdx = MONTHS.indexOf(viewEntry.month);
        const entryYear = viewEntry.year || new Date().getFullYear();
        const deductedSoFar = (adv.deduction_history || []).reduce((sum: number, d: { month: string; amount: number }) => {
          const parts = (d.month || '').split(' ');
          const dMonthIdx = MONTHS.indexOf(parts[0]);
          const dYear = parseInt(parts[1], 10);
          if (!isNaN(dYear) && dMonthIdx !== -1) {
            if (dYear < entryYear || (dYear === entryYear && dMonthIdx <= entryMonthIdx)) {
              return sum + (d.amount || 0);
            }
          }
          return sum;
        }, 0);
        setViewAdvanceBalance(Math.max(0, Number(adv.advance_amount) - deductedSoFar));
      });
  }, [viewEntry]);

  const totalPages = Math.max(1, Math.ceil(totalPayroll / pageSize));

  // Fetch payroll from server whenever filters/page change
  const doFetch = useCallback(() => {
    fetchPayroll(page, pageSize, {
      month: filterMonth !== 'All' ? filterMonth : undefined,
      year: filterYear,
      search: search || undefined,
    });
  }, [page, pageSize, filterMonth, filterYear, search, fetchPayroll]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterYear, search]);

  const stats = useMemo(() => {
    const totalNet = payroll.reduce((s, p) => s + p.netPayable, 0);
    const totalAdv = payroll.reduce((s, p) => s + p.advanceDeduction, 0);
    return { count: totalPayroll, totalNet, totalAdv };
  }, [payroll, totalPayroll]);

  const formEmp = employees.find(e => e.id === form.employeeId);
  const formRole = formEmp ? roles.find(r => r.name === formEmp.designation) : undefined;
  const formWelfare = formRole
    ? { enabled: !!formRole.welfareEnabled, rate: formRole.welfareRate || 0, basisHours: formRole.welfareBasisHours || 4 }
    : { enabled: false, rate: 0, basisHours: 4 };
  const calc = calculatePayroll(form, formWelfare);

  const openAdd = () => {
    setEditingId(null);
    const f = emptyForm();
    f.month = filterMonth !== 'All' ? filterMonth : MONTHS[new Date().getMonth()];
    f.year = filterYear !== 'All' ? filterYear : currentYear;
    setForm(f);
    setFormOpen(true);
  };

  const openEdit = (entry: PayrollEntry) => {
    setEditingId(entry.id);
    setForm({
      employeeId: entry.employeeId,
      date: entry.date,
      month: entry.month,
      year: entry.year || currentYear,
      monthlySalary: entry.monthlySalary,
      presentDays: entry.presentDays,
      holidays: entry.holidays,
      otHours: entry.otHours,
      advanceDeduction: entry.advanceDeduction,
      bonus: entry.bonus,
      noOfLeaves: entry.noOfLeaves || 0,
      modeOfPayment: entry.modeOfPayment || 'Bank Transfer',
    });
    setFormOpen(true);
  };

  const onEmployeeChange = async (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    // Fetch active advance for this employee directly from DB
    const { data: advData } = await supabase
      .from('advances')
      .select('*')
      .eq('employee_id', empId)
      .eq('status', 'Active')
      .maybeSingle();
    const monthlyDed = 0;
    setForm(f => ({
      ...f,
      employeeId: empId,
      monthlySalary: emp.fixedSalary,
      advanceDeduction: editingId ? f.advanceDeduction : monthlyDed,
    }));
  };

  const handleSave = async () => {
    if (!form.employeeId) {
      toast({ title: 'Validation', description: 'Please select an employee', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp) return;

    const role = roles.find(r => r.name === emp.designation);
    const welfare = role
      ? { enabled: !!role.welfareEnabled, rate: role.welfareRate || 0, basisHours: role.welfareBasisHours || 4 }
      : { enabled: false, rate: 0, basisHours: 4 };
    const calcResult = calculatePayroll(form, welfare);
    const newEntry: PayrollEntry = {
      id: editingId || `PAY-${form.employeeId}-${form.month}-${form.year}-${Date.now()}`,
      employeeId: form.employeeId,
      employeeName: emp.name,
      date: form.date,
      month: form.month,
      year: form.year,
      modeOfPayment: form.modeOfPayment,
      monthlySalary: form.monthlySalary,
      presentDays: form.presentDays,
      holidays: form.holidays,
      otHours: form.otHours,
      advanceDeduction: form.advanceDeduction,
      bonus: form.bonus,
      noOfLeaves: form.noOfLeaves,
      ...calcResult,
    };

    if (editingId) {
      const old = payroll.find(p => p.id === editingId);
      const advDelta = newEntry.advanceDeduction - (old?.advanceDeduction || 0);
      if (advDelta !== 0) {
        // Validate + update advance balance directly in DB
        const { data: activeAdv } = await supabase
          .from('advances')
          .select('*')
          .eq('employee_id', form.employeeId)
          .eq('status', 'Active')
          .maybeSingle();
        if (activeAdv && advDelta > Number(activeAdv.remaining_balance)) {
          toast({ title: 'Exceeds remaining advance', description: `Deduction cannot exceed remaining ₹${Number(activeAdv.remaining_balance).toLocaleString()}`, variant: 'destructive' });
          return;
        }
        if (activeAdv) await updateAdvanceInDB(activeAdv, advDelta, `${form.month} ${form.year}`);
      }
      setPayroll(prev => prev.map(p => p.id === editingId ? newEntry : p));
      logActivity('Updated', 'Payroll', `Payslip for ${emp.name} (${form.month} ${form.year}) updated`);
      toast({ title: 'Updated', description: `Payslip for ${emp.name} updated` });
    } else {
      // Validate + update advance balance directly in DB
      if (newEntry.advanceDeduction > 0) {
        const { data: activeAdv } = await supabase
          .from('advances')
          .select('*')
          .eq('employee_id', form.employeeId)
          .eq('status', 'Active')
          .maybeSingle();
        if (activeAdv && newEntry.advanceDeduction > Number(activeAdv.remaining_balance)) {
          toast({ title: 'Exceeds remaining advance', description: `Deduction cannot exceed remaining ₹${Number(activeAdv.remaining_balance).toLocaleString()}`, variant: 'destructive' });
          return;
        }
        if (activeAdv) await updateAdvanceInDB(activeAdv, newEntry.advanceDeduction, `${form.month} ${form.year}`);
      }
      setPayroll(prev => [...prev, newEntry]);
      logActivity('Created', 'Payroll', `Payslip for ${emp.name} (${form.month} ${form.year}) created — Net: ₹${newEntry.netPayable.toLocaleString()}`);
      toast({ title: 'Saved', description: `Payslip for ${emp.name} created` });
    }
    setFormOpen(false);
    doFetch(); // Refresh current page
  };

  // Update advance balance directly in Supabase (no need for in-memory state)
  const updateAdvanceInDB = async (advRow: any, amount: number, monthLabel: string) => {
    const advId = advRow.id;
    const newDeducted = Math.max(0, Number(advRow.total_deducted) + amount);
    const newBalance = Math.max(0, Number(advRow.advance_amount) - newDeducted);
    const newStatus = newBalance <= 0 ? 'Closed' : 'Active';
    const history = Array.isArray(advRow.deduction_history) ? advRow.deduction_history : [];
    const newHistory = amount > 0 ? [...history, { month: monthLabel, amount }] : history;
    await supabase.from('advances').update({
      total_deducted: newDeducted,
      remaining_balance: newBalance,
      status: newStatus,
      deduction_history: newHistory,
    }).eq('id', advId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const entry = payroll.find(p => p.id === deleteId);
    if (entry && entry.advanceDeduction > 0) {
      // Reverse advance deduction directly in DB
      const { data: activeAdv } = await supabase
        .from('advances')
        .select('*')
        .eq('employee_id', entry.employeeId)
        .eq('status', 'Active')
        .maybeSingle();
      if (activeAdv) {
        await updateAdvanceInDB(activeAdv, -entry.advanceDeduction, '');
      }
    }
    setPayroll(prev => prev.filter(p => p.id !== deleteId));
    logActivity('Deleted', 'Payroll', `Payslip for ${entry?.employeeName} (${entry?.month} ${entry?.year}) deleted`);
    toast({ title: 'Deleted', description: 'Payslip removed' });
    setDeleteId(null);
    doFetch();
  };

  const handleDownload = async (entry: PayrollEntry) => {
    // Fetch the active advance for this employee so balance shows correctly in PDF
    const { data: advRows } = await supabase
      .from('advances')
      .select('id,employee_id,employee_name,advance_date,advance_amount,deduction_type,total_deducted,remaining_balance,notes,status,deduction_history')
      .eq('employee_id', entry.employeeId);
    const advList = (advRows || []).map((r: any) => ({
      id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
      advanceDate: r.advance_date || '', advanceAmount: Number(r.advance_amount),
      deductionType: (r.deduction_type as 'Manual' | 'EMI') || 'Manual',
      monthlyDeductionAmount: 0,
      totalDeducted: Number(r.total_deducted), remainingBalance: Number(r.remaining_balance),
      notes: r.notes || '', status: (r.status as 'Active' | 'Closed') || 'Active',
      deductionHistory: Array.isArray(r.deduction_history) ? r.deduction_history : [],
    }));
    generatePayslipPDF(entry, employees, advList);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Monthly Payroll</h1>
            <p className="text-sm text-muted-foreground">Manage and process monthly payslips</p>
          </div>
        </div>
        <Button onClick={openAdd} size="lg" className="shadow-md w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Add Payslip
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-5 card-shadow border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Records</p>
              <p className="text-2xl font-bold mt-1">{stats.count}</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 card-shadow border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Net Pay</p>
              <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(stats.totalNet)}</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 card-shadow border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Advance Deducted</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{formatCurrency(stats.totalAdv)}</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 card-shadow border border-border mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or employee ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={filterMonth} onValueChange={v => { setFilterMonth(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Months</SelectItem>
              {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(filterYear)} onValueChange={v => { setFilterYear(v === 'All' ? 'All' : Number(v)); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Years</SelectItem>
              {getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        {payroll.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No payroll records found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Click "Add Payslip" to create your first record</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Emp ID</TableHead>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Mode</TableHead>
                  <TableHead className="text-center font-semibold">Present</TableHead>
                  <TableHead className="text-center font-semibold">Holidays</TableHead>
                  <TableHead className="text-center font-semibold">Leaves</TableHead>
                  <TableHead className="text-center font-semibold">OT Hrs</TableHead>
                  <TableHead className="text-right font-semibold">Salary</TableHead>
                  <TableHead className="text-right font-semibold">Adv. Ded.</TableHead>
                  <TableHead className="text-right font-semibold">Net Pay</TableHead>
                  <TableHead className="text-center font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-primary">{entry.employeeId}</TableCell>
                    <TableCell className="font-medium">{entry.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{entry.month} {entry.year || currentYear}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.date ? entry.date.split('-').reverse().join('-') : ""}</TableCell>
                    <TableCell><Badge variant="outline" className="font-normal">{entry.modeOfPayment || 'Bank Transfer'}</Badge></TableCell>
                    <TableCell className="text-center">{entry.presentDays}</TableCell>
                    <TableCell className="text-center">{entry.holidays}</TableCell>
                    <TableCell className="text-center">{entry.noOfLeaves || 0}</TableCell>
                    <TableCell className="text-center">{entry.otHours}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.monthlySalary)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">{formatCurrency(entry.advanceDeduction)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(entry.netPayable)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewEntry(entry)} title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(entry)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleDownload(entry)} title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(entry.id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalPayroll}
            onPageChange={setPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
          />
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingId ? 'Edit Payslip' : 'Add New Payslip'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update payroll details for this record.' : 'Fill in the payroll details to create a new payslip.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            <div className="md:col-span-3">
              <Label className="text-sm font-medium">Employee *</Label>
              <Select value={form.employeeId} onValueChange={onEmployeeChange} disabled={!!editingId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'Active').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.id} — {emp.name} ({formatCurrency(emp.fixedSalary)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Month *</Label>
              <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Year *</Label>
              <Select value={String(form.year)} onValueChange={v => setForm(f => ({ ...f, year: Number(v) }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Payment Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Mode of Payment</Label>
              <Select value={form.modeOfPayment} onValueChange={v => setForm(f => ({ ...f, modeOfPayment: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Monthly Salary</Label>
              <Input
                type="number"
                value={form.monthlySalary}
                readOnly
                disabled
                className="mt-1.5 bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-filled from employee record</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Present Days</Label>
              <Input type="number" min="0" max="31" value={form.presentDays} onChange={e => setForm(f => ({ ...f, presentDays: parseFloat(e.target.value) || 0 }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Holidays</Label>
              <Input type="number" min="0" max="10" value={form.holidays} onChange={e => setForm(f => ({ ...f, holidays: parseFloat(e.target.value) || 0 }))} className="mt-1.5" />
            </div>

            <div>
              <Label className="text-sm font-medium">No. of Leaves</Label>
              <Input type="number" min="0" value={form.noOfLeaves} onChange={e => setForm(f => ({ ...f, noOfLeaves: parseInt(e.target.value) || 0 }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">OT Hours</Label>
              <Input type="number" min="0" value={form.otHours} onChange={e => setForm(f => ({ ...f, otHours: parseFloat(e.target.value) || 0 }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Advance Deduction</Label>
              <Input type="number" min="0" value={form.advanceDeduction} onChange={e => setForm(f => ({ ...f, advanceDeduction: parseFloat(e.target.value) || 0 }))} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium">Bonus</Label>
              <Input type="number" min="0" value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: parseFloat(e.target.value) || 0 }))} className="mt-1.5" />
            </div>
          </div>

          {/* Live Calculation Summary */}
          <div className="bg-muted/40 rounded-lg p-4 border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Calculation Preview</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Present Amt</p>
                <p className="font-mono font-semibold">{formatCurrency(calc.presentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holiday Amt</p>
                <p className="font-mono font-semibold">{formatCurrency(calc.holidayAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">OT Amt</p>
                <p className="font-mono font-semibold">{formatCurrency(calc.otAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Welfare</p>
                <p className="font-mono font-semibold">{formatCurrency(calc.welfareAmount)}</p>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Net Payable</span>
              <span className="text-xl font-bold font-mono text-primary">{formatCurrency(calc.netPayable)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update Payslip' : 'Save Payslip'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewEntry} onOpenChange={o => !o && setViewEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>{viewEntry?.employeeName} — {viewEntry?.month} {viewEntry?.year}</DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <p className="font-semibold mt-0.5">{viewEntry.employeeId}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Payment Date</p>
                  <p className="font-semibold mt-0.5">{viewEntry.date ? viewEntry.date.split('-').reverse().join('-') : ""}</p>
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Monthly Salary', viewEntry.monthlySalary],
                      ['Present Days', viewEntry.presentDays, 'Present Amount', viewEntry.presentAmount],
                      ['Holidays', viewEntry.holidays, 'Holiday Amount', viewEntry.holidayAmount],
                      ['No. of Leaves', viewEntry.noOfLeaves || 0, 'Leave Amount', (viewEntry.noOfLeaves || 0) * (viewEntry.monthlySalary / 26)],
                      ['OT Hours', viewEntry.otHours, 'OT Amount', viewEntry.otAmount],
                      ['Welfare', viewEntry.welfareAmount],
                      ['Bonus', viewEntry.bonus],
                      ['Advance Deduction', viewEntry.advanceDeduction],
                      ...(viewAdvanceBalance !== null ? [['Balance Advance', viewAdvanceBalance]] : []),
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{row[0]}</td>
                        <td className="px-3 py-2 text-right font-mono">{typeof row[1] === 'number' && ((row[0] as string).includes('Days') || (row[0] as string).includes('Hours') || (row[0] as string).includes('Leaves') || row[0] === 'Holidays') ? row[1] : formatCurrency(row[1] as number)}</td>
                        {row.length > 2 && (
                          <>
                            <td className="px-3 py-2 text-muted-foreground border-l border-border">{row[2]}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatCurrency(row[3] as number)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-primary/10">
                      <td colSpan={3} className="px-3 py-3 font-bold">Net Payable</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-primary text-lg">{formatCurrency(viewEntry.netPayable)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewEntry(null)}>Close</Button>
            <Button onClick={() => viewEntry && handleDownload(viewEntry)}>
              <Download className="w-4 h-4 mr-2" /> Download Payslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payslip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The payroll record will be permanently removed and any associated advance deduction will be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
