import "server-only";

import { cookies } from "next/headers";

import { env } from "../env";
import { parseResponse } from "./parse";

export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${env.INTERNAL_API_URL}/v1${path}`, {
    ...init,
    headers: { cookie: cookieHeader, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  return parseResponse<T>(res);
}
