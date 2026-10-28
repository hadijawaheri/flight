import { describe, expect, it } from "vitest";

import { decodeMasterKey, PiiCipher } from "./pii-cipher.js";

const key = Buffer.alloc(32, 1);
const cipher = new PiiCipher(key);

describe("PiiCipher", () => {
  it("round-trips a value and never stores it in the clear", () => {
    const sealed = cipher.encrypt("nationalId", "0012345679");
    expect(sealed.startsWith("pii1:")).toBe(true);
    expect(sealed).not.toContain("0012345679");
    expect(cipher.decrypt("nationalId", sealed)).toBe("0012345679");
  });

  it("uses a fresh IV each time, so equal values do not look equal", () => {
    expect(cipher.encrypt("passportNumber", "A1234567")).not.toBe(
      cipher.encrypt("passportNumber", "A1234567"),
    );
  });

  it("does not encrypt twice and passes legacy plaintext through", () => {
    const sealed = cipher.encrypt("nationalId", "0012345679");
    expect(cipher.encrypt("nationalId", sealed)).toBe(sealed);
    expect(cipher.decrypt("nationalId", "0012345679")).toBe("0012345679");
    expect(cipher.encrypt("nationalId", null)).toBeNull();
    expect(cipher.decrypt("nationalId", null)).toBeNull();
    expect(cipher.decrypt("nationalId", undefined)).toBeNull();
  });

  it("rejects a ciphertext moved to another field, tampered with, or read with another key", () => {
    const sealed = cipher.encrypt("nationalId", "0012345679");
    expect(() => cipher.decrypt("passportNumber", sealed)).toThrow();

    const bytes = Buffer.from(sealed.slice("pii1:".length), "base64url");
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1;
    expect(() => cipher.decrypt("nationalId", `pii1:${bytes.toString("base64url")}`)).toThrow();
    expect(() => cipher.decrypt("nationalId", "pii1:AAAA")).toThrow(/Corrupt/);

    expect(() => new PiiCipher(Buffer.alloc(32, 2)).decrypt("nationalId", sealed)).toThrow();
  });

  it("gives a stable blind index per field and key", () => {
    const hash = cipher.blindIndex("nationalId", "0012345679");
    expect(hash).toBe(cipher.blindIndex("nationalId", "0012345679"));
    expect(hash).not.toBe(cipher.blindIndex("nationalId", "0012345680"));
    expect(hash).not.toBe(cipher.blindIndex("passportNumber", "0012345679"));
    expect(hash).not.toBe(
      new PiiCipher(Buffer.alloc(32, 2)).blindIndex("nationalId", "0012345679"),
    );
    expect(cipher.blindIndex("nationalId", null)).toBeNull();
  });

  it("seals and opens a passenger identity", () => {
    const sealed = cipher.seal({ nationalId: "0012345679", passportNumber: null });
    expect(sealed.passportNumber).toBeNull();
    expect(sealed.passportNumberHash).toBeNull();
    expect(sealed.nationalIdHash).toBe(cipher.blindIndex("nationalId", "0012345679"));
    expect(cipher.open({ ...sealed, firstNameEn: "Ali" })).toEqual({
      ...sealed,
      firstNameEn: "Ali",
      nationalId: "0012345679",
      passportNumber: null,
    });
  });
});

describe("PiiCipher.fromEnv", () => {
  it("uses the configured key", () => {
    const fromEnv = PiiCipher.fromEnv({ PII_ENCRYPTION_KEY: key.toString("base64") });
    expect(fromEnv.decrypt("nationalId", cipher.encrypt("nationalId", "0012345679"))).toBe(
      "0012345679",
    );
  });

  it("falls back to a development key outside production only", () => {
    expect(() => PiiCipher.fromEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(() => PiiCipher.fromEnv({ NODE_ENV: "production" })).toThrow(/required/);
    expect(() => PiiCipher.fromEnv({ PII_ENCRYPTION_KEY: "nope" })).toThrow(/32 bytes/);
  });
});

describe("decodeMasterKey", () => {
  it("accepts base64 and base64url of 32 bytes only", () => {
    const raw = Buffer.alloc(32, 250);
    expect(decodeMasterKey(raw.toString("base64"))?.equals(raw)).toBe(true);
    expect(decodeMasterKey(` ${raw.toString("base64url")} `)?.equals(raw)).toBe(true);
    expect(decodeMasterKey(Buffer.alloc(31).toString("base64"))).toBeNull();
    expect(decodeMasterKey("not base64!")).toBeNull();
  });
});
