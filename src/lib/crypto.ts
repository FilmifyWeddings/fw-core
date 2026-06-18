/**
 * ============================================================
 * BRAHMASTRA ENCRYPTION ENGINE — src/lib/crypto.ts
 * ============================================================
 *
 * AES-256-GCM server-side token encryption utility.
 *
 * PURPOSE:
 *   Encrypts sensitive OAuth tokens (Meta, Google, WhatsApp API keys)
 *   before storing them in the database, and decrypts them on-the-fly
 *   when making outbound API requests.
 *
 * ALGORITHM: AES-256-GCM
 *   - 256-bit key from ENCRYPTION_SECRET env var (via PBKDF2 derivation)
 *   - 96-bit (12-byte) random IV per encryption — never reuse IVs
 *   - 128-bit GCM authentication tag — tamper-proof ciphertext
 *   - Output format: base64( iv[12] + authTag[16] + ciphertext )
 *     → Single string stored in DB, self-contained for decryption
 *
 * USAGE:
 *   import { encryptToken, decryptToken, isEncrypted } from '@/lib/crypto';
 *
 *   // Before saving to DB:
 *   const safeToken = encryptToken(rawOAuthToken);
 *   await supabase.from('integration_credentials').upsert({ access_token: safeToken });
 *
 *   // Before making API call:
 *   const liveToken = decryptToken(row.access_token);
 *   fetch('https://graph.facebook.com/...', { headers: { Authorization: `Bearer ${liveToken}` } });
 *
 * SECURITY NOTES:
 *   - ENCRYPTION_SECRET must be ≥32 characters. Use: openssl rand -base64 32
 *   - Store ONLY in server-side env (never expose to client/browser)
 *   - Rotating the key requires re-encrypting all existing tokens
 *   - GCM auth tag validates integrity — any tampering throws an error
 * ============================================================
 */

import crypto from 'crypto';

// ── Constants ─────────────────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12;       // 96 bits — GCM recommended IV size
const AUTH_TAG_LENGTH = 16; // 128 bits — GCM auth tag size
const KEY_LENGTH = 32;      // 256 bits — AES-256 key size
const SALT = 'bhamstra_brahmastra_v1'; // Application-level salt (non-secret, but consistent)
const ENCODING = 'base64' as const;
const ENCRYPTED_PREFIX = 'enc:v1:'; // Sentinel prefix to identify encrypted strings

// ── Key Derivation ────────────────────────────────────────────────────────────
/**
 * Derives a deterministic 256-bit key from ENCRYPTION_SECRET env var.
 * Uses PBKDF2 with SHA-256 for safe key stretching.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      '[BRAHMASTRA CRYPTO] ENCRYPTION_SECRET env var is missing or too short (<16 chars). ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  return crypto.pbkdf2Sync(
    secret,
    SALT,
    100_000,     // 100k PBKDF2 iterations — OWASP recommended minimum
    KEY_LENGTH,
    'sha256'
  );
}

// ── Encryption ────────────────────────────────────────────────────────────────
/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The raw sensitive token to encrypt (e.g. OAuth access_token)
 * @returns Encrypted string in format: "enc:v1:<base64(iv + authTag + ciphertext)>"
 *          Returns the original string untouched if it is already encrypted.
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return plaintext;

  // Idempotency guard: don't double-encrypt
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH); // Fresh random IV for every encryption

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag(); // GCM produces a tamper-proof authentication tag

    // Pack: iv (12 bytes) + authTag (16 bytes) + ciphertext (variable)
    const packed = Buffer.concat([iv, authTag, encrypted]);

    return ENCRYPTED_PREFIX + packed.toString(ENCODING);
  } catch (err: any) {
    throw new Error(`[BRAHMASTRA CRYPTO] Encryption failed: ${err.message}`);
  }
}

// ── Decryption ────────────────────────────────────────────────────────────────
/**
 * Decrypts an AES-256-GCM encrypted token back to plaintext.
 *
 * @param ciphertext - The encrypted string (must start with "enc:v1:")
 * @returns The original plaintext token, ready for API usage.
 *          Returns the input untouched if it is NOT an encrypted string (plain-text legacy tokens).
 * @throws Error if the ciphertext has been tampered with (GCM auth tag mismatch)
 */
export function decryptToken(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Graceful fallback: if the token is stored as plain text (legacy / unencrypted),
  // return it as-is to avoid breaking existing connections during migration.
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[BRAHMASTRA CRYPTO] Decrypting unencrypted legacy token. Re-save it to encrypt.');
    }
    return ciphertext;
  }

  try {
    const key = getDerivedKey();
    const packed = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), ENCODING);

    // Unpack: extract IV, authTag, and ciphertext from packed buffer
    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag); // GCM will throw if tag doesn't match → tamper detection

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(), // Throws if auth tag is invalid
    ]);

    return decrypted.toString('utf8');
  } catch (err: any) {
    throw new Error(
      `[BRAHMASTRA CRYPTO] Decryption failed — possible tampering or key mismatch: ${err.message}`
    );
  }
}

// ── Utility Helpers ───────────────────────────────────────────────────────────
/**
 * Checks if a string has been encrypted by this module.
 * Useful for conditional encryption logic during migrations.
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Safely encrypts a token only if it isn't already encrypted.
 * Use this for upsert operations where a re-save might occur.
 */
export function safeEncrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? value : encryptToken(value);
}

/**
 * Safely decrypts a token, returning null on failure instead of throwing.
 * Use this for non-critical reads where graceful degradation is preferred.
 */
export function safeDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decryptToken(value);
  } catch {
    return null;
  }
}

/**
 * Encrypts a record of token fields (convenience wrapper for integration_credentials upserts).
 *
 * @example
 * const safeRecord = encryptCredentialFields({
 *   access_token: rawAccessToken,
 *   refresh_token: rawRefreshToken,
 *   webhook_secret_key: rawSecret,
 * });
 */
export function encryptCredentialFields(
  fields: Record<string, string | null | undefined>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = safeEncrypt(value);
  }
  return result;
}

/**
 * Decrypts a record of token fields (convenience wrapper for integration_credentials reads).
 */
export function decryptCredentialFields(
  fields: Record<string, string | null | undefined>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = safeDecrypt(value);
  }
  return result;
}
