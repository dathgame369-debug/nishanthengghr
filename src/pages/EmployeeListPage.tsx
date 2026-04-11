import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import { Employee, DEPARTMENTS, DESIGNATIONS, formatCurrency } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Pencil, Trash2, Search } from 'lucide-react';

export default function EmployeeListPage() {
  const { employees, setEmployees, payroll, setPayroll } = useHR();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editEmp) return;
    setEmployees(prev => prev.map(e => e.id === editEmp.id ? editEmp : e));
    // Update payroll entries that haven't been finalized
    setPayroll(prev => prev.map(p => p.employeeId === editEmp.id ? { ...p, monthlySalary: editEmp.fixedSalary, employeeName: editEmp.name } : p));
    setEditEmp(null);
    toast({ title: 'Updated', description: `${editEmp.name} updated successfully` });
  };

  const handleDelete = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({ title: 'Deleted', description: 'Employee removed' });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Employee List</h1>
            <p className="text-sm text-muted-foreground">{employees.length} employees</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead>
              <TableHead>Designation</TableHead><TableHead className="text-right">Fixed Salary</TableHead>
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
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="max-w-lg">
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
                    <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium block mb-1">Designation</label>
                  <Select value={editEmp.designation} onValueChange={v => setEditEmp({ ...editEmp, designation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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
              <Button onClick={handleSave} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
