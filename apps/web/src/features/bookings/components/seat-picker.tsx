"use client";

import type { BookingDto, SeatDto, SliceDirection } from "@flysmart/contracts";
import { passengerDisplayName } from "@flysmart/contracts";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SeatMap, useSeatMap } from "@/features/flights";
import { getErrorMessage } from "@/lib/api/parse";
import { formatNumber } from "@/lib/format";

import { useAssignSeats } from "../queries";

interface SeatPickerProps {
  booking: BookingDto;
  /** Called with the unsaved state so the payment button can ask the traveller to save first. */
  onDirtyChange: (dirty: boolean) => void;
}

type Assignments = Record<SliceDirection, Record<number, string>>;

function assignmentsOf(booking: BookingDto): Assignments {
  const result: Assignments = { OUTBOUND: {}, RETURN: {} };
  for (const passenger of booking.passengers) {
    for (const direction of ["OUTBOUND", "RETURN"] as const) {
      const seat = passenger.seats[direction];
      if (seat) result[direction][passenger.index] = seat;
    }
  }
  return result;
}

const sameAssignments = (a: Assignments, b: Assignments): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export function SeatPicker({ booking, onDirtyChange }: SeatPickerProps) {
  const saved = assignmentsOf(booking);
  const [draft, setDraft] = useState<Assignments>(saved);
  const [direction, setDirection] = useState<SliceDirection>("OUTBOUND");
  const [active, setActive] = useState<number>(
    booking.passengers.find((p) => p.type !== "INFANT")?.index ?? 0,
  );
  const assign = useAssignSeats(booking.id);

  const slice = booking.slices.find((item) => item.direction === direction) ?? booking.slices[0];
  const map = useSeatMap(slice?.flight.id ?? "", slice !== undefined);
  const seated = booking.passengers.filter((passenger) => passenger.type !== "INFANT");

  if (!slice) return null;

  const dirty = !sameAssignments(draft, saved);
  // Parent learns about unsaved edits through the callback, never through an effect.
  function change(next: Assignments) {
    setDraft(next);
    onDirtyChange(!sameAssignments(next, saved));
  }

  function pick(seat: SeatDto) {
    const holder = Object.entries(draft[direction]).find(([, number]) => number === seat.number);
    if (holder && Number(holder[0]) !== active) {
      toast.error("این صندلی برای مسافر دیگری انتخاب شده است.");
      return;
    }
    const passenger = booking.passengers[active];
    if (seat.kind === "EXIT" && passenger?.type !== "ADULT") {
      toast.error("صندلی خروج اضطراری فقط برای بزرگسالان مجاز است.");
      return;
    }
    change({ ...draft, [direction]: { ...draft[direction], [active]: seat.number } });
  }

  async function save() {
    const seats = (["OUTBOUND", "RETURN"] as const).flatMap((slot) =>
      Object.entries(draft[slot])
        .filter(([index, seat]) => saved[slot][Number(index)] !== seat)
        .map(([index, seat]) => ({ slice: slot, passengerIndex: Number(index), seat })),
    );
    if (seats.length === 0) return;
    try {
      await assign.mutateAsync({ seats });
      onDirtyChange(false);
      toast.success("انتخاب صندلی ذخیره شد.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  }

  const ownSeats = new Set(Object.values(saved[direction]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">انتخاب صندلی</CardTitle>
        <CardDescription>
          صندلی‌های کنار هم به‌صورت خودکار برایتان نگه داشته شده‌اند. اگر خواستید، برای هر مسافر
          جابه‌جا کنید. ردیف‌های جلو و اضطراری هزینه‌ی جداگانه دارند.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {booking.slices.length > 1 && (
          <ToggleGroup
            type="single"
            value={direction}
            onValueChange={(value) => value && setDirection(value as SliceDirection)}
            aria-label="انتخاب پرواز"
          >
            <ToggleGroupItem value="OUTBOUND">پرواز رفت</ToggleGroupItem>
            <ToggleGroupItem value="RETURN">پرواز برگشت</ToggleGroupItem>
          </ToggleGroup>
        )}

        <ToggleGroup
          type="single"
          value={String(active)}
          onValueChange={(value) => value && setActive(Number(value))}
          aria-label="مسافر فعال"
          className="flex-wrap"
        >
          {seated.map((passenger) => (
            <ToggleGroupItem key={passenger.index} value={String(passenger.index)}>
              {formatNumber(passenger.index + 1)}. {passengerDisplayName(passenger)}
              {draft[direction][passenger.index] && (
                <span className="tnum text-muted-foreground" dir="ltr">
                  {draft[direction][passenger.index]}
                </span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {map.isPending ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : map.isError ? (
          <ErrorState
            error={map.error}
            onRetry={() => void map.refetch()}
            title="نقشه‌ی صندلی دریافت نشد"
          />
        ) : (
          <SeatMap
            map={map.data}
            passengers={seated.map((passenger) => ({
              index: passenger.index,
              label: passengerDisplayName(passenger),
            }))}
            assignments={draft[direction]}
            activePassenger={active}
            ownSeats={ownSeats}
            onPick={pick}
            disabled={assign.isPending}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            هزینه‌ی صندلی‌های ذخیره‌شده:{" "}
            <Toman rial={booking.totals.seatFeesTotal} className="text-foreground text-sm" />
          </p>
          <Button type="button" onClick={() => void save()} disabled={!dirty || assign.isPending}>
            {assign.isPending && <Spinner data-icon="inline-start" aria-label="در حال ذخیره" />}
            ذخیره‌ی انتخاب صندلی
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
