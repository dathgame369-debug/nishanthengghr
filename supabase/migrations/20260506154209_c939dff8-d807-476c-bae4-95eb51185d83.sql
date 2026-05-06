ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS welfare_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welfare_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS welfare_basis_hours numeric NOT NULL DEFAULT 4;