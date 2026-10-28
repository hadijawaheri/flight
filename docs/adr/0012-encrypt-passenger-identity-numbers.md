# 0012 — Encrypt national codes and passport numbers at rest

Status: accepted · Date: 2026-10-28

Context: saved travellers and booking passengers kept national codes and passport numbers in the clear, so a
leaked database or backup exposed every traveller's identity. PRODUCT.md listed this as required before real use.
The values still have to be unique per user in the vault and matchable for the duplicate-traveller check on a flight.

Decision:

- `PiiCipher` (`common/crypto/pii-cipher.ts`) encrypts `nationalId` and `passportNumber` with AES-256-GCM, a random
  12-byte IV per value and the field name as associated data, so a ciphertext cannot be moved to another field.
  Stored form: `pii1:` + base64url(iv | tag | ciphertext). The prefix versions the format and lets old plaintext
  rows pass through `decrypt` unchanged while they are being migrated.
- Equality lookups use a blind index: HMAC-SHA256 of `field:value`, stored next to the value as `nationalIdHash`
  and `passportNumberHash` (vault and booking passengers). The vault's unique indexes and the booking duplicate
  check use these hashes instead of the raw values.
- Encryption and index keys are derived with HKDF from one master key, `PII_ENCRYPTION_KEY` (base64 of 32 random
  bytes). It is required in production; development and tests fall back to a fixed key so local setups keep working.
- Encryption happens in the services on write (`seal`), decryption only on the way out (`open`); booking DTOs still
  show masked numbers only. Names, birth dates and passport expiry stay in the clear: they are needed for sorting,
  age bands and validity checks, and are not identifiers on their own.
- Migration `0002-encrypt-passenger-identity-numbers` encrypts existing rows (soft-deleted ones too), fills the
  hashes, updates booking passengers field by field so a concurrent seat change is never overwritten, then drops the
  plaintext unique indexes. It is safe to rerun.

Consequences:

- Losing `PII_ENCRYPTION_KEY` makes every stored identity unreadable. Keep it with the database credentials and in
  the off-site backup notes, never in git. Changing it needs a re-encryption migration (decrypt with the old key,
  encrypt with the new one); the `pii1:` prefix is where a key id would go.
- A deploy without the key stops at `migrate` (env validation), so the running servers keep serving.
- Anyone with both the database and the key can still read everything; the key lives in `apps/api/.env`, not in
  Mongo, so a database dump or a stolen backup alone is no longer enough.
- Rows written by the old code between `migrate` and the PM2 reload stay readable but have no hash, so the
  duplicate check cannot see them; the window is the length of one reload.
