import { useState, useEffect, useCallback } from 'react';
import { useHR } from '@/context/HRContext';
import { Advance } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Pencil, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import { formatCurrency } from '@/types/hr';
import { TablePagination } from '@/components/TablePagination';
import { supabase } from '@/integrations/supabase/client';

export default function AdvanceManagementPage() {
  const { employees, advances, totalAdvances, fetchAdvances, setAdvances } = useHR();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editAdv, setEditAdv] = useState<Advance | null>(null);
  const [deleteAdv, setDeleteAdv] = useState<Advance | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Live totals computed from actual payroll records (keyed by employeeId)
  const [payrollTotals, setPayrollTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from('payroll')
      .select('employee_id,advance_deduction')
      .then(({ data }) => {
        if (!data) return;
        const totals: Record<string, number> = {};
        data.forEach((r: any) => {
          const empId = r.employee_id as string;
          totals[empId] = (totals[empId] || 0) + Number(r.advance_deduction || 0);
        });
        setPayrollTotals(totals);
      });
  }, [advances]); // re-run whenever advances list refreshes
  const [form, setForm] = useState({
    employeeId: '', advanceDate: '', advanceAmount: '', deductionType: 'Manual' as 'Manual' | 'EMI',
    notes: '',
  });

  const totalPages = Math.max(1, Math.ceil(totalAdvances / pageSize));

  const doFetch = useCallback(() => {
    fetchAdvances(page, pageSize);
  }, [page, pageSize, fetchAdvances]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const handleAdd = () => {
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp || !form.advanceAmount) {
      toast({ title: 'Error', description: 'Select employee and enter amount', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(form.advanceAmount);
    const adv: Advance = {
      id: `ADV${Date.now()}`, employeeId: emp.id, employeeName: emp.name,
      advanceDate: form.advanceDate, advanceAmount: amt,
      deductionType: form.deductionType, monthlyDeductionAmount: 0,
      totalDeducted: 0, remainingBalance: amt, notes: form.notes, status: 'Active', deductionHistory: [],
    };
    setAdvances(prev => [...prev, adv]);
    setShowAdd(false);
    setForm({ employeeId: '', advanceDate: '', advanceAmount: '', deductionType: 'Manual', notes: '' });
    toast({ title: 'Advance Added', description: `₹${amt.toLocaleString()} advance for ${emp.name}` });
    doFetch();
  };

  const handleEdit = () => {
    if (!editAdv) return;
    const updated: Advance = {
      ...editAdv,
      remainingBalance: Math.max(0, editAdv.advanceAmount - editAdv.totalDeducted),
    };
    if (updated.remainingBalance <= 0 && updated.totalDeducted > 0) {
      updated.status = 'Closed';
    }
    setAdvances(prev => prev.map(a => a.id === editAdv.id ? updated : a));
    setEditAdv(null);
    toast({ title: 'Updated' });
    doFetch();
  };

  const handleApplyAdjust = () => {
    if (!editAdv) return;
    const delta = parseFloat(adjustAmount) || 0;
    if (delta <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive value', variant: 'destructive' });
      return;
    }
    let newAmount = editAdv.advanceAmount;
    if (adjustMode === 'add') {
      newAmount = editAdv.advanceAmount + delta;
    } else {
      newAmount = Math.max(editAdv.totalDeducted, editAdv.advanceAmount - delta);
    }
    setEditAdv({ ...editAdv, advanceAmount: newAmount, remainingBalance: Math.max(0, newAmount - editAdv.totalDeducted) });
    setAdjustAmount('');
    setShowAdjust(false);
    toast({ title: `Amount ${adjustMode === 'add' ? 'increased' : 'decreased'}`, description: `New advance amount: ${formatCurrency(newAmount)}` });
  };

  const handleDelete = () => {
    if (!deleteAdv) return;
    setAdvances(prev => prev.filter(a => a.id !== deleteAdv.id));
    toast({ title: 'Deleted', description: `Advance for ${deleteAdv.employeeName} removed` });
    setDeleteAdv(null);
    doFetch();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Advance / Loan Management</h1>
            <p className="text-sm text-muted-foreground">Manage employee salary advances</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Add Advance</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Type</TableHead>
              <TableHead className="text-right">Total Ded.</TableHead>
              <TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.map(adv => (
              <TableRow key={adv.id}>
                <TableCell className="font-medium text-primary">{adv.employeeId}</TableCell>
                <TableCell>{adv.employeeName}</TableCell>
                <TableCell>{adv.advanceDate ? adv.advanceDate.split('-').reverse().join('-') : '—'}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(adv.advanceAmount)}</TableCell>
                <TableCell><Badge variant="outline">{adv.deductionType}</Badge></TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(payrollTotals[adv.employeeId] ?? adv.totalDeducted)}</TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">{formatCurrency(Math.max(0, adv.advanceAmount - (payrollTotals[adv.employeeId] ?? adv.totalDeducted)))}</TableCell>
                <TableCell>
                  <Badge className={adv.status === 'Active' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                    {adv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditAdv({ ...adv })}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteAdv(adv)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {advances.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No advances recorded</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalAdvances}
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Advance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Employee</label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.filter(e => e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.id} - {e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Advance Date</label><Input type="date" value={form.advanceDate} onChange={e => setForm(f => ({ ...f, advanceDate: e.target.value }))} /></div>
            <div><label className="text-sm font-medium block mb-1">Advance Amount (₹)</label><Input type="number" min="0" value={form.advanceAmount} onChange={e => setForm(f => ({ ...f, advanceAmount: e.target.value }))} /></div>
            <div><label className="text-sm font-medium block mb-1">Deduction Type</label>
              <Select value={form.deductionType} onValueChange={v => setForm(f => ({ ...f, deductionType: v as 'Manual' | 'EMI' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Manual">Manual</SelectItem><SelectItem value="EMI">EMI / Monthly</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Notes</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for advance" /></div>
            <Button onClick={handleAdd} className="w-full">Add Advance</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAdv} onOpenChange={() => { setEditAdv(null); setShowAdjust(false); setAdjustAmount(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Advance</DialogTitle></DialogHeader>
          {editAdv && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Employee</label><Input value={`${editAdv.employeeId} - ${editAdv.employeeName}`} disabled className="bg-muted" /></div>
              <div>
                <label className="text-sm font-medium block mb-1">Advance Amount (₹)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={editAdv.totalDeducted}
                    value={editAdv.advanceAmount}
                    onChange={e => {
                      const amt = parseFloat(e.target.value) || 0;
                      setEditAdv({ ...editAdv, advanceAmount: amt, remainingBalance: Math.max(0, amt - editAdv.totalDeducted) });
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                    onClick={() => { setAdjustAmount(''); setShowAdjust(true); }}
                    title="Adjust advance amount"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Already deducted: {formatCurrency(editAdv.totalDeducted)} • Remaining: {formatCurrency(Math.max(0, editAdv.advanceAmount - editAdv.totalDeducted))}
                </p>

                {/* Adjust Amount Sub-Popup */}
                {showAdjust && (
                  <div className="mt-3 border border-border rounded-xl bg-muted/30 p-4 space-y-3 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">Adjust Advance Amount</p>

                    {/* Toggle Add / Subtract */}
                    <div className="flex rounded-lg overflow-hidden border border-border">
                      <button
                        type="button"
                        onClick={() => setAdjustMode('add')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                          adjustMode === 'add'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" /> Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMode('subtract')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                          adjustMode === 'subtract'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4" /> Subtract
                      </button>
                    </div>

                    {/* Amount Input */}
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter amount"
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      className="bg-background"
                      autoFocus
                    />

                    {/* Live preview */}
                    {adjustAmount && parseFloat(adjustAmount) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        New amount will be:{' '}
                        <span className={`font-semibold ${ adjustMode === 'add' ? 'text-primary' : 'text-destructive' }`}>
                          {formatCurrency(
                            adjustMode === 'add'
                              ? editAdv.advanceAmount + (parseFloat(adjustAmount) || 0)
                              : Math.max(editAdv.totalDeducted, editAdv.advanceAmount - (parseFloat(adjustAmount) || 0))
                          )}
                        </span>
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={handleApplyAdjust}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setShowAdjust(false); setAdjustAmount(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div><label className="text-sm font-medium block mb-1">Notes</label><Input value={editAdv.notes} onChange={e => setEditAdv({ ...editAdv, notes: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Status</label>
                <Select value={editAdv.status} onValueChange={v => setEditAdv({ ...editAdv, status: v as 'Active' | 'Closed' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleEdit} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteAdv} onOpenChange={() => setDeleteAdv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAdv && `This will permanently delete the ${formatCurrency(deleteAdv.advanceAmount)} advance for ${deleteAdv.employeeName}. This action cannot be undone.`}
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
