-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies to allow the application (which runs on anon key) to function
-- WARNING: This allows public access to make the custom login system work.
-- For true database-level security, you would need to migrate to Supabase Auth.

CREATE POLICY "Allow public access" ON public.departments FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.roles FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.advances FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.payroll FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.quotations FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.quotation_items FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.quotation_settings FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.login_credentials FOR ALL USING (true);
