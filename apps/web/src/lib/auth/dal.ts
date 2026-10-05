import "server-only";

import type { ApiResponse, UserDto } from "@flysmart/contracts";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ApiError } from "../api/parse";
import { serverApi } from "../api/server";
import { paths } from "../paths";

export const getSession = cache(async (): Promise<UserDto | null> => {
  try {
    const { data } = await serverApi<ApiResponse<{ user: UserDto }>>("/auth/me");
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
});

// Call close to data access (pages, actions), not only in layouts: layouts do not re-render on navigation
export async function requireSession(): Promise<UserDto> {
  const user = await getSession();
  if (!user) redirect(paths.signIn);
  return user;
}
