"use client";

import type { PassengerDto } from "@flysmart/contracts";
import { CheckIcon, PlusIcon, ShieldCheckIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { usePassengers } from "../queries";

interface TravelersVaultSelectorProps {
  onSelectPassenger: (passenger: PassengerDto) => void;
  selectedNationalIds?: string[];
  onAddNewClick?: () => void;
}

export function TravelersVaultSelector({
  onSelectPassenger,
  selectedNationalIds = [],
  onAddNewClick,
}: TravelersVaultSelectorProps) {
  const { data: passengers, isLoading } = usePassengers();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-14 animate-pulse items-center gap-2 rounded-xl border border-dashed p-3 text-xs">
        <div className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
        <span>در حال فراخوانی مسافران ذخیره‌شده از بانک مسافران...</span>
      </div>
    );
  }

  if (!passengers || passengers.length === 0) {
    return (
      <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <UsersIcon className="text-primary size-4" />
          <span className="text-foreground font-semibold">بانک مسافران من (خرید ۱-کلیکه)</span>
          <span className="text-muted-foreground hidden sm:inline">
            هنوز مسافری ذخیره نکرده‌اید. با تکمیل فرم زیر، مسافر به صورت خودکار برای خریدهای بعدی
            ذخیره می‌شود!
          </span>
        </div>
        {onAddNewClick && (
          <Button size="xs" variant="outline" onClick={onAddNewClick} className="gap-1">
            <PlusIcon className="size-3" />
            <span>افزودن همراه</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheckIcon className="text-primary size-4" />
          <span className="text-foreground text-xs font-bold">
            انتخاب ۱-کلیکه از مسافران ذخیره‌شده (بدون نیاز به تایپ مجدد):
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <ShieldCheckIcon className="text-primary size-3.5" />
          <span>تأییدشده و آماده صدور</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {passengers.map((p) => {
          const isSelected = selectedNationalIds.includes(p.nationalId);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPassenger(p)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary ring-primary/20 scale-102 shadow-xs ring-2"
                  : "bg-card hover:bg-accent text-foreground border-border hover:border-primary/50"
              }`}
            >
              {isSelected ? (
                <CheckIcon className="text-primary-foreground size-3.5" />
              ) : (
                <div className="bg-muted flex size-4 items-center justify-center rounded-full text-[10px]">
                  {p.gender === "MALE" ? "آقا" : "خانم"}
                </div>
              )}
              <span>
                {p.firstNameFa} {p.lastNameFa}
              </span>
              <span
                className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                ({p.nationalId})
              </span>
              {p.isDefault && (
                <Badge variant="secondary" className="bg-white/20 px-1 py-0 text-[9px]">
                  شما
                </Badge>
              )}
            </button>
          );
        })}

        {onAddNewClick && (
          <button
            type="button"
            onClick={onAddNewClick}
            className="text-muted-foreground hover:border-primary hover:text-foreground flex items-center gap-1 rounded-xl border border-dashed px-3 py-2 text-xs font-medium transition-colors"
          >
            <PlusIcon className="size-3.5" />
            <span>مسافر جدید</span>
          </button>
        )}
      </div>
    </div>
  );
}
