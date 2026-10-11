/**
 * Supabase Edge Function: auth-login
 * ------------------------------------
 * POST /functions/v1/auth-login
 * Body: { username: string, password: string }  (password is already SHA-256 hashed by the client)
 *
 * Returns:
 *   200 { token: string }        — signed HS256 JWT, 8-hour expiry
 *   401 { error: string }        — bad credentials
 *   400 { error: string }        — missing/malformed body
 *   405                          — method not allowed
 *
 * Environment secrets required (set via Supabase Dashboard or CLI):
 *   JWT_SECRET           — arbitrary secret string for HS256 signing
 *   SUPABASE_URL         — auto-injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase (needed to query login_credentials)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── CORS headers (allow your frontend origin) ───────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Helpers (base64url, HMAC-SHA256) — Deno has Web Crypto built-in ─────────

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function signJWT(username: string, role: string, permissions: string[], secret: string): Promise<string> {
  const header = toBase64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: username,
    role,
    permissions,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 hours
  };
  const encodedPayload = toBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signingInput = `${header}.${encodedPayload}`;
  const key = await importHmacKey(secret);
  const sigBytes = await crypto.subtle.sign(
    'HMAC', key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${toBase64url(new Uint8Array(sigBytes))}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { username, password } = body;
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'username and password are required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Read secrets from environment
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    console.error('[auth-login] JWT_SECRET secret is not set');
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Use service-role client to bypass RLS on login_credentials
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify credentials (password is already SHA-256 hashed on the client)
  const { data, error } = await supabase
    .from('login_credentials')
    .select('username, role, permissions')
    .eq('username', username)
    .eq('password', password)   // password column stores SHA-256 hex hash
    .maybeSingle();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Wrong username or password' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const userRole = data.role || (username === 'admin' ? 'Admin' : 'User');
  const userPermissions = (Array.isArray(data.permissions) && data.permissions.length > 0)
    ? data.permissions
    : (username === 'admin' || userRole.toLowerCase() === 'admin' ? ['all'] : []);

  // Sign JWT server-side — secret stays in Deno env, never sent to browser
  const token = await signJWT(username, userRole, userPermissions, jwtSecret);

  return new Response(JSON.stringify({ token, role: userRole, permissions: userPermissions }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
