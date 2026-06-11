import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuotation } from '@/context/QuotationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileSpreadsheet, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { exportReportPDF } from '@/utils/reportPdfExport';
import { exportReportExcel } from '@/utils/reportExcelExport';
import { unmarshalDynamoRows } from '@/types/report';
import { buildQuotationNumber, getFinancialYear } from '@/types/quotation';

function splitQuotationNumber(s: string, fallbackPrefix: string) {
  const parts = (s || "").split("/");
  if (parts.length >= 3) {
    const fy = parts[parts.length - 1];
    const seq = parts[parts.length - 2];
    const prefix = parts.slice(0, parts.length - 2).join("/");
    return { prefix: prefix || fallbackPrefix, seq, fy };
  }
  return { prefix: fallbackPrefix, seq: "", fy: getFinancialYear() };
}

export default function CreateReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customers, settings } = useQuotation();
  const isEditing = id && id !== 'new';

  const [unitMode, setUnitMode] = useState<'MM' | 'IN'>('MM');

  // Report Details
  const [reportNo, setReportNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [drgNo, setDrgNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailsOfPattern, setDetailsOfPattern] = useState('');

  // Report Data Rows
  const [rows, setRows] = useState<any[]>([{ id: Date.now().toString(), srNo: 1 }]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Fetch specific report by ID directly from DB when editing
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data, error } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        toast.error('Report not found');
        navigate('/reports');
        return;
      }
      setReportNo(data.report_no || '');
      setCustomerId(data.customer_id || '');
      setDescription(data.description || '');
      setDrgNo(data.drawing_no || '');
      if (data.date) setDate(new Date(data.date).toISOString().split('T')[0]);
      setDetailsOfPattern(data.details_of_pattern || '');
      setUnitMode((data.unit_mode as 'MM' | 'IN') || 'MM');
      try {
        let parsedRows = typeof data.rows === 'string' ? JSON.parse(data.rows) : data.rows;
        if (parsedRows && parsedRows.length > 0 && (parsedRows[0].M || parsedRows[0].actualDimn?.N)) {
          parsedRows = unmarshalDynamoRows(parsedRows);
        }
        if (parsedRows && parsedRows.length > 0) setRows(parsedRows);
      } catch (e) {
        console.error('Failed to parse existing rows', e);
      }
    })();
  }, [id, isEditing]);


  const addRow = () => {
    const newRows = [...rows, { id: Date.now().toString(), srNo: rows.length + 1 }];
    setRows(newRows);
    setCurrentPage(Math.max(1, Math.ceil(newRows.length / rowsPerPage)));
  };

  const removeRow = (rowId: string) => {
    const updatedRows = rows.filter(r => r.id !== rowId).map((r, idx) => ({ ...r, srNo: idx + 1 }));
    setRows(updatedRows);
  };

  const handleRowChange = (rowId: string, field: string, value: any) => {
    setRows(rows.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [field]: value };

      // If inch value changes, convert to MM and set as drgDim
      if (field === 'inchValue') {
        const inchVal = parseFloat(value) || 0;
        updated.drgDim = Math.round(inchVal * 25.4 * 100) / 100;
      }

      // Auto-calculate when drgDim, percentage, or mcIngAllowance changes
      if (field === 'drgDim' || field === 'percentage' || field === 'mcIngAllowance' || field === 'inchValue') {
        const drgDim = parseFloat(updated.drgDim) || 0;
        const percentage = parseFloat(updated.percentage) || 0;
        const mcIng = parseFloat(updated.mcIngAllowance) || 0;

        // Shrinkage Allowance = (drgDim × percentage) / 100
        const shrinkage = Math.round((drgDim * percentage) / 100 * 1000) / 1000;
        updated.shrinkageAllowance = shrinkage;

        // Dimn To Be Maintained = drgDim + shrinkageAllowance + mcIngAllowance
        updated.dimnToBeMaintained = Math.round((drgDim + shrinkage + mcIng) * 100) / 100;
      }

      return updated;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;

    if (e.key === 'Enter') {
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const tbody = target.closest('tbody');
        if (!tbody) return;
        const trs = Array.from(tbody.querySelectorAll('tr'));
        const lastTr = trs[trs.length - 1];
        const firstInput = lastTr?.querySelector('input:not([readOnly])') as HTMLInputElement | null;
        if (firstInput) {
          firstInput.focus();
          try { firstInput.select(); } catch (err) {}
        }
      }, 50);
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    const td = target.closest('td');
    const tr = target.closest('tr');
    if (!td || !tr) return;

    const tbody = tr.closest('tbody');
    if (!tbody) return;

    const trs = Array.from(tbody.querySelectorAll('tr'));
    const rowIndex = trs.indexOf(tr);
    const tds = Array.from(tr.querySelectorAll('td'));
    const colIndex = tds.indexOf(td);

    if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const prevTr = trs[rowIndex - 1];
        const targetTd = prevTr.querySelectorAll('td')[colIndex];
        const input = targetTd?.querySelector('input:not([readOnly])') as HTMLInputElement | null;
        if (input) {
          input.focus();
          try { input.select(); } catch (err) {}
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < trs.length - 1) {
        e.preventDefault();
        const nextTr = trs[rowIndex + 1];
        const targetTd = nextTr.querySelectorAll('td')[colIndex];
        const input = targetTd?.querySelector('input:not([readOnly])') as HTMLInputElement | null;
        if (input) {
          input.focus();
          try { input.select(); } catch (err) {}
        }
      }
    } else if (e.key === 'ArrowLeft') {
      let atStart = false;
      try {
        if (target.selectionStart !== null) {
          atStart = target.selectionStart === 0;
        } else {
          atStart = true;
        }
      } catch (err) {
        atStart = true;
      }
      
      if (!atStart) return;
      
      e.preventDefault();
      let prevTdIndex = colIndex - 1;
      while (prevTdIndex >= 0) {
        const targetTd = tds[prevTdIndex];
        const input = targetTd?.querySelector('input:not([readOnly])') as HTMLInputElement | null;
        if (input) {
          input.focus();
          try { input.select(); } catch (err) {}
          break;
        }
        prevTdIndex--;
      }
    } else if (e.key === 'ArrowRight') {
      let atEnd = false;
      try {
        if (target.selectionEnd !== null) {
          atEnd = target.selectionEnd === target.value.length;
        } else {
          atEnd = true;
        }
      } catch (err) {
        atEnd = true;
      }
      
      if (!atEnd) return;

      e.preventDefault();
      let nextTdIndex = colIndex + 1;
      while (nextTdIndex < tds.length) {
        const targetTd = tds[nextTdIndex];
        const input = targetTd?.querySelector('input:not([readOnly])') as HTMLInputElement | null;
        if (input) {
          input.focus();
          try { input.select(); } catch (err) {}
          break;
        }
        nextTdIndex++;
      }
    }
  };

  const handleSave = async () => {
    try {
      const customer = customers.find(c => c.id === customerId);
      const reportId = isEditing ? id : Date.now().toString();

      // Clean up rows to store in JSONB natively
      const cleanRows = rows.map(r => ({
        ...r,
        actualDimn: r.actualDimn ? Number(r.actualDimn) : null,
        shrinkageAllowance: r.shrinkageAllowance ? Number(r.shrinkageAllowance) : null,
        mcIngAllowance: r.mcIngAllowance ? Number(r.mcIngAllowance) : null,
        drgDim: r.drgDim ? Number(r.drgDim) : null,
        percentage: r.percentage ? Number(r.percentage) : null,
        dimnToBeMaintained: r.dimnToBeMaintained ? Number(r.dimnToBeMaintained) : null,
        inchValue: r.inchValue || null
      }));

      const payload = {
        id: reportId,
        report_no: reportNo,
        customer_id: customerId,
        customer_name: customer?.name || '',
        description,
        drawing_no: drgNo,
        date: new Date(date).toISOString(),
        details_of_pattern: detailsOfPattern,
        unit_mode: unitMode,
        rows: cleanRows,
        total_pages: '1',
        current_page: '1'
      };

      const { error } = await supabase.from('reports').upsert(payload);
      if (error) throw error;

      toast.success('Report saved successfully');
      navigate('/reports');
    } catch (error: any) {
      toast.error('Failed to save report: ' + error.message);
    }
  };

  const getFullReportData = () => {
      const customer = customers.find(c => c.id === customerId);
      return {
          id: isEditing ? id as string : 'new',
          reportNo,
          customerId,
          customerName: customer?.name || '',
          description,
          drawingNo: drgNo,
          date,
          detailsOfPattern,
          unitMode,
          rows,
          totalPages: '1',
          currentPage: '1'
      };
  };

  const handleDownloadPDF = () => {
      exportReportPDF(getFullReportData());
  };

  const handleDownloadExcel = () => {
      exportReportExcel(getFullReportData());
  };

  return (
    <div className="animate-fade-in pb-10">
      {/* Top Header — responsive: stacks on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground truncate">
              {isEditing ? 'Edit Report' : 'New Report'}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{reportNo || 'Draft Report'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <div className="bg-muted p-1 rounded-md flex items-center">
            <button
              onClick={() => setUnitMode('MM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${unitMode === 'MM' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >MM</button>
            <button
              onClick={() => setUnitMode('IN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${unitMode === 'IN' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >IN</button>
          </div>
          <Button variant="outline" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Button variant="outline" onClick={handleDownloadExcel}><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
          <Button onClick={() => {
            const missing: string[] = [];
            if (!reportNo) missing.push('Report No');
            if (!customerId) missing.push('Customer');
            if (!description) missing.push('Description');
            if (!date) missing.push('Date');
            if (missing.length > 0) {
              toast.error('Please fill: ' + missing.join(', '));
              return;
            }
            handleSave();
          }}>
            Save Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Report Info */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 md:col-span-1">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Report Info</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Report No *</label>
            {(() => {
              const fallback = customers.find((c) => c.id === customerId)?.numberPrefix || settings.numberPrefix;
              const parts = splitQuotationNumber(reportNo, fallback);
              const update = (seq: string, fy: string) => {
                setReportNo(`${parts.prefix}/${seq}/${fy}`);
              };
              return (
                <div className="flex items-center gap-1">
                  <div className="px-2 py-2 rounded-md bg-muted text-sm font-mono text-muted-foreground border border-border whitespace-nowrap">
                    {parts.prefix}
                  </div>
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={parts.seq}
                    onChange={(e) => update(e.target.value.replace(/[^0-9]/g, ""), parts.fy)}
                    className="w-16 text-center font-mono"
                    placeholder="3"
                  />
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={parts.fy}
                    onChange={(e) => update(parts.seq, e.target.value)}
                    className="w-20 text-center font-mono"
                    placeholder="26-27"
                  />
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">Date *</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Drg No</label>
              <Input value={drgNo} onChange={e => setDrgNo(e.target.value)} placeholder="e.g., 870868 REV 01" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Description *</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., 8'' 33300 Body" />
          </div>
        </div>

        {/* Customer & Details */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 md:col-span-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer & Details</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Select Customer *</label>
            <Select value={customerId} onValueChange={(val) => {
              setCustomerId(val);
              if (!isEditing) {
                const customer = customers.find(c => c.id === val);
                if (customer) {
                  const maxSeq = reports.reduce((max, r) => {
                    const parts = (r.reportNo || '').split('/');
                    if (parts.length >= 3) {
                      const seq = parseInt(parts[parts.length - 2], 10);
                      return !isNaN(seq) && seq > max ? seq : max;
                    }
                    return max;
                  }, 0);
                  const nextSeq = maxSeq + 1;
                  const prefix = customer.numberPrefix || settings.numberPrefix;
                  const fy = getFinancialYear(new Date());
                  setReportNo(buildQuotationNumber(prefix, nextSeq, fy));
                }
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Details of Pattern</label>
            <Input value={detailsOfPattern} onChange={e => setDetailsOfPattern(e.target.value)} placeholder="e.g., Split Aluminium Pattern - 1 set" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Report Data Rows</h3>
          <Button size="sm" onClick={addRow} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-slate-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-2 py-3 text-center w-12 text-muted-foreground">Sr No</th>
                <th className="px-2 py-3 text-muted-foreground">View</th>
                {unitMode === 'IN' && <th className="px-2 py-3 text-muted-foreground">Inches</th>}
                <th className="px-2 py-3 text-muted-foreground">Drg Dim</th>
                <th className="px-2 py-3 text-muted-foreground">%</th>
                <th className="px-2 py-3 text-muted-foreground">M/c ing allow</th>
                <th className="px-2 py-3 text-muted-foreground">Shrinkage % <br/><span className="text-[10px] font-normal">1, 1 1/2, 2, 2 1/2</span></th>
                <th className="px-2 py-3 text-muted-foreground">Dimn. To be maintained</th>
                <th className="px-2 py-3 text-muted-foreground">Actual Dimn</th>
                <th className="px-2 py-3 text-muted-foreground">Remark</th>
                <th className="px-2 py-3 text-center text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, index) => (
                <tr key={row.id} className="border-t hover:bg-slate-50/50">
                  <td className="px-2 py-2 text-center font-medium">{row.srNo}</td>
                  <td className="px-2 py-2">
                    <Input className="h-8 min-w-[80px]" value={row.view || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'view', e.target.value)} />
                  </td>
                  {unitMode === 'IN' && (
                      <td className="px-2 py-2">
                      <Input className="h-8 w-20" value={row.inchValue || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'inchValue', e.target.value)} />
                      </td>
                  )}
                  <td className="px-2 py-2">
                    <Input className="h-8 w-20" type="number" value={row.drgDim || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'drgDim', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 w-16" type="number" value={row.percentage || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'percentage', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 w-20" type="number" value={row.mcIngAllowance || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'mcIngAllowance', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 w-20 bg-muted" type="number" value={row.shrinkageAllowance || ''} readOnly tabIndex={-1} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 w-24 bg-muted" type="number" value={row.dimnToBeMaintained || ''} readOnly tabIndex={-1} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 w-24" type="number" value={row.actualDimn || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'actualDimn', e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-8 min-w-[100px]" value={row.remark || ''} onKeyDown={handleKeyDown} onChange={e => handleRowChange(row.id, 'remark', e.target.value)} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button onClick={() => removeRow(row.id)} variant="ghost" size="icon" className="text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-border bg-card">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, rows.length)} of {rows.length} rows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
