import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotation } from '@/context/QuotationContext';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Users, IndianRupee, TrendingUp } from 'lucide-react';
import { TablePagination } from '@/components/TablePagination';

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function QuotationDashboard() {
  const { quotations, customers } = useQuotation();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const stats = useMemo(() => {
    const total = quotations.length;
    const accepted = quotations.filter(q => q.status === 'Accepted').length;
    const totalValue = quotations.reduce((s, q) => s + q.total, 0);
    const acceptedValue = quotations.filter(q => q.status === 'Accepted').reduce((s, q) => s + q.total, 0);
    return { total, accepted, totalValue, acceptedValue, customerCount: customers.length };
  }, [quotations, customers]);

  const totalPages = Math.max(1, Math.ceil(quotations.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const paged = quotations.slice((activePage - 1) * pageSize, activePage * pageSize);

  const cards = [
    { label: 'Total Quotations', value: stats.total, icon: FileText, color: 'bg-primary' },
    { label: 'Accepted', value: stats.accepted, icon: TrendingUp, color: 'bg-success' },
    { label: 'Total Value', value: fmt(stats.totalValue), icon: IndianRupee, color: 'bg-accent' },
    { label: 'Customers', value: stats.customerCount, icon: Users, color: 'bg-secondary' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Quotation Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of quotations & customers</p>
        </div>
        <Button onClick={() => navigate('/quotations/new')}>
          <Plus className="w-4 h-4 mr-1" /> New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-xl card-shadow border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center text-white`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Quotations</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')}>View all</Button>
        </div>
        {quotations.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No quotations yet. <Button variant="link" className="px-1" onClick={() => navigate('/quotations/new')}>Create your first quotation</Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2">Number</th><th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(q => (
                  <tr key={q.id} className="border-t border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td className="px-4 py-2 font-medium text-primary">{q.quotationNumber}</td>
                    <td className="px-4 py-2">{q.quotationDate}</td>
                    <td className="px-4 py-2">{q.customerName}</td>
                    <td className="px-4 py-2">{q.status}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(q.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              currentPage={activePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={quotations.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </>
        )}
      </div>
    </div>
  );
}