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
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/types/hr';
import { TablePagination } from '@/components/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/context/ActivityLogContext';

export default function AdvanceManagementPage() {
  const { employees, advances, totalAdvances, fetchAdvances, setAdvances } = useHR();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [showAdd, setShowAdd] = useState(false);
  const [editAdv, setEditAdv] = useState<Advance | null>(null);
  const [deleteAdv, setDeleteAdv] = useState<Advance | null>(null);
  const [addAmount, setAddAmount] = useState<string>('');
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
    logActivity('Created', 'Advances', `Advance of ₹${amt.toLocaleString()} added for ${emp.name} (${emp.id})`);
    toast({ title: 'Advance Added', description: `₹${amt.toLocaleString()} advance for ${emp.name}` });
    doFetch();
  };

  const handleEdit = async () => {
    if (!editAdv) return;
    const extra = parseFloat(addAmount) || 0;
    const newAdvanceAmount = editAdv.advanceAmount + extra;
    const newBalance = Math.max(0, newAdvanceAmount - editAdv.totalDeducted);
    const newStatus = (newBalance <= 0 && editAdv.totalDeducted > 0) ? 'Closed' : editAdv.status;

    // Directly await the Supabase update so doFetch reads the updated row
    const { error } = await supabase
      .from('advances')
      .update({
        advance_amount: newAdvanceAmount,
        remaining_balance: newBalance,
        notes: editAdv.notes,
        status: newStatus,
      })
      .eq('id', editAdv.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setEditAdv(null);
    setAddAmount('');
    const desc = extra > 0
      ? `Advance for ${editAdv.employeeName}: ₹${extra.toLocaleString()} added (new total ₹${newAdvanceAmount.toLocaleString()})`
      : `Advance for ${editAdv.employeeName} details updated`;
    logActivity('Updated', 'Advances', desc);
    toast({ title: 'Updated', description: extra > 0 ? `₹${extra.toLocaleString()} added to advance` : 'Advance details saved' });
    doFetch();
  };

  const handleDelete = () => {
    if (!deleteAdv) return;
    setAdvances(prev => prev.filter(a => a.id !== deleteAdv.id));
    logActivity('Deleted', 'Advances', `Advance for ${deleteAdv.employeeName} (₹${deleteAdv.advanceAmount.toLocaleString()}) deleted`);
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
      <Dialog open={!!editAdv} onOpenChange={() => { setEditAdv(null); setAddAmount(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Advance</DialogTitle></DialogHeader>
          {editAdv && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Employee</label><Input value={`${editAdv.employeeId} - ${editAdv.employeeName}`} disabled className="bg-muted" /></div>
              <div>
                <label className="text-sm font-medium block mb-1">Advance Amount (₹)</label>
                <Input
                  type="number"
                  min={editAdv.totalDeducted}
                  value={editAdv.advanceAmount}
                  onChange={e => {
                    const amt = parseFloat(e.target.value) || 0;
                    setEditAdv({ ...editAdv, advanceAmount: amt, remainingBalance: Math.max(0, amt - editAdv.totalDeducted) });
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Already deducted: {formatCurrency(editAdv.totalDeducted)} • Remaining: {formatCurrency(Math.max(0, editAdv.advanceAmount - editAdv.totalDeducted))}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Add Amount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter amount to add"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                />
                {(() => {
                  const extra = parseFloat(addAmount) || 0;
                  const currentBalance = Math.max(0, editAdv.advanceAmount - editAdv.totalDeducted);
                  const newBalance = currentBalance + extra;
                  return extra > 0 ? (
                    <p className="text-xs mt-1">
                      <span className="text-muted-foreground">Current balance: {formatCurrency(currentBalance)}</span>
                      {' '}→{' '}
                      <span className="text-green-600 font-semibold">New balance: {formatCurrency(newBalance)}</span>
                    </p>
                  ) : null;
                })()}
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
