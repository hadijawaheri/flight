import { paths } from "../paths";
import { parseResponse } from "./parse";

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

let refreshing: Promise<boolean> | null = null;

// Single-flight: concurrent 401s share one refresh request
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, { json, ...init }: ApiInit = {}): Promise<T> {
  const send = () =>
    fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });

  let res = await send();
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      res = await send();
    } else if (typeof window !== "undefined") {
      // Hard navigation on purpose: drops all client state of the expired session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(
        `${paths.signIn}?next=${encodeURIComponent(window.location.pathname)}`,
      );
    }
  }
  return parseResponse<T>(res);
}
