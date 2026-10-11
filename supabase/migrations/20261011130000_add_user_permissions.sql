ALTER TABLE public.login_credentials 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY['all'];

-- Ensure existing admin has all permissions
UPDATE public.login_credentials 
SET permissions = ARRAY['all']
WHERE username = 'admin' OR permissions IS NULL;
