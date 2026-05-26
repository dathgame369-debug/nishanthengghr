import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuotation } from '@/context/QuotationContext';
import {
  Quotation, QuotationItem, QuotationStatus, QUOTATION_STATUSES, QuotationSubLine,
  buildQuotationNumber, getFinancialYear,
} from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Trash2, Save, Download, ArrowLeft } from 'lucide-react';
import { generateQuotationPDF } from '@/utils/quotationPdf';

const todayStr = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
};

function newItem(slNo: number, quotationId: string): QuotationItem {
  return {
    id: crypto.randomUUID(), quotationId, slNo, description: '',
    qty: '', rate: 0, amount: 0, subLines: [],
  };
}

// Split "VS/NEW/3/26-27" → { prefix:"VS/NEW", seq:"3", fy:"26-27" }
function splitQuotationNumber(s: string, fallbackPrefix: string) {
  const parts = (s || '').split('/');
  if (parts.length >= 3) {
    const fy = parts[parts.length - 1];
    const seq = parts[parts.length - 2];
    const prefix = parts.slice(0, parts.length - 2).join('/');
    return { prefix: prefix || fallbackPrefix, seq, fy };
  }
  return { prefix: fallbackPrefix, seq: '', fy: getFinancialYear() };
}

export default function QuotationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    quotations, items, customers, settings,
    saveQuotation, bumpSequence,
  } = useQuotation();

  const existing = useMemo(() => quotations.find(q => q.id === id), [quotations, id]);

  const initial: Quotation = useMemo(() => {
    if (existing) return existing;
    const fy = getFinancialYear();
    return {
      id: crypto.randomUUID(),
      quotationNumber: buildQuotationNumber(settings.numberPrefix, settings.nextSequence, fy),
      quotationDate: todayStr(),
      customerId: '', customerName: '', customerAddress: '', customerGst: '',
      yourRef: '', yourRefDate: '', dueOn: '',
      subtotal: 0, taxPercent: settings.defaultTaxPercent, taxAmount: 0, total: 0,
      status: 'Draft', terms: settings.defaultTerms, notes: '',
      financialYear: fy,
    };
  }, [existing, settings]);

  const [form, setForm] = useState<Quotation>(initial);
  const [lineItems, setLineItems] = useState<QuotationItem[]>(
    existing ? items.filter(i => i.quotationId === existing.id).sort((a, b) => a.slNo - b.slNo)
      : [newItem(1, initial.id)],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial); }, [initial.id]);
  useEffect(() => {
    if (existing) {
      setLineItems(items.filter(i => i.quotationId === existing.id).sort((a, b) => a.slNo - b.slNo));
    }
  }, [existing, items]);

  // Auto-compute amount per row + totals
  const computed = useMemo(() => {
    const enriched = lineItems.map(it => {
      const qtyNum = parseFloat((it.qty || '').replace(/[^0-9.]/g, '')) || 0;
      const amount = it.rate && qtyNum ? qtyNum * it.rate : it.amount;
      const subLines = (it.subLines || []).map(s => {
        const qn = parseFloat((s.qty || '').replace(/[^0-9.]/g, '')) || 0;
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
    setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const setSub = (idx: number, sIdx: number, patch: Partial<QuotationSubLine>) => {
    setLineItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const subs = [...(it.subLines || [])];
      subs[sIdx] = { ...subs[sIdx], ...patch };
      return { ...it, subLines: subs };
    }));
  };
  const addSub = (idx: number) => {
    setLineItems(prev => prev.map((it, i) => i === idx
      ? { ...it, subLines: [...(it.subLines || []), { qty: '', rate: 0, amount: 0 }] }
      : it));
  };
  const removeSub = (idx: number, sIdx: number) => {
    setLineItems(prev => prev.map((it, i) => i === idx
      ? { ...it, subLines: (it.subLines || []).filter((_, j) => j !== sIdx) }
      : it));
  };
  const addRow = () => setLineItems(prev => [...prev, newItem(prev.length + 1, form.id)]);
  const removeRow = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, slNo: i + 1 })));
  };

  const pickCustomer = (cid: string) => {
    const c = customers.find(x => x.id === cid);
    if (!c) return;
    const prefix = c.numberPrefix || settings.numberPrefix;
    const fy = form.financialYear || getFinancialYear();
    setForm(f => ({
      ...f, customerId: c.id, customerName: c.name,
      customerAddress: c.address, customerGst: c.gstNumber,
      quotationNumber: isNew
        ? buildQuotationNumber(prefix, settings.nextSequence, fy)
        : f.quotationNumber,
    }));
  };

  const buildFinal = (): { q: Quotation; its: QuotationItem[] } => {
    const its = computed.enriched.map(it => ({ ...it, quotationId: form.id }));
    const q: Quotation = {
      ...form,
      subtotal: computed.subtotal,
      taxAmount: computed.taxAmount,
      total: computed.total,
    };
    return { q, its };
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      toast({ title: 'Error', description: 'Customer is required', variant: 'destructive' });
      return;
    }
    if (computed.enriched.every(i => !i.description.trim())) {
      toast({ title: 'Error', description: 'Add at least one item', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { q, its } = buildFinal();
      await saveQuotation(q, its);
      if (isNew) await bumpSequence();
      toast({ title: 'Saved', description: `Quotation ${q.quotationNumber} saved` });
      navigate('/quotations');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              {isNew ? 'New Quotation' : 'Edit Quotation'}
            </h1>
            <p className="text-sm text-muted-foreground">{form.quotationNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Preview PDF</Button>
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Meta */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 lg:col-span-1">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quotation Info</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Quotation Number</label>
            {(() => {
              const fallback = customers.find(c => c.id === form.customerId)?.numberPrefix || settings.numberPrefix;
              const parts = splitQuotationNumber(form.quotationNumber, fallback);
              const update = (seq: string, fy: string) => {
                setForm(f => ({
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
                    onChange={e => update(e.target.value.replace(/[^0-9]/g, ''), parts.fy)}
                    className="w-16 text-center font-mono"
                    placeholder="3"
                  />
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={parts.fy}
                    onChange={e => update(parts.seq, e.target.value)}
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
              <Input value={form.quotationDate} onChange={e => setForm(f => ({ ...f, quotationDate: e.target.value }))} placeholder="dd-mm-yyyy" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as QuotationStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUOTATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Your Ref</label>
              <Input value={form.yourRef} onChange={e => setForm(f => ({ ...f, yourRef: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Due On</label>
              <Input value={form.dueOn} onChange={e => setForm(f => ({ ...f, dueOn: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 lg:col-span-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer</h3>
          <div>
            <label className="text-xs font-medium block mb-1">Select Customer</label>
            <Select value={form.customerId || '__none__'} onValueChange={v => v !== '__none__' && pickCustomer(v)}>
              <SelectTrigger><SelectValue placeholder="Choose existing customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Manual entry</SelectItem>
                {customers.filter(c => c.status === 'Active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">Name *</label>
              <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">GST</label>
              <Input value={form.customerGst} onChange={e => setForm(f => ({ ...f, customerGst: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Address</label>
            <Textarea rows={2} value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Line Items</h3>
          <Button size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1" /> Add Row</Button>
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
                    <Textarea rows={2} value={it.description}
                      onChange={e => setItem(idx, { description: e.target.value })}
                      placeholder="Item description (multiline supported)" className="min-h-[44px]" />
                  </td>
                  <td className="px-2 py-1 space-y-1 align-top">
                    <Input value={it.qty} onChange={e => setItem(idx, { qty: e.target.value })} placeholder="1 set" />
                    {(it.subLines || []).map((s, sIdx) => (
                      <Input key={sIdx} value={s.qty}
                        onChange={e => setSub(idx, sIdx, { qty: e.target.value })}
                        placeholder={`Qty ${sIdx + 2}`} />
                    ))}
                    <Button type="button" size="sm" variant="ghost"
                      className="h-7 px-2 text-xs text-primary"
                      onClick={() => addSub(idx)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Qty
                    </Button>
                  </td>
                  <td className="px-2 py-1 space-y-1 align-top">
                    <Input type="number" step="0.01" value={it.rate || ''}
                      onChange={e => setItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                      className="text-right" />
                    {(it.subLines || []).map((s, sIdx) => (
                      <Input key={sIdx} type="number" step="0.01" value={s.rate || ''}
                        onChange={e => setSub(idx, sIdx, { rate: parseFloat(e.target.value) || 0 })}
                        className="text-right" placeholder={`Rate ${sIdx + 2}`} />
                    ))}
                  </td>
                  <td className="px-2 py-1 text-right font-mono align-top">
                    <div className="h-10 flex items-center justify-end">
                      {(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {(it.subLines || []).map((s, sIdx) => (
                      <div key={sIdx} className="h-10 flex items-center justify-end gap-1">
                        <span>{(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => removeSub(idx, sIdx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
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
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Terms & Conditions</h3>
          <Textarea rows={6} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
        </div>
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Totals</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">₹{computed.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground flex-1">Tax %</label>
            <Input type="number" step="0.01" value={form.taxPercent}
              onChange={e => setForm(f => ({ ...f, taxPercent: parseFloat(e.target.value) || 0 }))}
              className="w-24 text-right" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax Amount</span>
            <span className="font-mono">₹{computed.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-border pt-2">
            <span>Grand Total</span>
            <span className="font-mono text-primary">
              ₹{computed.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}