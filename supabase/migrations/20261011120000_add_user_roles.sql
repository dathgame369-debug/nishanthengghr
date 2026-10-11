ALTER TABLE public.login_credentials 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
