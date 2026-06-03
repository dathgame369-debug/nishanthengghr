-- This script hashes the default plaintext password ('admin123') to its SHA-256 equivalent
-- so that the new hashed login system can recognize the default account.

UPDATE public.login_credentials 
SET password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' 
WHERE username = 'admin' AND password = 'admin123';
