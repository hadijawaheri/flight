import { paths } from "./paths";

// Prevents open redirects: only same-origin absolute paths are allowed
export function safeRedirect(
  next: string | null | undefined,
  fallback: string = paths.dashboard,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
