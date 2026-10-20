// Next applies the nonce from the request's CSP header to its own inline scripts
export const NONCE_HEADER = "x-nonce";

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // strict-dynamic lets the nonced Next runtime load its chunks; React refresh needs eval in dev
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Radix, sonner and next/font set inline styles; styles cannot run code
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}
