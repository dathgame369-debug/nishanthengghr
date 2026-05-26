export interface Customer {
  id: string;
  name: string;
  address: string;
  gstNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  numberPrefix: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  slNo: number;
  description: string;
  qty: string;
  rate: number;
  amount: number;
  qty2?: string;
  rate2?: number;
  amount2?: number;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export interface Quotation {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGst: string;
  yourRef: string;
  yourRefDate: string;
  dueOn: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  status: QuotationStatus;
  terms: string;
  notes: string;
  financialYear: string;
}

export interface QuotationSettings {
  id: string;
  numberPrefix: string;
  nextSequence: number;
  defaultTerms: string;
  defaultTaxPercent: number;
}

export const DEFAULT_TERMS = `1. Advance 50% against your order
2. Sales tax and surcharge extra at the time of delivery
3. Payment within ........ days from the date of supply
4. Delivery within ........ days from the date of your approval`;

export const QUOTATION_STATUSES: QuotationStatus[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];

export function getFinancialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0=Jan
  // FY April–March in India
  const start = m >= 3 ? y : y - 1;
  const end = start + 1;
  return `${String(start).slice(-2)}-${String(end).slice(-2)}`;
}

export function buildQuotationNumber(prefix: string, seq: number, fy: string): string {
  return `${prefix}/${seq}/${fy}`;
}