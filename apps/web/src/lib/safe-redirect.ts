// Prevents open redirects: only same-origin absolute paths are accepted
export function safeRedirect(next: string | null | undefined, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : fallback;
}
