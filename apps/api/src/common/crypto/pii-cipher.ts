import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

/** Fields whose values are encrypted at rest; the name is bound into every ciphertext. */
export type PiiField = "nationalId" | "passportNumber";

const PREFIX = "pii1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

// Development and test only: env validation refuses to boot production without a real key
const DEV_MASTER_KEY = Buffer.alloc(KEY_BYTES, "flysmart-development-only-pii-key");

/** Decodes PII_ENCRYPTION_KEY (base64 or base64url of exactly 32 random bytes); null when malformed. */
export function decodeMasterKey(value: string): Buffer | null {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) return null;
  const key = Buffer.from(trimmed.replaceAll("-", "+").replaceAll("_", "/"), "base64");
  return key.length === KEY_BYTES ? key : null;
}

/**
 * AES-256-GCM for national codes and passport numbers, plus a keyed hash ("blind index") of each value
 * so uniqueness and duplicate-traveller checks still work without decrypting. Both keys are derived
 * from one master key with HKDF, so the operator manages a single secret.
 */
export class PiiCipher {
  private readonly encryptionKey: Buffer;
  private readonly indexKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== KEY_BYTES) throw new Error("PII master key must be 32 bytes");
    this.encryptionKey = derive(masterKey, "flysmart/pii/encryption/v1");
    this.indexKey = derive(masterKey, "flysmart/pii/blind-index/v1");
  }

  /** The configured key, or the fixed development key outside production. */
  static fromEnv(env: { NODE_ENV?: string; PII_ENCRYPTION_KEY?: string | undefined }): PiiCipher {
    const raw = env.PII_ENCRYPTION_KEY?.trim();
    if (raw) {
      const key = decodeMasterKey(raw);
      if (!key) throw new Error("PII_ENCRYPTION_KEY must be base64 of 32 bytes");
      return new PiiCipher(key);
    }
    if (env.NODE_ENV === "production") throw new Error("PII_ENCRYPTION_KEY is required");
    return new PiiCipher(DEV_MASTER_KEY);
  }

  static isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }

  encrypt(field: PiiField, value: string): string;
  encrypt(field: PiiField, value: string | null): string | null;
  encrypt(field: PiiField, value: string | null): string | null {
    if (value === null) return null;
    // Re-saving a document must not wrap an existing ciphertext a second time
    if (PiiCipher.isEncrypted(value)) return value;
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    cipher.setAAD(Buffer.from(field));
    const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
  }

  /** Plaintext of a stored value; values written before encryption existed pass through unchanged. */
  decrypt(field: PiiField, value: string): string;
  decrypt(field: PiiField, value: string | null | undefined): string | null;
  decrypt(field: PiiField, value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (!PiiCipher.isEncrypted(value)) return value;
    const packed = Buffer.from(value.slice(PREFIX.length), "base64url");
    if (packed.length < IV_BYTES + TAG_BYTES) throw new Error(`Corrupt ${field} ciphertext`);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      packed.subarray(0, IV_BYTES),
    );
    decipher.setAAD(Buffer.from(field));
    decipher.setAuthTag(packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(packed.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
  }

  /** Deterministic keyed hash for equality lookups; never reveals the value without the key. */
  blindIndex(field: PiiField, value: string): string;
  blindIndex(field: PiiField, value: string | null): string | null;
  blindIndex(field: PiiField, value: string | null): string | null {
    if (value === null) return null;
    return createHmac("sha256", this.indexKey).update(`${field}:${value}`).digest("base64url");
  }

  /** Encrypted values plus their blind indexes, ready to store on a passenger. */
  seal(identity: { nationalId: string | null; passportNumber: string | null }): SealedIdentity {
    return {
      nationalId: this.encrypt("nationalId", identity.nationalId),
      nationalIdHash: this.blindIndex("nationalId", identity.nationalId),
      passportNumber: this.encrypt("passportNumber", identity.passportNumber),
      passportNumberHash: this.blindIndex("passportNumber", identity.passportNumber),
    };
  }

  /** The same document with plaintext identity numbers. */
  open<T extends { nationalId: string | null; passportNumber: string | null }>(document: T): T {
    return {
      ...document,
      nationalId: this.decrypt("nationalId", document.nationalId),
      passportNumber: this.decrypt("passportNumber", document.passportNumber),
    };
  }
}

export interface SealedIdentity {
  nationalId: string | null;
  nationalIdHash: string | null;
  passportNumber: string | null;
  passportNumberHash: string | null;
}

function derive(masterKey: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", masterKey, Buffer.alloc(0), info, KEY_BYTES));
}
