import { randomInt } from "node:crypto";

// No 0/O/1/I: a reference read aloud over the phone must not be ambiguous
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePnr(): string {
  let pnr = "";
  for (let index = 0; index < 6; index += 1) pnr += ALPHABET[randomInt(ALPHABET.length)];
  return pnr;
}

/** 13 digits: a 3-digit carrier prefix, as on real e-tickets, and 10 random digits. */
export function generateTicketNumber(airlineCode: string): string {
  const prefix =
    100 + ([...airlineCode].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) % 900);
  const serial = String(randomInt(0, 10_000_000_000)).padStart(10, "0");
  return `${prefix}${serial}`;
}
