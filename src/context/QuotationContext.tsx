import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/context/HRContext';
import {
  Customer, Quotation, QuotationItem, QuotationSettings, DEFAULT_TERMS,
} from '@/types/quotation';

interface Ctx {
  loading: boolean;
  customers: Customer[];
  quotations: Quotation[];
  items: QuotationItem[];
  settings: QuotationSettings;
  saveCustomer: (c: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  saveQuotation: (q: Quotation, items: QuotationItem[]) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  saveSettings: (s: QuotationSettings) => Promise<void>;
  bumpSequence: () => Promise<number>;
}

const QuotationContext = createContext<Ctx | null>(null);

const customerFromRow = (r: any): Customer => ({
  id: r.id, name: r.name, address: r.address || '', gstNumber: r.gst_number || '',
  contactPerson: r.contact_person || '', phone: r.phone || '', email: r.email || '',
  status: (r.status as 'Active' | 'Inactive') || 'Active',
  numberPrefix: r.number_prefix || '',
});
const customerToRow = (c: Customer) => ({
  id: c.id, name: c.name, address: c.address, gst_number: c.gstNumber,
  contact_person: c.contactPerson, phone: c.phone, email: c.email, status: c.status,
  number_prefix: c.numberPrefix || '',
});

const quotationFromRow = (r: any): Quotation => ({
  id: r.id, quotationNumber: r.quotation_number, quotationDate: r.quotation_date || '',
  customerId: r.customer_id || '', customerName: r.customer_name || '',
  customerAddress: r.customer_address || '', customerGst: r.customer_gst || '',
  yourRef: r.your_ref || '', yourRefDate: r.your_ref_date || '', dueOn: r.due_on || '',
  subtotal: Number(r.subtotal), taxPercent: Number(r.tax_percent),
  taxAmount: Number(r.tax_amount), total: Number(r.total),
  status: r.status, terms: r.terms || '', notes: r.notes || '',
  financialYear: r.financial_year || '',
});
const quotationToRow = (q: Quotation) => ({
  id: q.id, quotation_number: q.quotationNumber, quotation_date: q.quotationDate,
  customer_id: q.customerId, customer_name: q.customerName,
  customer_address: q.customerAddress, customer_gst: q.customerGst,
  your_ref: q.yourRef, your_ref_date: q.yourRefDate, due_on: q.dueOn,
  subtotal: q.subtotal, tax_percent: q.taxPercent, tax_amount: q.taxAmount,
  total: q.total, status: q.status, terms: q.terms, notes: q.notes,
  financial_year: q.financialYear,
});

const itemFromRow = (r: any): QuotationItem => ({
  id: r.id, quotationId: r.quotation_id, slNo: Number(r.sl_no),
  description: r.description || '', qty: r.qty || '',
  rate: Number(r.rate), amount: Number(r.amount),
});
const itemToRow = (i: QuotationItem) => ({
  id: i.id, quotation_id: i.quotationId, sl_no: i.slNo,
  description: i.description, qty: i.qty, rate: i.rate, amount: i.amount,
});

const DEFAULT_SETTINGS: QuotationSettings = {
  id: 'main', numberPrefix: 'VS/NEW', nextSequence: 1,
  defaultTerms: DEFAULT_TERMS, defaultTaxPercent: 0,
};

export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useHR();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [settings, setSettings] = useState<QuotationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!session) {
      setCustomers([]); setQuotations([]); setItems([]); setSettings(DEFAULT_SETTINGS);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [c, q, it, s] = await Promise.all([
        supabase.from('customers').select('*').order('id'),
        supabase.from('quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('quotation_items').select('*').order('sl_no'),
        supabase.from('quotation_settings').select('*').eq('id', 'main').maybeSingle(),
      ]);
      if (cancelled) return;
      setCustomers((c.data || []).map(customerFromRow));
      setQuotations((q.data || []).map(quotationFromRow));
      setItems((it.data || []).map(itemFromRow));
      if (s.data) {
        setSettings({
          id: s.data.id, numberPrefix: s.data.number_prefix,
          nextSequence: Number(s.data.next_sequence),
          defaultTerms: s.data.default_terms || DEFAULT_TERMS,
          defaultTaxPercent: Number(s.data.default_tax_percent),
        });
      } else {
        await supabase.from('quotation_settings').insert({
          id: 'main', number_prefix: DEFAULT_SETTINGS.numberPrefix,
          next_sequence: DEFAULT_SETTINGS.nextSequence,
          default_terms: DEFAULT_SETTINGS.defaultTerms,
          default_tax_percent: DEFAULT_SETTINGS.defaultTaxPercent,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  const saveCustomer = useCallback(async (c: Customer) => {
    const { error } = await supabase.from('customers').upsert(customerToRow(c));
    if (error) throw error;
    setCustomers(prev => {
      const exists = prev.find(x => x.id === c.id);
      return exists ? prev.map(x => x.id === c.id ? c : x) : [...prev, c];
    });
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    setCustomers(prev => prev.filter(x => x.id !== id));
  }, []);

  const saveQuotation = useCallback(async (q: Quotation, qItems: QuotationItem[]) => {
    const { error: qe } = await supabase.from('quotations').upsert(quotationToRow(q));
    if (qe) throw qe;
    // replace items: delete existing, insert new
    await supabase.from('quotation_items').delete().eq('quotation_id', q.id);
    if (qItems.length) {
      const { error: ie } = await supabase.from('quotation_items').insert(qItems.map(itemToRow));
      if (ie) throw ie;
    }
    setQuotations(prev => {
      const exists = prev.find(x => x.id === q.id);
      return exists ? prev.map(x => x.id === q.id ? q : x) : [q, ...prev];
    });
    setItems(prev => [...prev.filter(i => i.quotationId !== q.id), ...qItems]);
  }, []);

  const deleteQuotation = useCallback(async (id: string) => {
    await supabase.from('quotation_items').delete().eq('quotation_id', id);
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) throw error;
    setQuotations(prev => prev.filter(x => x.id !== id));
    setItems(prev => prev.filter(i => i.quotationId !== id));
  }, []);

  const saveSettings = useCallback(async (s: QuotationSettings) => {
    const { error } = await supabase.from('quotation_settings').upsert({
      id: s.id, number_prefix: s.numberPrefix, next_sequence: s.nextSequence,
      default_terms: s.defaultTerms, default_tax_percent: s.defaultTaxPercent,
    });
    if (error) throw error;
    setSettings(s);
  }, []);

  const bumpSequence = useCallback(async () => {
    const next = settings.nextSequence + 1;
    await saveSettings({ ...settings, nextSequence: next });
    return settings.nextSequence;
  }, [settings, saveSettings]);

  return (
    <QuotationContext.Provider value={{
      loading, customers, quotations, items, settings,
      saveCustomer, deleteCustomer, saveQuotation, deleteQuotation, saveSettings, bumpSequence,
    }}>
      {children}
    </QuotationContext.Provider>
  );
}

export function useQuotation() {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error('useQuotation must be used within QuotationProvider');
  return ctx;
}