import { useState } from 'react';
import { useQuotation } from '@/context/QuotationContext';
import { Customer } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';

const empty: Customer = {
  id: '', name: '', address: '', gstNumber: '', contactPerson: '', phone: '', email: '', status: 'Active',
};

export default function CustomersPage() {
  const { customers, saveCustomer, deleteCustomer } = useQuotation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [edit, setEdit] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer>(empty);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.gstNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEdit(null);
    setForm({ ...empty, id: `CUST${String(customers.length + 1).padStart(4, '0')}` });
    setDialog(true);
  };
  const openEdit = (c: Customer) => { setEdit(c); setForm(c); setDialog(true); };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }
    try {
      await saveCustomer(form);
      toast({ title: edit ? 'Updated' : 'Added', description: `${form.name} saved` });
      setDialog(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteCustomer(id);
      toast({ title: 'Deleted', description: 'Customer removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage clients for quotations</p>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or GST..." className="pl-9" />
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Customer</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>GST</TableHead>
              <TableHead>Contact</TableHead><TableHead>Phone</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-primary text-sm">{c.id}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.gstNumber || '—'}</TableCell>
                <TableCell>{c.contactPerson || '—'}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}
                    className={c.status === 'Active' ? 'bg-success text-success-foreground' : ''}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No customers found. Click <strong>Add Customer</strong> to create one.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Customer Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="M/s. ABC Pvt Ltd" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Address</label>
              <Textarea rows={3} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">GST Number</label>
                <Input value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Contact Person</label>
                <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Phone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full">{edit ? 'Update' : 'Add'} Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}