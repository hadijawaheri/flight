"use client";

import type { SeatDto, SeatMapDto, SeatPosition } from "@flysmart/contracts";
import { Fragment } from "react";

import { formatNumber, formatTomanNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeatMapPassenger {
  index: number;
  label: string;
}

interface SeatMapProps {
  map: SeatMapDto;
  /** Seated passengers only: infants share a lap. */
  passengers: readonly SeatMapPassenger[];
  /** passenger index → seat number for this flight. */
  assignments: Readonly<Record<number, string>>;
  activePassenger: number;
  /** Seats this booking already holds on the server; they read as taken in the flight's map but are ours to move. */
  ownSeats: ReadonlySet<string>;
  onPick: (seat: SeatDto) => void;
  disabled?: boolean;
}

const POSITION_LABELS: Record<SeatPosition, string> = {
  WINDOW: "کنار پنجره",
  MIDDLE: "وسط",
  AISLE: "کنار راهرو",
};

function describe(seat: SeatDto, state: "taken" | "free" | "selected", holder?: string): string {
  const parts = [`صندلی ${seat.number}`, POSITION_LABELS[seat.position]];
  if (seat.kind === "EXIT") parts.push("ردیف اضطراری");
  if (seat.feeRial > 0) parts.push(`${formatTomanNumber(seat.feeRial)} تومان هزینه`);
  if (state === "taken") parts.push("اشغال");
  if (state === "selected" && holder) parts.push(`انتخاب‌شده برای ${holder}`);
  return parts.join("، ");
}

export function SeatMap({
  map,
  passengers,
  assignments,
  activePassenger,
  ownSeats,
  onPick,
  disabled,
}: SeatMapProps) {
  const holderOf = new Map<string, number>(
    Object.entries(assignments).map(([index, seat]) => [seat, Number(index)]),
  );
  const labelOf = new Map(passengers.map((passenger) => [passenger.index, passenger.label]));
  let lastCabin: string | null = null;

  return (
    <div className="flex flex-col gap-4">
      <ul
        className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
        role="list"
        aria-label="راهنمای نقشه"
      >
        <Legend className="border-input bg-background" label="آزاد" />
        <Legend className="border-warning bg-warning-soft" label="با هزینه (ردیف جلو یا اضطراری)" />
        <Legend className="border-primary bg-primary" label="انتخاب شما" />
        <Legend className="bg-muted border-transparent opacity-60" label="اشغال" />
      </ul>

      <div className="bg-muted/40 mx-auto flex w-fit max-w-full flex-col gap-1.5 overflow-x-auto rounded-t-[4rem] rounded-b-xl border px-5 pt-10 pb-5">
        {map.rows.map((row) => {
          const cabinHeader = row.cabin !== lastCabin;
          lastCabin = row.cabin;
          return (
            <Fragment key={row.row}>
              {cabinHeader && (
                <p className="text-muted-foreground py-1 text-center text-xs font-medium">
                  {row.cabin === "BUSINESS" ? "کابین بیزینس" : "کابین اکونومی"}
                </p>
              )}
              <div
                dir="ltr"
                className="flex items-center justify-center gap-4"
                role="group"
                aria-label={`ردیف ${formatNumber(row.row)}`}
              >
                {row.groups.map((group, groupIndex) => (
                  <div key={groupIndex} className="flex gap-1.5">
                    {group.map((seat) => {
                      const holder = holderOf.get(seat.number);
                      const selected = holder !== undefined;
                      const unavailable = seat.taken && !ownSeats.has(seat.number) && !selected;
                      const mine = holder === activePassenger;
                      const state = selected ? "selected" : unavailable ? "taken" : "free";
                      const extra = seat.feeRial > 0;
                      return (
                        <button
                          key={seat.number}
                          type="button"
                          disabled={disabled || unavailable}
                          aria-pressed={selected}
                          aria-label={describe(
                            seat,
                            state,
                            holder !== undefined ? labelOf.get(holder) : undefined,
                          )}
                          onClick={() => onPick(seat)}
                          className={cn(
                            "focus-visible:ring-ring/50 tnum flex size-9 items-center justify-center rounded-md border text-[0.7rem] font-medium transition-colors outline-none focus-visible:ring-3",
                            state === "taken" &&
                              "bg-muted border-transparent text-transparent opacity-60",
                            state === "free" &&
                              !extra &&
                              "border-input bg-background hover:border-primary hover:bg-brand-soft",
                            state === "free" &&
                              extra &&
                              "border-warning bg-warning-soft text-warning-ink hover:border-primary",
                            state === "selected" &&
                              mine &&
                              "border-primary bg-primary text-primary-foreground",
                            state === "selected" &&
                              !mine &&
                              "border-primary bg-brand-soft text-brand-ink",
                          )}
                        >
                          {selected
                            ? formatNumber((holder ?? 0) + 1)
                            : state === "taken"
                              ? ""
                              : seat.letter}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <span
                  className="text-muted-foreground tnum w-5 text-center text-[0.7rem]"
                  aria-hidden="true"
                >
                  {formatNumber(row.row)}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("inline-block size-4 rounded-sm border", className)} aria-hidden="true" />
      {label}
    </li>
  );
}
