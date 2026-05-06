import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import { Department, Role } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Pencil, Trash2, Search, Building2, Briefcase, HandCoins } from 'lucide-react';

export default function SettingsPage() {
  const { departments, setDepartments, roles, setRoles } = useHR();
  const { toast } = useToast();

  // Department state
  const [deptSearch, setDeptSearch] = useState('');
  const [deptDialog, setDeptDialog] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', status: 'Active' as 'Active' | 'Inactive' });

  // Role state
  const [roleSearch, setRoleSearch] = useState('');
  const [roleDialog, setRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '', department: '', status: 'Active' as 'Active' | 'Inactive',
    welfareEnabled: false, welfareRate: 0, welfareBasisHours: 4,
  });

  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()));
  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));
  const activeDepts = departments.filter(d => d.status === 'Active');

  // Department handlers
  const openAddDept = () => { setEditDept(null); setDeptForm({ name: '', status: 'Active' }); setDeptDialog(true); };
  const openEditDept = (d: Department) => { setEditDept(d); setDeptForm({ name: d.name, status: d.status }); setDeptDialog(true); };
  const saveDept = () => {
    if (!deptForm.name.trim()) { toast({ title: 'Error', description: 'Department name required', variant: 'destructive' }); return; }
    const duplicate = departments.find(d => d.name.toLowerCase() === deptForm.name.trim().toLowerCase() && d.id !== editDept?.id);
    if (duplicate) { toast({ title: 'Error', description: 'Department already exists', variant: 'destructive' }); return; }
    if (editDept) {
      setDepartments(prev => prev.map(d => d.id === editDept.id ? { ...d, name: deptForm.name.trim(), status: deptForm.status } : d));
      toast({ title: 'Updated', description: `Department "${deptForm.name}" updated` });
    } else {
      const id = `DEPT${String(departments.length + 1).padStart(3, '0')}`;
      setDepartments(prev => [...prev, { id, name: deptForm.name.trim(), status: deptForm.status }]);
      toast({ title: 'Added', description: `Department "${deptForm.name}" added` });
    }
    setDeptDialog(false);
  };
  const deleteDept = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    toast({ title: 'Deleted', description: 'Department removed' });
  };

  // Role handlers
  const openAddRole = () => {
    setEditRole(null);
    setRoleForm({ name: '', department: '', status: 'Active', welfareEnabled: false, welfareRate: 0, welfareBasisHours: 4 });
    setRoleDialog(true);
  };
  const openEditRole = (r: Role) => {
    setEditRole(r);
    setRoleForm({
      name: r.name, department: r.department, status: r.status,
      welfareEnabled: !!r.welfareEnabled,
      welfareRate: r.welfareRate ?? 0,
      welfareBasisHours: r.welfareBasisHours ?? 4,
    });
    setRoleDialog(true);
  };
  const saveRole = () => {
    if (!roleForm.name.trim()) { toast({ title: 'Error', description: 'Role name required', variant: 'destructive' }); return; }
    const duplicate = roles.find(r => r.name.toLowerCase() === roleForm.name.trim().toLowerCase() && r.id !== editRole?.id);
    if (duplicate) { toast({ title: 'Error', description: 'Role already exists', variant: 'destructive' }); return; }
    if (editRole) {
      setRoles(prev => prev.map(r => r.id === editRole.id ? {
        ...r,
        name: roleForm.name.trim(),
        department: roleForm.department,
        status: roleForm.status,
        welfareEnabled: roleForm.welfareEnabled,
        welfareRate: roleForm.welfareEnabled ? Number(roleForm.welfareRate) || 0 : 0,
        welfareBasisHours: roleForm.welfareEnabled ? (Number(roleForm.welfareBasisHours) || 1) : 4,
      } : r));
      toast({ title: 'Updated', description: `Role "${roleForm.name}" updated` });
    } else {
      const id = `ROLE${String(roles.length + 1).padStart(3, '0')}`;
      setRoles(prev => [...prev, {
        id,
        name: roleForm.name.trim(),
        department: roleForm.department,
        status: roleForm.status,
        welfareEnabled: roleForm.welfareEnabled,
        welfareRate: roleForm.welfareEnabled ? Number(roleForm.welfareRate) || 0 : 0,
        welfareBasisHours: roleForm.welfareEnabled ? (Number(roleForm.welfareBasisHours) || 1) : 4,
      }]);
      toast({ title: 'Added', description: `Role "${roleForm.name}" added` });
    }
    setRoleDialog(false);
  };
  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Deleted', description: 'Role removed' });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage departments, roles & designations</p>
        </div>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="departments" className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Departments</TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Roles / Designations</TabsTrigger>
        </TabsList>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments">
          <div className="bg-card rounded-xl card-shadow border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Search departments..." className="pl-9" />
              </div>
              <Button size="sm" onClick={openAddDept}><Plus className="w-4 h-4 mr-1" /> Add Department</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>ID</TableHead><TableHead>Department Name</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-primary text-sm">{d.id}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'Active' ? 'default' : 'secondary'}
                        className={d.status === 'Active' ? 'bg-success text-success-foreground' : ''}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDept(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDept(d.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDepts.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No departments found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles">
          <div className="bg-card rounded-xl card-shadow border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="Search roles..." className="pl-9" />
              </div>
              <Button size="sm" onClick={openAddRole}><Plus className="w-4 h-4 mr-1" /> Add Role</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>ID</TableHead><TableHead>Role Name</TableHead><TableHead>Department</TableHead><TableHead>Welfare</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-primary text-sm">{r.id}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.department || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {r.welfareEnabled ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <HandCoins className="w-3.5 h-3.5 text-primary" />
                          ₹{r.welfareRate} / {r.welfareBasisHours} hrs
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'Active' ? 'default' : 'secondary'}
                        className={r.status === 'Active' ? 'bg-success text-success-foreground' : ''}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditRole(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRole(r.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRoles.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No roles found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Department Name *</label>
              <Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter department name" />
            </div>
            <div><label className="text-sm font-medium block mb-1">Status</label>
              <Select value={deptForm.status} onValueChange={v => setDeptForm(f => ({ ...f, status: v as 'Active' | 'Inactive' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={saveDept} className="w-full">{editDept ? 'Update' : 'Add'} Department</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editRole ? 'Edit Role' : 'Add Role'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Role Name *</label>
              <Input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter role name" />
            </div>
            <div><label className="text-sm font-medium block mb-1">Department (optional)</label>
              <Select value={roleForm.department || '__none__'} onValueChange={v => setRoleForm(f => ({ ...f, department: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {activeDepts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Status</label>
              <Select value={roleForm.status} onValueChange={v => setRoleForm(f => ({ ...f, status: v as 'Active' | 'Inactive' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium block">Enable Welfare</label>
                  <p className="text-xs text-muted-foreground">Auto-calculate welfare from OT hours for this role</p>
                </div>
                <Switch
                  checked={roleForm.welfareEnabled}
                  onCheckedChange={v => setRoleForm(f => ({ ...f, welfareEnabled: v }))}
                />
              </div>
              {roleForm.welfareEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">Welfare Rate (₹)</label>
                    <Input type="number" min={0} value={roleForm.welfareRate}
                      onChange={e => setRoleForm(f => ({ ...f, welfareRate: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Basis Hours</label>
                    <Input type="number" min={1} value={roleForm.welfareBasisHours}
                      onChange={e => setRoleForm(f => ({ ...f, welfareBasisHours: parseFloat(e.target.value) || 1 }))} />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Welfare = (OT Hours / Basis Hours) × Rate. Example: ₹{roleForm.welfareRate || 0} for every {roleForm.welfareBasisHours || 0} OT hours.
                  </p>
                </div>
              )}
            </div>
            <Button onClick={saveRole} className="w-full">{editRole ? 'Update' : 'Add'} Role</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
