"use client";

import type { UserDto } from "@flysmart/contracts";
import { BellIcon, LogOutIcon, LuggageIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/queries";
import { getErrorMessage } from "@/lib/api/parse";
import { paths } from "@/lib/paths";

function displayName(user: UserDto): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.mobile;
}

export function UserMenu({ user }: { user: UserDto }) {
  const router = useRouter();
  const logout = useLogout();

  async function signOut() {
    try {
      await logout.mutateAsync();
      router.replace(paths.home);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
          aria-label="منوی حساب کاربری"
        >
          <Avatar>
            <AvatarFallback>{displayName(user).slice(0, 1)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{displayName(user)}</span>
          <bdi dir="ltr" className="text-muted-foreground text-start text-xs font-normal">
            {user.mobile}
          </bdi>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={paths.bookings}>
              <LuggageIcon /> سفرهای من
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={paths.passengers}>
              <UsersIcon /> مسافران ذخیره‌شده
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={paths.priceAlerts}>
              <BellIcon /> هشدار قیمت
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={paths.profile}>
              <UserRoundIcon /> پروفایل
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOutIcon /> خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
