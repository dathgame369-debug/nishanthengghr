-- Create custom login credentials table
CREATE TABLE public.login_credentials (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable Row Level Security on all tables to allow anonymous client queries
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_credentials DISABLE ROW LEVEL SECURITY;

-- Seed default user
INSERT INTO public.login_credentials (username, password)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;
