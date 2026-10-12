/**
 * Lightweight JWS/JWT implementation using Web Crypto API (HMAC-SHA256).
 * Works entirely in the browser — no external libraries needed.
 *
 * Token layout: header.payload.signature  (all base64url-encoded)
 * Algorithm:    HS256 (HMAC + SHA-256)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;        // username
  role: string;       // custom role title
  permissions?: string[]; // allowed sections, or ['all']
  iat: number;        // issued-at  (Unix seconds)
  exp: number;        // expires-at (Unix seconds)
}

export interface JWTVerifyResult {
  valid: boolean;
  expired?: boolean;
  payload?: JWTPayload;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Encode a Uint8Array to base64url (no padding). */
function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Decode a base64url string to Uint8Array. */
function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - (str.length % 4)) % 4, '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Import a raw secret string as a CryptoKey for HMAC-SHA256. */
async function importKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

const JWT_SECRET = (import.meta.env.VITE_JWT_SECRET as string | undefined) || 'nishanth-engg-hr-jwt-secret-key-2025';

/**
 * Sign a JWT with HS256.
 * @param username  Subject claim
 * @param role      Role title
 * @param permissions List of allowed module keys
 * @param expiresInSeconds  Token lifetime in seconds (default 8 h)
 */
export async function signJWT(
  username: string,
  role: string = 'admin',
  permissions: string[] = ['all'],
  expiresInSeconds: number = 8 * 60 * 60
): Promise<string> {
  const secret = JWT_SECRET;
  if (!secret) throw new Error('VITE_JWT_SECRET is not set in .env');

  const header = toBase64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: username,
    role,
    permissions,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const encodedPayload = toBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signingInput = `${header}.${encodedPayload}`;
  const key = await importKey(secret);
  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  const signature = toBase64url(new Uint8Array(sigBytes));
  return `${signingInput}.${signature}`;
}

/**
 * Verify and decode a JWT. Returns { valid: false } if tampered or expired.
 */
export async function verifyJWT(token: string): Promise<JWTVerifyResult> {
  const secret = JWT_SECRET;
  if (!secret) return { valid: false, error: 'VITE_JWT_SECRET is not set' };

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };

    const [header, encodedPayload, signature] = parts;
    const signingInput = `${header}.${encodedPayload}`;

    // Verify signature
    const key = await importKey(secret);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64url(signature),
      new TextEncoder().encode(signingInput)
    );

    if (!isValid) return { valid: false, error: 'Invalid signature' };

    // Decode payload
    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(fromBase64url(encodedPayload))
    );

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, expired: true, payload, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

/**
 * Decode a JWT payload WITHOUT verifying the signature.
 * Use only for reading non-sensitive UI fields (e.g. username display).
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64url(parts[1])));
  } catch {
    return null;
  }
}
