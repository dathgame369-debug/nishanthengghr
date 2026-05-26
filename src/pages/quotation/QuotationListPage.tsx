import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotation } from '@/context/QuotationContext';
import { QUOTATION_STATUSES } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Pencil, Trash2, Download, Search } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdf';

const PAGE_SIZE = 10;

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
  const { quotations, items, deleteQuotation } = useQuotation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const matchSearch = !search ||
        q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
        q.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === 'All' || q.status === status;
      return matchSearch && matchStatus;
    });
  }, [quotations, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDownload = (id: string) => {
    const q = quotations.find(x => x.id === id);
    if (!q) return;
    const its = items.filter(i => i.quotationId === id).sort((a, b) => a.slNo - b.slNo);
    generateQuotationPDF(q, its);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    try {
      await deleteQuotation(id);
      toast({ title: 'Deleted', description: 'Quotation removed' });
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
            <p className="text-sm text-muted-foreground">Browse and manage quotations</p>
          </div>
        </div>
        <Button onClick={() => navigate('/quotations/new')}><Plus className="w-4 h-4 mr-1" /> New Quotation</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search number or customer..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {QUOTATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Number</TableHead><TableHead>Date</TableHead>
              <TableHead>Customer</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(q => (
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
            ))}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No quotations match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages} ({filtered.length} total)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}