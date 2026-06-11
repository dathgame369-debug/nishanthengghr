import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuotation } from "@/context/QuotationContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Quotation,
  QuotationItem,
  QuotationStatus,
  QUOTATION_STATUSES,
  QuotationSubLine,
  buildQuotationNumber,
  getFinancialYear,
} from "@/types/quotation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Save, Download, ArrowLeft } from "lucide-react";
import { generateQuotationPDF } from "@/utils/quotationPdf";

const todayStr = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

function newItem(slNo: number, quotationId: string): QuotationItem {
  return {
    id: crypto.randomUUID(),
    quotationId,
    slNo,
    description: "",
    qty: "",
    rate: 0,
    amount: 0,
    subLines: [],
  };
}

// Split "VS/NEW/3/26-27" → { prefix:"VS/NEW", seq:"3", fy:"26-27" }
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

export default function QuotationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customers, settings, saveQuotation, bumpSequence, fetchItemsByQuotationId } = useQuotation();

  const [form, setForm] = useState<Quotation>({
    id: crypto.randomUUID(),
    quotationNumber: '',
    quotationDate: todayStr(),
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerGst: '',
    yourRef: '',
    yourRefDate: '',
    dueOn: '',
    subtotal: 0,
    taxPercent: 0,
    taxAmount: 0,
    total: 0,
    status: 'Draft',
    terms: '',
    notes: '',
    financialYear: getFinancialYear(),
  });
  const [lineItems, setLineItems] = useState<QuotationItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load quotation + items from DB when editing
  useEffect(() => {
    if (isNew) {
      // New quotation — initialize with defaults
      const fy = getFinancialYear();
      const newId = crypto.randomUUID();
      setForm({
        id: newId,
        quotationNumber: buildQuotationNumber(settings.numberPrefix, settings.nextSequence, fy),
        quotationDate: todayStr(),
        customerId: '', customerName: '', customerAddress: '', customerGst: '',
        yourRef: '', yourRefDate: '', dueOn: '',
        subtotal: 0, taxPercent: settings.defaultTaxPercent, taxAmount: 0, total: 0,
        status: 'Draft', terms: settings.defaultTerms, notes: '', financialYear: fy,
      });
      setLineItems([newItem(1, newId)]);
      setDataLoaded(true);
      return;
    }
    // Edit mode: fetch from DB directly
    (async () => {
      const { data: qData } = await supabase.from('quotations').select('*').eq('id', id).maybeSingle();
      if (!qData) { navigate('/quotations'); return; }
      const q: Quotation = {
        id: qData.id, quotationNumber: qData.quotation_number, quotationDate: qData.quotation_date || '',
        customerId: qData.customer_id || '', customerName: qData.customer_name || '',
        customerAddress: qData.customer_address || '', customerGst: qData.customer_gst || '',
        yourRef: qData.your_ref || '', yourRefDate: qData.your_ref_date || '', dueOn: qData.due_on || '',
        subtotal: Number(qData.subtotal), taxPercent: Number(qData.tax_percent),
        taxAmount: Number(qData.tax_amount), total: Number(qData.total),
        status: qData.status, terms: qData.terms || '', notes: qData.notes || '',
        financialYear: qData.financial_year || '',
      };
      setForm(q);
      try {
        const its = await fetchItemsByQuotationId(id!);
        setLineItems(its.length > 0 ? its : [newItem(1, q.id)]);
      } catch (e) {
        setLineItems([newItem(1, q.id)]);
      }
      setDataLoaded(true);
    })();
  }, [id, isNew, settings]);

  // Auto-compute amount per row + totals
  const computed = useMemo(() => {
    const enriched = lineItems.map((it) => {
      const qtyNum = parseFloat((it.qty || "").replace(/[^0-9.]/g, "")) || 0;
      const amount = it.rate && qtyNum ? qtyNum * it.rate : it.amount;
      const subLines = (it.subLines || []).map((s) => {
        const qn = parseFloat((s.qty || "").replace(/[^0-9.]/g, "")) || 0;
        const amt = s.rate && qn ? qn * s.rate : s.amount;
        return { ...s, amount: amt };
      });
      return { ...it, amount, subLines };
    });
    const subtotal = enriched.reduce(
      (s, it) => s + (it.amount || 0) + (it.subLines || []).reduce((a, sl) => a + (sl.amount || 0), 0),
      0,
    );
    const taxAmount = (subtotal * (form.taxPercent || 0)) / 100;
    return { enriched, subtotal, taxAmount, total: subtotal + taxAmount };
  }, [lineItems, form.taxPercent]);

  const setItem = (idx: number, patch: Partial<QuotationItem>) => {
    setLineItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const setSub = (idx: number, sIdx: number, patch: Partial<QuotationSubLine>) => {
    setLineItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const subs = [...(it.subLines || [])];
        subs[sIdx] = { ...subs[sIdx], ...patch };
        return { ...it, subLines: subs };
      }),
    );
  };
  const addSub = (idx: number) => {
    setLineItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, subLines: [...(it.subLines || []), { qty: "", rate: 0, amount: 0 }] } : it,
      ),
    );
  };
  const removeSub = (idx: number, sIdx: number) => {
    setLineItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, subLines: (it.subLines || []).filter((_, j) => j !== sIdx) } : it)),
    );
  };
  const addRow = () => setLineItems((prev) => [...prev, newItem(prev.length + 1, form.id)]);
  const removeRow = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, slNo: i + 1 })));
  };

  // Calculate the next sequence number for a customer by querying DB
  const getNextCustomerSequence = async (customerPrefix: string, financialYear: string): Promise<number> => {
    const { data } = await supabase
      .from('quotations')
      .select('quotation_number')
      .like('quotation_number', `${customerPrefix}/%/${financialYear}`);
    if (!data || data.length === 0) return 1;
    const sequences = data.map(q => {
      const parts = (q.quotation_number || '').split('/');
      const seq = parseInt(parts[parts.length - 2], 10);
      return isNaN(seq) ? 0 : seq;
    });
    return Math.max(...sequences) + 1;
  };

  const pickCustomer = async (cid: string) => {
    const c = customers.find((x) => x.id === cid);
    if (!c) return;
    const prefix = c.numberPrefix || settings.numberPrefix;
    const fy = form.financialYear || getFinancialYear();

    // Calculate customer-specific next sequence number from DB
    const nextSeq = isNew ? await getNextCustomerSequence(prefix, fy) : undefined;

    setForm((f) => ({
      ...f,
      customerId: c.id,
      customerName: c.name,
      customerAddress: c.address,
      customerGst: c.gstNumber,
      quotationNumber: isNew && nextSeq !== undefined ? buildQuotationNumber(prefix, nextSeq, fy) : f.quotationNumber,
    }));
  };

  const buildFinal = (): { q: Quotation; its: QuotationItem[] } => {
    const its = computed.enriched.map((it) => ({ ...it, quotationId: form.id }));
    const q: Quotation = {
      ...form,
      subtotal: computed.subtotal,
      taxAmount: computed.taxAmount,
      total: computed.total,
    };
    return { q, its };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;

    if (e.key === 'Enter') {
      if (target.tagName.toLowerCase() === 'textarea' && e.shiftKey) {
        return; // Let Shift+Enter add a newline
      }
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const tbody = target.closest('tbody');
        if (!tbody) return;
        const trs = Array.from(tbody.querySelectorAll('tr'));
        const lastTr = trs[trs.length - 1];
        const firstInput = lastTr?.querySelector('textarea:not([readOnly]), input:not([readOnly])') as HTMLElement | null;
        if (firstInput) {
          firstInput.focus();
          if ('select' in firstInput && typeof (firstInput as any).select === 'function') {
            try { (firstInput as any).select(); } catch (err) {}
          }
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
        const input = targetTd?.querySelector('textarea:not([readOnly]), input:not([readOnly])') as HTMLInputElement | HTMLTextAreaElement | null;
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
        const input = targetTd?.querySelector('textarea:not([readOnly]), input:not([readOnly])') as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) {
          input.focus();
          try { input.select(); } catch (err) {}
        }
      }
    } else if (e.key === 'ArrowLeft') {
      let atStart = false;
      try {
        const selStart = (target as HTMLInputElement).selectionStart;
        if (selStart !== null) {
          atStart = selStart === 0;
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
        const input = targetTd?.querySelector('textarea:not([readOnly]), input:not([readOnly])') as HTMLInputElement | HTMLTextAreaElement | null;
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
        const selEnd = (target as HTMLInputElement).selectionEnd;
        const valLen = (target as HTMLInputElement).value.length;
        if (selEnd !== null) {
          atEnd = selEnd === valLen;
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
        const input = targetTd?.querySelector('textarea:not([readOnly]), input:not([readOnly])') as HTMLInputElement | HTMLTextAreaElement | null;
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
    if (!form.customerName.trim()) {
      toast({ title: "Error", description: "Customer is required", variant: "destructive" });
      return;
    }
    if (computed.enriched.every((i) => !i.description.trim())) {
      toast({ title: "Error", description: "Add at least one item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { q, its } = buildFinal();
      await saveQuotation(q, its);
      if (isNew) await bumpSequence();
      toast({ title: "Saved", description: `Quotation ${q.quotationNumber} saved` });
      navigate("/quotations");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const { q, its } = buildFinal();
    generateQuotationPDF(q, its);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotations")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground truncate">
              {isNew ? "New Quotation" : "Edit Quotation"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{form.quotationNumber}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" /> Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Meta */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 lg:col-span-1">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quotation Info</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Quotation Number</label>
            {(() => {
              const fallback = customers.find((c) => c.id === form.customerId)?.numberPrefix || settings.numberPrefix;
              const parts = splitQuotationNumber(form.quotationNumber, fallback);
              const update = (seq: string, fy: string) => {
                setForm((f) => ({
                  ...f,
                  financialYear: fy,
                  quotationNumber: `${parts.prefix}/${seq}/${fy}`,
                }));
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
              <label className="text-xs font-medium block mb-1">Date</label>
              <Input
                value={form.quotationDate}
                onChange={(e) => setForm((f) => ({ ...f, quotationDate: e.target.value }))}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Status</label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as QuotationStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Your Ref</label>
              <Input value={form.yourRef} onChange={(e) => setForm((f) => ({ ...f, yourRef: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Due On</label>
              <Input value={form.dueOn} onChange={(e) => setForm((f) => ({ ...f, dueOn: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 lg:col-span-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Select Customer</label>
            <Select value={form.customerId || "__none__"} onValueChange={(v) => v !== "__none__" && pickCustomer(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose existing customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Manual entry</SelectItem>
                {customers
                  .filter((c) => c.status === "Active")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">Name *</label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">GST</label>
              <Input
                value={form.customerGst}
                onChange={(e) => setForm((f) => ({ ...f, customerGst: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Address</label>
            <Textarea
              rows={2}
              value={form.customerAddress}
              onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Line Items</h3>
          <Button size="sm" onClick={addRow}>
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 w-12 text-center">Sl</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 w-28">Qty</th>
                <th className="px-2 py-2 w-28 text-right">Rate</th>
                <th className="px-2 py-2 w-28 text-right">Amount</th>
                <th className="px-2 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {computed.enriched.map((it, idx) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="px-2 py-1 text-center text-muted-foreground">{it.slNo}</td>
                  <td className="px-2 py-1">
                    <Textarea
                      rows={2}
                      value={it.description}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => setItem(idx, { description: e.target.value })}
                      placeholder="Item description (Shift+Enter for newline)"
                      className="min-h-[44px]"
                    />
                  </td>
                  <td className="px-2 py-1 space-y-1 align-top">
                    <Input value={it.qty} onKeyDown={handleKeyDown} onChange={(e) => setItem(idx, { qty: e.target.value })} placeholder="1 set" />
                  </td>
                  <td className="px-2 py-1 space-y-1 align-top">
                    <Input
                      type="number"
                      step="0.01"
                      value={it.rate || ""}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => setItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                      className="text-right"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono align-top">
                    <div className="h-10 flex items-center justify-end">
                      {(it.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-2 py-1 text-center align-top">
                    <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terms + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Terms & Conditions
          </h3>
          <Textarea rows={6} value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
        </div>
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Totals</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">
              ₹{computed.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground flex-1">Tax %</label>
            <Input
              type="number"
              step="0.01"
              value={form.taxPercent}
              onChange={(e) => setForm((f) => ({ ...f, taxPercent: parseFloat(e.target.value) || 0 }))}
              className="w-24 text-right"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax Amount</span>
            <span className="font-mono">
              ₹{computed.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-border pt-2">
            <span>Grand Total</span>
            <span className="font-mono text-primary">
              ₹{computed.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
