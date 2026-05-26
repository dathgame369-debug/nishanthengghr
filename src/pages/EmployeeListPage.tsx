import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import { Employee, formatCurrency } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Pencil, Trash2, Search, UserPlus } from 'lucide-react';
import { usePayslipComponents } from '@/hooks/useCompanySettings';
import { PayslipComponents } from '@/utils/companySettings';

export default function EmployeeListPage() {
  const { employees, setEmployees, payroll, setPayroll, departments, roles } = useHR();
  const [components] = usePayslipComponents();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const activeDepts = departments.filter(d => d.status === 'Active');
  const activeRoles = roles.filter(r => r.status === 'Active');

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editEmp) return;
    setEmployees(prev => prev.map(e => e.id === editEmp.id ? editEmp : e));
    setPayroll(prev => prev.map(p => p.employeeId === editEmp.id ? { ...p, monthlySalary: editEmp.fixedSalary, employeeName: editEmp.name } : p));
    setEditEmp(null);
    toast({ title: 'Updated', description: `${editEmp.name} updated successfully` });
  };

  const handleDelete = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({ title: 'Deleted', description: 'Employee removed' });
  };

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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="pl-9" />
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
              <TableHead>Designation</TableHead><TableHead className="text-right">Fixed Salary</TableHead>
              {enabledEarnings.map(f => <TableHead key={f.key} className="text-right">{f.label}</TableHead>)}
              {enabledDeductions.map(f => <TableHead key={f.key} className="text-right">{f.label}</TableHead>)}
              <TableHead>Joining</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium text-primary">{emp.id}</TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>{emp.designation}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(emp.fixedSalary)}</TableCell>
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
                <TableCell>{emp.dateOfJoining || '—'}</TableCell>
                <TableCell>
                  <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'}
                    className={emp.status === 'Active' ? 'bg-success text-success-foreground' : ''}>
                    {emp.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditEmp({ ...emp })}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8 + enabledEarnings.length + enabledDeductions.length} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editEmp && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Employee ID</label><Input value={editEmp.id} disabled className="bg-muted" /></div>
              <div><label className="text-sm font-medium block mb-1">Name</label><Input value={editEmp.name} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Fixed Salary (₹)</label><Input type="number" value={editEmp.fixedSalary} onChange={e => setEditEmp({ ...editEmp, fixedSalary: parseFloat(e.target.value) || 0 })} /></div>
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

              <Button onClick={handleSave} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
