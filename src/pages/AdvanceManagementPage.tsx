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

export default function AdvanceManagementPage() {
  const { employees, advances, totalAdvances, fetchAdvances, setAdvances } = useHR();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editAdv, setEditAdv] = useState<Advance | null>(null);
  const [deleteAdv, setDeleteAdv] = useState<Advance | null>(null);
  const [addAmount, setAddAmount] = useState<string>('');
  const [addDate, setAddDate] = useState<string>('');
  const [ledgerDateFrom, setLedgerDateFrom] = useState<string>('');
  const [ledgerDateTo, setLedgerDateTo] = useState<string>('');
  const [ledgerYear, setLedgerYear] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // NOTE: We intentionally do NOT recompute advance balances from payroll records here.
  // The `remainingBalance` and `totalDeducted` fields on each advance record are kept
  // up-to-date by updateAdvanceInDB() in PayrollPage whenever a payslip is saved or deleted.
  // Reading them directly is the single source of truth and handles multiple-advance-per-
  // employee scenarios correctly.
  const [form, setForm] = useState({
    employeeId: '', advanceDate: '', advanceAmount: '', deductionType: 'Manual' as 'Manual' | 'EMI',
    notes: '',
  });

  const [filters, setFilters] = useState({ search: '', year: 'All', dateFrom: '', dateTo: '' });
  const totalPages = Math.max(1, Math.ceil(totalAdvances / pageSize));

  const doFetch = useCallback(() => {
    fetchAdvances(page, pageSize, filters);
  }, [page, pageSize, filters, fetchAdvances]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const handleAdd = async () => {
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp || !form.advanceAmount) {
      toast({ title: 'Error', description: 'Select employee and enter amount', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(form.advanceAmount);
    const advRow = {
      id: `ADV${Date.now()}`,
      employee_id: emp.id,
      employee_name: emp.name,
      advance_date: form.advanceDate,
      advance_amount: amt,
      deduction_type: form.deductionType,
      total_deducted: 0,
      remaining_balance: amt,
      notes: form.notes,
      status: 'Active',
      deduction_history: [],
    };

    // Await the insert directly so the row exists in DB before we refresh the list.
    // Using setAdvances (makeSetter) fires the upsert asynchronously — doFetch() would
    // then run before the insert finished and wipe out the new record from the UI.
    const { error } = await supabase.from('advances').insert(advRow);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setShowAdd(false);
    setForm({ employeeId: '', advanceDate: '', advanceAmount: '', deductionType: 'Manual', notes: '' });
    toast({ title: 'Advance Added', description: `₹${amt.toLocaleString()} advance for ${emp.name}` });
    doFetch();
  };

  const handleEdit = async () => {
    if (!editAdv) return;
    const extra = parseFloat(addAmount) || 0;
    
    let newHistory = [...(editAdv.deductionHistory || [])];
    if (extra > 0 && addDate) {
      newHistory.push({ date: addDate, amount: extra, isAddition: true });
    } else if (extra > 0 && !addDate) {
      toast({ title: 'Error', description: 'Please select a date for the new advance amount', variant: 'destructive' });
      return;
    }

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
        deduction_history: newHistory,
      })
      .eq('id', editAdv.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setEditAdv(null);
    setAddAmount('');
    setAddDate('');
    const desc = extra > 0
      ? `Advance for ${editAdv.employeeName}: ₹${extra.toLocaleString()} added (new total ₹${newAdvanceAmount.toLocaleString()})`
      : `Advance for ${editAdv.employeeName} details updated`;
    toast({ title: 'Updated', description: extra > 0 ? `₹${extra.toLocaleString()} added to advance` : 'Advance details saved' });
    doFetch();
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

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Search Employee</label>
          <Input placeholder="Search..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
          <Select value={filters.year} onValueChange={v => { setFilters(f => ({ ...f, year: v })); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Years</SelectItem>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Date From</label>
          <Input type="date" value={filters.dateFrom} onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Date To</label>
          <Input type="date" value={filters.dateTo} onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }} />
        </div>
      </div>
      
      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden mb-6">
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
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(adv.totalDeducted)}</TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">{formatCurrency(adv.remainingBalance)}</TableCell>
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

      {/* Edit Dialog (Ledger) */}
      <Dialog open={!!editAdv} onOpenChange={() => { setEditAdv(null); setAddAmount(''); setAddDate(''); setLedgerDateFrom(''); setLedgerDateTo(''); setLedgerYear('All'); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Advance Ledger</DialogTitle></DialogHeader>
          {editAdv && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{editAdv.employeeId} - {editAdv.employeeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(editAdv.remainingBalance)}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1">Filter Year</label>
                  <Select value={ledgerYear} onValueChange={setLedgerYear}>
                    <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1">Filter Date From</label>
                  <Input type="date" value={ledgerDateFrom} onChange={e => setLedgerDateFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1">Filter Date To</label>
                  <Input type="date" value={ledgerDateTo} onChange={e => setLedgerDateTo(e.target.value)} />
                </div>
              </div>

              {/* Ledger Table */}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date / Month</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right text-success">Added</TableHead>
                      <TableHead className="text-right text-destructive">Deducted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Initial Advance */}
                    {(!ledgerDateFrom || (editAdv.advanceDate && editAdv.advanceDate >= ledgerDateFrom)) &&
                     (!ledgerDateTo || (editAdv.advanceDate && editAdv.advanceDate <= ledgerDateTo)) && 
                     (ledgerYear === 'All' || (editAdv.advanceDate && editAdv.advanceDate.startsWith(ledgerYear))) && (
                    <TableRow>
                      <TableCell>{editAdv.advanceDate ? editAdv.advanceDate.split('-').reverse().join('/') : '—'}</TableCell>
                      <TableCell><Badge variant="outline">Initial Advance</Badge></TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {/* The initial amount is advanceAmount minus all additions */}
                        {formatCurrency(editAdv.advanceAmount - (editAdv.deductionHistory || []).filter(h => h.isAddition).reduce((sum, h) => sum + h.amount, 0))}
                      </TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                    )}
                    {/* History */}
                    {(editAdv.deductionHistory || []).filter(entry => {
                      let dateStr = entry.isAddition ? entry.date : undefined;
                      if (!entry.isAddition && entry.month) {
                        try {
                          dateStr = new Date(entry.month + ' 1').toISOString().split('T')[0];
                        } catch (e) {
                          // ignore parsing errors
                        }
                      }
                      if (!dateStr) return true;
                      
                      if (ledgerYear !== 'All' && !dateStr.startsWith(ledgerYear)) return false;
                      if (ledgerDateFrom && dateStr < ledgerDateFrom) return false;
                      if (ledgerDateTo && dateStr > ledgerDateTo) return false;
                      return true;
                    }).map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {(() => {
                            if (entry.isAddition) {
                              return entry.date ? entry.date.split('-').reverse().join('/') : '—';
                            }
                            if (entry.month) {
                              try {
                                const d = new Date(entry.month + ' 1');
                                if (!isNaN(d.getTime())) {
                                  // Default payroll deduction display to 1st of the month
                                  const day = String(d.getDate()).padStart(2, '0');
                                  const month = String(d.getMonth() + 1).padStart(2, '0');
                                  const year = d.getFullYear();
                                  return `${day}/${month}/${year}`;
                                }
                              } catch (e) {}
                              return entry.month;
                            }
                            return '—';
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.isAddition ? "default" : "secondary"}>
                            {entry.isAddition ? 'Additional Advance' : 'Payroll Deduction'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          {entry.isAddition ? formatCurrency(entry.amount) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {!entry.isAddition ? formatCurrency(entry.amount) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/20 font-bold">
                      <TableCell colSpan={2} className="text-right">Totals</TableCell>
                      <TableCell className="text-right font-mono text-success">{formatCurrency(editAdv.advanceAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{formatCurrency(editAdv.totalDeducted)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Add Amount Form */}
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                <h3 className="text-sm font-medium">Record Additional Advance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium block mb-1">Date</label>
                    <Input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Amount (₹)</label>
                    <Input type="number" min="0" placeholder="Enter amount" value={addAmount} onChange={e => setAddAmount(e.target.value)} />
                  </div>
                </div>
                {(() => {
                  const extra = parseFloat(addAmount) || 0;
                  const newBalance = editAdv.remainingBalance + extra;
                  return extra > 0 ? (
                    <p className="text-xs">
                      <span className="text-muted-foreground">New Balance will be: </span>
                      <span className="text-primary font-semibold">{formatCurrency(newBalance)}</span>
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1">Status</label>
                  <Select value={editAdv.status} onValueChange={v => setEditAdv({ ...editAdv, status: v as 'Active' | 'Closed' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1">Notes</label>
                  <Input value={editAdv.notes} onChange={e => setEditAdv({ ...editAdv, notes: e.target.value })} />
                </div>
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
