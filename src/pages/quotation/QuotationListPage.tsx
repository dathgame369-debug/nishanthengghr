import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotation } from '@/context/QuotationContext';
import { QUOTATION_STATUSES } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Pencil, Trash2, Download, Search, Loader2 } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdf';
import { TablePagination } from '@/components/TablePagination';

const statusColor = (s: string) => {
  switch (s) {
    case 'Accepted': return 'bg-success text-success-foreground';
    case 'Sent': return 'bg-primary text-primary-foreground';
    case 'Rejected': return 'bg-destructive text-destructive-foreground';
    case 'Expired': return 'bg-muted text-muted-foreground';
    default: return '';
  }
};

export default function QuotationListPage() {
  const { quotations, totalQuotations, items, customers, loading, fetchQuotations, fetchItemsByQuotationId, deleteQuotation } = useQuotation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(totalQuotations / pageSize));

  const doFetch = useCallback(() => {
    fetchQuotations(page, pageSize, {
      search: search || undefined,
      status: status !== 'All' ? status : undefined,
      customerId: customerFilter !== 'All' ? customerFilter : undefined,
      dateFilter: dateFilter || undefined,
    });
  }, [page, pageSize, search, status, customerFilter, dateFilter, fetchQuotations]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, customerFilter, dateFilter]);

  const handleDownload = async (id: string) => {
    const q = quotations.find(x => x.id === id);
    if (!q) return;
    // First try items already loaded for this page
    let its = items.filter(i => i.quotationId === id).sort((a, b) => a.slNo - b.slNo);
    // If not in current items cache, fetch directly
    if (its.length === 0) {
      try {
        its = await fetchItemsByQuotationId(id);
      } catch (e) {
        its = [];
      }
    }
    generateQuotationPDF(q, its);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    try {
      await deleteQuotation(id);
      toast({ title: 'Deleted', description: 'Quotation removed' });
      doFetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Quotations</h1>
            <p className="text-sm text-muted-foreground">{totalQuotations} total quotations</p>
          </div>
        </div>
        <Button onClick={() => navigate('/quotations/new')}><Plus className="w-4 h-4 mr-1" /> New Quotation</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search number or client..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={v => setStatus(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {QUOTATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={v => setCustomerFilter(v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Clients</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-40"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title="Filter by Date"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Number</TableHead><TableHead>Date</TableHead>
              <TableHead>Client</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No quotations match your filters.
                </TableCell>
              </TableRow>
            ) : (
              quotations.map(q => (
                <TableRow key={q.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-primary">{q.quotationNumber}</TableCell>
                  <TableCell>{q.quotationDate}</TableCell>
                  <TableCell>{q.customerName}</TableCell>
                  <TableCell><Badge className={statusColor(q.status)}>{q.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(q.id)} title="Download PDF">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/quotations/${q.id}`)} title="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} title="Delete" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalQuotations}
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
        />
      </div>
    </div>
  );
}
