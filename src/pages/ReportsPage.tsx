import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '@/context/ReportContext';
import { useQuotation } from '@/context/QuotationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Edit, Trash2, Loader2, Plus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportReportPDF } from '@/utils/reportPdfExport';
import { unmarshalDynamoRows } from '@/types/report';
import { TablePagination } from '@/components/TablePagination';

const PAGE_SIZE_DEFAULT = 10;

export default function ReportsPage() {
  const { reports, totalReports, loading, fetchReports, deleteReport } = useReport();
  const { customers } = useQuotation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Debounced fetch whenever filters/page change
  const doFetch = useCallback(() => {
    fetchReports(currentPage, pageSize, {
      search: searchTerm || undefined,
      customerId: customerFilter !== 'all' ? customerFilter : undefined,
      date: dateFilter || undefined,
    });
  }, [currentPage, pageSize, searchTerm, customerFilter, dateFilter, fetchReports]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, customerFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReport(id);
      toast.success('Report deleted successfully');
      // Refresh if current page is now empty
      doFetch();
    } catch (e: any) {
      toast.error('Failed to delete report: ' + e.message);
    }
  };

  const getRowCount = (rows: any) => {
    try {
      if (!rows) return 0;
      if (typeof rows === 'string') return JSON.parse(rows).length;
      if (Array.isArray(rows)) return rows.length;
    } catch (e) {}
    return 0;
  };

  const handleDownload = (report: any) => {
    try {
      let parsedRows = typeof report.rows === 'string' ? JSON.parse(report.rows) : report.rows;
      if (parsedRows && parsedRows.length > 0 && (parsedRows[0].M || parsedRows[0].actualDimn?.N)) {
        parsedRows = unmarshalDynamoRows(parsedRows);
      }
      exportReportPDF({ ...report, rows: parsedRows });
      toast.success(`Downloaded Report: ${report.reportNo}`);
    } catch (e: any) {
      toast.error('Failed to generate PDF: ' + e.message);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">View Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalReports} total reports</p>
        </div>
        <Button onClick={() => navigate('/reports/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Report
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by report number, client, or description..."
                className="pl-9 h-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48 flex gap-2 items-center">
              <Input
                type="date"
                className="h-10 w-full"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                title="Filter by Date"
              />
              {dateFilter && (
                <Button variant="ghost" size="icon" onClick={() => setDateFilter('')} title="Clear Date Filter" className="h-10 w-10 shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50 text-slate-700">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Report No</TableHead>
                  <TableHead className="font-semibold text-xs">Client</TableHead>
                  <TableHead className="font-semibold text-xs">Date</TableHead>
                  <TableHead className="font-semibold text-xs">Description</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Rows</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No reports found. Please create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium text-xs">{report.reportNo}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={report.customerName}>{report.customerName}</TableCell>
                      <TableCell className="text-xs">
                        {report.date ? format(new Date(report.date), 'dd - MM - yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={report.description}>{report.description}</TableCell>
                      <TableCell className="text-xs text-center">{getRowCount(report.rows)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 text-muted-foreground">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-slate-900" onClick={() => navigate(`/reports/${report.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-green-600" onClick={() => handleDownload(report)} title="Download PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" onClick={() => navigate(`/reports/${report.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => handleDelete(report.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalReports}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
