import "server-only";

import { cookies } from "next/headers";

import { env } from "../env";
import { parseResponse } from "./parse";

interface ServerApiInit extends RequestInit {
  /** Public data (rules, airport guides) may be cached; personal data never is. */
  revalidate?: number;
}

export async function serverApi<T>(path: string, init: ServerApiInit = {}): Promise<T> {
  const { revalidate, ...rest } = init;
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${env.INTERNAL_API_URL}/v1${path}`, {
    ...rest,
    headers: { cookie: cookieHeader, "Content-Type": "application/json", ...rest.headers },
    ...(revalidate === undefined ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
  return parseResponse<T>(res);
}
