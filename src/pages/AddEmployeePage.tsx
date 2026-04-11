import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import { Employee, generateEmployeeId, DEPARTMENTS, DESIGNATIONS } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

export default function AddEmployeePage() {
  const { employees, setEmployees } = useHR();
  const { toast } = useToast();
  const newId = generateEmployeeId(employees);

  const [form, setForm] = useState({
    name: '', fixedSalary: '', dateOfJoining: '', department: '', designation: '', phone: '', status: 'Active' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fixedSalary || !form.department || !form.designation) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    const emp: Employee = {
      id: newId, name: form.name, fixedSalary: parseFloat(form.fixedSalary),
      dateOfJoining: form.dateOfJoining, department: form.department,
      designation: form.designation, phone: form.phone, status: form.status,
    };
    setEmployees(prev => [...prev, emp]);
    setForm({ name: '', fixedSalary: '', dateOfJoining: '', department: '', designation: '', phone: '', status: 'Active' });
    toast({ title: 'Employee Added', description: `${emp.name} (${emp.id}) added successfully` });
  };

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
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Designation *</label>
              <Select value={form.designation} onValueChange={v => setForm(f => ({ ...f, designation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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
          <Button type="submit" className="w-full h-11 font-semibold">
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </form>
      </div>
    </div>
  );
}
