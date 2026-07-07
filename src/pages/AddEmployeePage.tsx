import { useEffect, useState } from 'react';
import { useHR } from '@/context/HRContext';
import { Employee, generateEmployeeId } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';
import { usePayslipComponents } from '@/hooks/useCompanySettings';
import {
  ComponentAmounts, computeComponentDefaults,
  COMPONENT_LABELS, COMPONENT_FORMULA_HINT,
} from '@/utils/payslipFormulas';

export default function AddEmployeePage() {
  const { employees, setEmployees, departments, roles } = useHR();
  const { toast } = useToast();
  const [components] = usePayslipComponents();
  const newId = generateEmployeeId(employees);

  const activeDepts = departments.filter(d => d.status === 'Active');
  const activeRoles = roles.filter(r => r.status === 'Active');

  const [form, setForm] = useState<{
    name: string; fixedSalary: string; dateOfJoining: string; department: string; designation: string; phone: string; status: 'Active' | 'Inactive';
  }>({
    name: '', fixedSalary: '', dateOfJoining: '', department: '', designation: '', phone: '', status: 'Active',
  });

  // Component amounts (string for free-text input), auto-filled from formulas
  // until the user manually edits a field.
  const [comp, setComp] = useState<Record<keyof ComponentAmounts, string>>({
    hra: '', specialAllowance: '', medicalAllowance: '', travelAllowance: '', otherEarnings: '',
    pf: '', esi: '', professionalTax: '', loanRecovery: '', otherDeductions: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Recompute defaults whenever salary or enabled components change.
  useEffect(() => {
    const basic = parseFloat(form.fixedSalary) || 0;
    const defaults = computeComponentDefaults(basic, components);
    setComp(prev => {
      const next = { ...prev };
      (Object.keys(defaults) as Array<keyof ComponentAmounts>).forEach(k => {
        if (!touched[k]) next[k] = defaults[k] ? String(defaults[k]) : '';
      });
      return next;
    });
  }, [form.fixedSalary, components, touched]);

  const setCompField = (k: keyof ComponentAmounts, v: string) => {
    setTouched(t => ({ ...t, [k]: true }));
    setComp(prev => ({ ...prev, [k]: v }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fixedSalary || !form.department || !form.designation) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    const num = (s: string) => parseFloat(s) || 0;
    const emp: Employee = {
      id: newId, name: form.name, fixedSalary: parseFloat(form.fixedSalary),
      dateOfJoining: form.dateOfJoining, department: form.department,
      designation: form.designation, phone: form.phone, status: form.status,
      ...(components.hra && { hra: num(comp.hra) }),
      ...(components.specialAllowance && { specialAllowance: num(comp.specialAllowance) }),
      ...(components.medicalAllowance && { medicalAllowance: num(comp.medicalAllowance) }),
      ...(components.travelAllowance && { travelAllowance: num(comp.travelAllowance) }),
      ...(components.otherEarnings && { otherEarnings: num(comp.otherEarnings) }),
      ...(components.pf && { pf: num(comp.pf) }),
      ...(components.esi && { esi: num(comp.esi) }),
      ...(components.professionalTax && { professionalTax: num(comp.professionalTax) }),
      ...(components.loanRecovery && { loanRecovery: num(comp.loanRecovery) }),
      ...(components.otherDeductions && { otherDeductions: num(comp.otherDeductions) }),
    };
    setEmployees(prev => [...prev, emp]);
    setForm({ name: '', fixedSalary: '', dateOfJoining: '', department: '', designation: '', phone: '', status: 'Active' });
    setComp({ hra: '', specialAllowance: '', medicalAllowance: '', travelAllowance: '', otherEarnings: '', pf: '', esi: '', professionalTax: '', loanRecovery: '', otherDeductions: '' });
    setTouched({});
    toast({ title: 'Employee Added', description: `${emp.name} (${emp.id}) added successfully` });
  };

  const earnKeys: Array<keyof ComponentAmounts> = ['hra', 'specialAllowance', 'medicalAllowance', 'travelAllowance', 'otherEarnings'];
  const dedKeys: Array<keyof ComponentAmounts> = ['pf', 'esi', 'professionalTax', 'loanRecovery', 'otherDeductions'];
  const enabledEarn = earnKeys.filter(k => (components as any)[k]);
  const enabledDed = dedKeys.filter(k => (components as any)[k]);

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Add Employee</h1>
          <p className="text-sm text-muted-foreground">Register a new employee</p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 card-shadow border border-border">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Employee ID</label>
            <Input value={newId} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Employee Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Fixed Salary (₹) *</label>
              <Input type="number" min="0" value={form.fixedSalary} onChange={e => setForm(f => ({ ...f, fixedSalary: e.target.value }))} placeholder="Monthly salary" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Department *</label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>{activeDepts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Designation *</label>
              <Select value={form.designation} onValueChange={v => setForm(f => ({ ...f, designation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{activeRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Date of Joining</label>
              <Input type="date" value={form.dateOfJoining} onChange={e => setForm(f => ({ ...f, dateOfJoining: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'Active' | 'Inactive' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(enabledEarn.length > 0 || enabledDed.length > 0) && (
            <div className="border-t border-border pt-4 space-y-4">
              {enabledEarn.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Earnings Components</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {enabledEarn.map(k => (
                      <div key={k}>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {COMPONENT_LABELS[k]} (₹)
                        </label>
                        <Input value={comp[k]} onChange={e => setCompField(k, e.target.value)}
                          placeholder="0" inputMode="decimal" />
                        <p className="text-xs text-muted-foreground mt-1">Auto: {COMPONENT_FORMULA_HINT[k]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {enabledDed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deduction Components</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {enabledDed.map(k => (
                      <div key={k}>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {COMPONENT_LABELS[k]} (₹)
                        </label>
                        <Input value={comp[k]} onChange={e => setCompField(k, e.target.value)}
                          placeholder="0" inputMode="decimal" />
                        <p className="text-xs text-muted-foreground mt-1">Auto: {COMPONENT_FORMULA_HINT[k]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full h-11 font-semibold">
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </form>
      </div>
    </div>
  );
}
