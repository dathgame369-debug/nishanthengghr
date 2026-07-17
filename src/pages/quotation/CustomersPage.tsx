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
import { TablePagination } from '@/components/TablePagination';

const empty: Customer = {
  id: '', name: '', address: '', gstNumber: '', contactPerson: '', phone: '', email: '',
  status: 'Active', numberPrefix: '', state: '', district: '', pincode: '',
};

export default function CustomersPage() {
  const { customers, saveCustomer, deleteCustomer } = useQuotation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [edit, setEdit] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer>(empty);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.gstNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const paged = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  const openAdd = () => {
    setEdit(null);
    const maxNum = customers.reduce((m, c) => {
      const n = parseInt((c.id || '').replace(/^CUST/i, ''), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    setForm({ ...empty, id: `CUST${String(maxNum + 1).padStart(4, '0')}` });
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
    const cust = customers.find(c => c.id === id);
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
          <h1 className="text-2xl font-bold font-heading text-foreground">Clients Master</h1>
          <p className="text-sm text-muted-foreground">Manage clients for quotations and reports</p>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or GST..." className="pl-9" />
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Client</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead><TableHead>Prefix</TableHead>
              <TableHead>GST</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead>
              <TableHead>State</TableHead><TableHead>District</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.numberPrefix || '—'}</TableCell>
                <TableCell>{c.gstNumber || '—'}</TableCell>
                <TableCell>{c.contactPerson || '—'}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell>{c.state || '—'}</TableCell>
                <TableCell>{c.district || '—'}</TableCell>
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
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                No customers found. Click <strong>Add Customer</strong> to create one.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={activePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Client Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ABC Pvt Ltd" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Address</label>
              <Textarea rows={3} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">State</label>
                <Input value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. Tamil Nadu" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">District</label>
                <Input value={form.district || ''} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Coimbatore" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Pincode</label>
                <Input value={form.pincode || ''} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="e.g. 641001" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Quotation Number Prefix</label>
              <Input value={form.numberPrefix}
                onChange={e => setForm(f => ({ ...f, numberPrefix: e.target.value }))}
                placeholder="e.g. VS/NEW" />
              <p className="text-xs text-muted-foreground mt-1">Used when generating quotation numbers for this customer.</p>
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
            <Button onClick={save} className="w-full">{edit ? 'Update' : 'Add'} Client</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
