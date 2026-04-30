
-- Departments
CREATE TABLE public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles / Designations
CREATE TABLE public.roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE public.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fixed_salary NUMERIC NOT NULL DEFAULT 0,
  date_of_joining TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Advances
CREATE TABLE public.advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  advance_date TEXT NOT NULL DEFAULT '',
  advance_amount NUMERIC NOT NULL DEFAULT 0,
  deduction_type TEXT NOT NULL DEFAULT 'Manual',
  monthly_deduction_amount NUMERIC NOT NULL DEFAULT 0,
  total_deducted NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  deduction_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll
CREATE TABLE public.payroll (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 0,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  present_days NUMERIC NOT NULL DEFAULT 0,
  present_amount NUMERIC NOT NULL DEFAULT 0,
  holidays NUMERIC NOT NULL DEFAULT 0,
  holiday_amount NUMERIC NOT NULL DEFAULT 0,
  ot_hours NUMERIC NOT NULL DEFAULT 0,
  ot_amount NUMERIC NOT NULL DEFAULT 0,
  welfare_amount NUMERIC NOT NULL DEFAULT 0,
  advance_deduction NUMERIC NOT NULL DEFAULT 0,
  bonus NUMERIC NOT NULL DEFAULT 0,
  net_payable NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user can read/write (single-org HR app)
CREATE POLICY "auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete departments" ON public.departments FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update roles" ON public.roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete roles" ON public.roles FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete employees" ON public.employees FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read advances" ON public.advances FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write advances" ON public.advances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update advances" ON public.advances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete advances" ON public.advances FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read payroll" ON public.payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write payroll" ON public.payroll FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update payroll" ON public.payroll FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete payroll" ON public.payroll FOR DELETE TO authenticated USING (true);

-- Seed default departments
INSERT INTO public.departments (id, name, status) VALUES
  ('DEPT001', 'Production', 'Active'),
  ('DEPT002', 'Maintenance', 'Active'),
  ('DEPT003', 'Quality', 'Active'),
  ('DEPT004', 'Admin', 'Active'),
  ('DEPT005', 'HR', 'Active'),
  ('DEPT006', 'Accounts', 'Active'),
  ('DEPT007', 'Sales', 'Active'),
  ('DEPT008', 'Store', 'Active');

-- Seed default roles
INSERT INTO public.roles (id, name, department, status) VALUES
  ('ROLE001', 'Manager', '', 'Active'),
  ('ROLE002', 'Supervisor', '', 'Active'),
  ('ROLE003', 'Operator', '', 'Active'),
  ('ROLE004', 'Technician', '', 'Active'),
  ('ROLE005', 'Helper', '', 'Active'),
  ('ROLE006', 'Clerk', '', 'Active'),
  ('ROLE007', 'Engineer', '', 'Active'),
  ('ROLE008', 'Foreman', '', 'Active');
