import { useState, useMemo } from 'react';
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
});

export default function PayrollPage() {
  const { employees, payroll, setPayroll, advances, setAdvances, roles } = useHR();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>(currentYear);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayrollFormData>(emptyForm());

  const [viewEntry, setViewEntry] = useState<PayrollEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return payroll.filter(p => {
      if (filterMonth !== 'All' && p.month !== filterMonth) return false;
      if (filterYear !== 'All' && (p.year || currentYear) !== filterYear) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.employeeName.toLowerCase().includes(q) && !p.employeeId.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [payroll, filterMonth, filterYear, search, currentYear]);

  const stats = useMemo(() => {
    const totalNet = filtered.reduce((s, p) => s + p.netPayable, 0);
    const totalAdv = filtered.reduce((s, p) => s + p.advanceDeduction, 0);
    return { count: filtered.length, totalNet, totalAdv };
  }, [filtered]);

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
    });
    setFormOpen(true);
  };

  const onEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const activeAdv = advances.find(a => a.employeeId === empId && a.status === 'Active');
    setForm(f => ({
      ...f,
      employeeId: empId,
      monthlySalary: emp.fixedSalary,
      advanceDeduction: editingId ? f.advanceDeduction : (activeAdv?.monthlyDeductionAmount || 0),
    }));
  };

  const handleSave = () => {
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
      monthlySalary: form.monthlySalary,
      presentDays: form.presentDays,
      holidays: form.holidays,
      otHours: form.otHours,
      advanceDeduction: form.advanceDeduction,
      bonus: form.bonus,
      ...calcResult,
    };

    if (editingId) {
      const old = payroll.find(p => p.id === editingId);
      const advDelta = newEntry.advanceDeduction - (old?.advanceDeduction || 0);
      if (advDelta !== 0) updateAdvance(form.employeeId, advDelta, `${form.month} ${form.year}`);
      setPayroll(prev => prev.map(p => p.id === editingId ? newEntry : p));
      toast({ title: 'Updated', description: `Payslip for ${emp.name} updated` });
    } else {
      if (newEntry.advanceDeduction > 0) updateAdvance(form.employeeId, newEntry.advanceDeduction, `${form.month} ${form.year}`);
      setPayroll(prev => [...prev, newEntry]);
      toast({ title: 'Saved', description: `Payslip for ${emp.name} created` });
    }
    setFormOpen(false);
  };

  const updateAdvance = (empId: string, amount: number, monthLabel: string) => {
    setAdvances(prev => prev.map(adv => {
      if (adv.employeeId === empId && adv.status === 'Active') {
        const newDeducted = Math.max(0, adv.totalDeducted + amount);
        const newBalance = adv.advanceAmount - newDeducted;
        return {
          ...adv,
          totalDeducted: newDeducted,
          remainingBalance: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'Closed' : 'Active',
          deductionHistory: amount > 0 ? [...adv.deductionHistory, { month: monthLabel, amount }] : adv.deductionHistory,
        };
      }
      return adv;
    }));
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const entry = payroll.find(p => p.id === deleteId);
    if (entry && entry.advanceDeduction > 0) updateAdvance(entry.employeeId, -entry.advanceDeduction, '');
    setPayroll(prev => prev.filter(p => p.id !== deleteId));
    toast({ title: 'Deleted', description: 'Payslip removed' });
    setDeleteId(null);
  };

  const handleDownload = (entry: PayrollEntry) => {
    generatePayslipPDF(entry, employees);
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
            <Input placeholder="Search by name or employee ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Months</SelectItem>
              {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(filterYear)} onValueChange={v => setFilterYear(v === 'All' ? 'All' : Number(v))}>
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
        {filtered.length === 0 ? (
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
                  <TableHead className="text-center font-semibold">Days</TableHead>
                  <TableHead className="text-center font-semibold">OT Hrs</TableHead>
                  <TableHead className="text-right font-semibold">Salary</TableHead>
                  <TableHead className="text-right font-semibold">Adv. Ded.</TableHead>
                  <TableHead className="text-right font-semibold">Net Pay</TableHead>
                  <TableHead className="text-center font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-primary">{entry.employeeId}</TableCell>
                    <TableCell className="font-medium">{entry.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{entry.month} {entry.year || currentYear}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.date}</TableCell>
                    <TableCell className="text-center">{entry.presentDays + entry.holidays}</TableCell>
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
              <Label className="text-sm font-medium">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" />
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
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold mt-0.5">{viewEntry.date}</p>
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Monthly Salary', viewEntry.monthlySalary],
                      ['Present Days', viewEntry.presentDays, 'Present Amount', viewEntry.presentAmount],
                      ['Holidays', viewEntry.holidays, 'Holiday Amount', viewEntry.holidayAmount],
                      ['OT Hours', viewEntry.otHours, 'OT Amount', viewEntry.otAmount],
                      ['Welfare', viewEntry.welfareAmount],
                      ['Bonus', viewEntry.bonus],
                      ['Advance Deduction', viewEntry.advanceDeduction],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{row[0]}</td>
                        <td className="px-3 py-2 text-right font-mono">{typeof row[1] === 'number' && (row[0] as string).includes('Days') || (row[0] as string).includes('Hours') ? row[1] : formatCurrency(row[1] as number)}</td>
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
