import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuotation } from "@/context/QuotationContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Quotation,
  QuotationItem,
  QuotationStatus,
  QUOTATION_STATUSES,
  buildQuotationNumber,
  getFinancialYear,
} from "@/types/quotation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Download, ArrowLeft, BookmarkCheck } from "lucide-react";
import { generateQuotationPDF } from "@/utils/quotationPdf";
import { QuotationWordEditor } from "@/components/quotation/QuotationWordEditor";

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
  const { customers, settings, saveQuotation, bumpSequence, fetchItemsByQuotationId, saveSettings } = useQuotation();

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
  const [savingTerms, setSavingTerms] = useState(false);
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
    const its = lineItems.map((it) => ({ ...it, quotationId: form.id }));
    const subtotal = its.reduce((s, it) => s + (it.amount || 0), 0);
    const taxAmount = (subtotal * (form.taxPercent || 0)) / 100;
    const q: Quotation = {
      ...form,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
    return { q, its };
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      toast({ title: "Error", description: "Customer is required", variant: "destructive" });
      return;
    }
    if (lineItems.every((i) => !i.description.trim())) {
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

  const handleSaveDefaultTerms = async () => {
    setSavingTerms(true);
    try {
      await saveSettings({ ...settings, defaultTerms: form.terms });
      toast({ title: 'Default Terms Saved', description: 'These terms will appear in all new quotations automatically.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingTerms(false);
    }
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
      <div className="mb-4">
        <QuotationWordEditor form={form} items={lineItems} onChange={setLineItems} />
      </div>

      {/* Terms & Conditions */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Terms &amp; Conditions
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDefaultTerms}
            disabled={savingTerms}
            className="h-7 text-xs gap-1.5"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            {savingTerms ? 'Saving...' : 'Save as Default'}
          </Button>
        </div>
        <Textarea rows={4} value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
        <p className="text-xs text-muted-foreground mt-1.5">
          Edit terms above then click <strong>Save as Default</strong> to auto-fill these in all future quotations.
        </p>
      </div>
    </div>
  );
}
