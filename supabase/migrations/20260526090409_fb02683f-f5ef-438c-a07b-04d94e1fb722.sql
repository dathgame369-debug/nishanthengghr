ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS sub_lines jsonb NOT NULL DEFAULT '[]'::jsonb;