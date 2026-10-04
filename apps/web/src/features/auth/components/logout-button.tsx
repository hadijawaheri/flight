"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { paths } from "@/lib/paths";

import { useLogout } from "../queries";

export function LogoutButton() {
  const router = useRouter();
  const logout = useLogout();

  return (
    <Button
      variant="outline"
      disabled={logout.isPending}
      onClick={async () => {
        await logout.mutateAsync();
        router.replace(paths.signIn);
        router.refresh();
      }}
    >
      {logout.isPending && <Spinner data-icon="inline-start" aria-label="در حال خروج" />}
      خروج
    </Button>
  );
}
