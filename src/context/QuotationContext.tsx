import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/context/HRContext';
import {
  Customer, Quotation, QuotationItem, QuotationSettings, DEFAULT_TERMS,
} from '@/types/quotation';

export interface QuotationFilters {
  search?: string;
  status?: string;
  customerId?: string;
  dateFilter?: string;
}

interface Ctx {
  loading: boolean;
  // Customers — fully loaded (small, reference table)
  customers: Customer[];
  // Quotations — current page only
  quotations: Quotation[];
  totalQuotations: number;
  fetchQuotations: (page: number, pageSize: number, filters?: QuotationFilters) => Promise<void>;
  // Items — loaded for current page's quotations
  items: QuotationItem[];
  fetchItemsByQuotationId: (quotationId: string) => Promise<QuotationItem[]>;
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
  state: r.state || '',
  district: r.district || '',
  pincode: r.pincode || '',
});
const customerToRow = (c: Customer) => ({
  id: c.id, name: c.name, address: c.address, gst_number: c.gstNumber,
  contact_person: c.contactPerson, phone: c.phone, email: c.email, status: c.status,
  number_prefix: c.numberPrefix || '',
  state: c.state, district: c.district, pincode: c.pincode,
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
  qty2: r.qty2 || '', rate2: Number(r.rate2 || 0), amount2: Number(r.amount2 || 0),
  subLines: Array.isArray(r.sub_lines)
    ? r.sub_lines.map((s: any) => ({ qty: s.qty || '', rate: Number(s.rate || 0), amount: Number(s.amount || 0) }))
    : [],
});
const itemToRow = (i: QuotationItem) => ({
  id: i.id, quotation_id: i.quotationId, sl_no: i.slNo,
  description: i.description, qty: i.qty, rate: i.rate, amount: i.amount,
  qty2: i.qty2 || '', rate2: i.rate2 || 0, amount2: i.amount2 || 0,
  sub_lines: (i.subLines || []) as any,
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
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [settings, setSettings] = useState<QuotationSettings>(DEFAULT_SETTINGS);

  // Load reference data (customers + settings) on session start
  useEffect(() => {
    if (!session) {
      setCustomers([]); setQuotations([]); setItems([]);
      setTotalQuotations(0); setSettings(DEFAULT_SETTINGS);
      return;
    }
    let cancelled = false;
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from('customers').select('*').order('id'),
        supabase.from('quotation_settings').select('*').eq('id', 'main').maybeSingle(),
      ]);
      if (cancelled) return;
      setCustomers((c.data || []).map(customerFromRow));
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
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Server-side paginated quotation fetch
  const fetchQuotations = useCallback(async (
    page: number,
    pageSize: number,
    filters: QuotationFilters = {}
  ) => {
    if (!session) return;
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('quotations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.search) {
        query = query.or(
          `quotation_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
        );
      }
      if (filters.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }
      if (filters.customerId && filters.customerId !== 'All') {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters.dateFilter) {
        // quotation_date stored as "DD-MM-YYYY" text — do exact match
        const [y, m, d] = filters.dateFilter.split('-');
        const dateStr = `${d}-${m}-${y}`;
        query = query.eq('quotation_date', dateStr);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const pageQuotations = (data || []).map(quotationFromRow);
      setQuotations(pageQuotations);
      setTotalQuotations(count ?? 0);

      // Batch-load items for all quotations on this page
      if (pageQuotations.length > 0) {
        const ids = pageQuotations.map(q => q.id);
        const { data: itemData } = await supabase
          .from('quotation_items')
          .select('*')
          .in('quotation_id', ids)
          .order('sl_no');
        setItems((itemData || []).map(itemFromRow));
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error('[quotations] fetchQuotations failed', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Fetch items for a specific quotation (used by editor page)
  const fetchItemsByQuotationId = useCallback(async (quotationId: string): Promise<QuotationItem[]> => {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('sl_no');
    if (error) throw error;
    return (data || []).map(itemFromRow);
  }, []);

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
    await supabase.from('quotation_items').delete().eq('quotation_id', q.id);
    if (qItems.length) {
      const { error: ie } = await supabase.from('quotation_items').insert(qItems.map(itemToRow));
      if (ie) throw ie;
    }
    // Update local state for the current page view
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
    setTotalQuotations(prev => Math.max(0, prev - 1));
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
      loading, customers, quotations, totalQuotations, fetchQuotations,
      items, fetchItemsByQuotationId, settings,
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