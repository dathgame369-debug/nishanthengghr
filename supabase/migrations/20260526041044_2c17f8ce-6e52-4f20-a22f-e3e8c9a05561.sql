
CREATE TABLE public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  gst_number text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotations (
  id text PRIMARY KEY,
  quotation_number text NOT NULL,
  quotation_date text NOT NULL DEFAULT '',
  customer_id text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  customer_gst text NOT NULL DEFAULT '',
  your_ref text NOT NULL DEFAULT '',
  your_ref_date text NOT NULL DEFAULT '',
  due_on text NOT NULL DEFAULT '',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  terms text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  financial_year text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_items (
  id text PRIMARY KEY,
  quotation_id text NOT NULL,
  sl_no integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  qty text NOT NULL DEFAULT '',
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_settings (
  id text PRIMARY KEY,
  number_prefix text NOT NULL DEFAULT 'VS/NEW',
  next_sequence integer NOT NULL DEFAULT 1,
  default_terms text NOT NULL DEFAULT '1. Advance 50% against your order
2. Sales tax and surcharge extra at the time of delivery
3. Payment within ........ days from the date of supply
4. Delivery within ........ days from the date of your approval',
  default_tax_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete quotations" ON public.quotations FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read quotation_items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write quotation_items" ON public.quotation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quotation_items" ON public.quotation_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete quotation_items" ON public.quotation_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read quotation_settings" ON public.quotation_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write quotation_settings" ON public.quotation_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update quotation_settings" ON public.quotation_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete quotation_settings" ON public.quotation_settings FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_quotation_items_qid ON public.quotation_items(quotation_id);
CREATE INDEX idx_quotations_date ON public.quotations(quotation_date);
