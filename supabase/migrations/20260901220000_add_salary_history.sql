-- Salary History: records every time an employee's basic salary is changed
CREATE TABLE IF NOT EXISTS public.employee_salary_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  effective_month TEXT NOT NULL DEFAULT '',
  effective_year INTEGER NOT NULL DEFAULT 0,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_salary_history ENABLE ROW LEVEL SECURITY;

-- Allow public access (same pattern as all other tables in this app)
CREATE POLICY "Allow public access" ON public.employee_salary_history FOR ALL USING (true);
