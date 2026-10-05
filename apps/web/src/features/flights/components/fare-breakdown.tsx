import type { FareBreakdown, PassengerType } from "@flysmart/contracts";

import { Toman } from "@/components/shared/toman";
import { formatNumber } from "@/lib/format";

import { PASSENGER_TYPE_LABELS } from "../labels";

interface FareBreakdownProps {
  fare: FareBreakdown;
  /** Seat extras on top of the fare, rial. */
  seatFees?: number;
}

const ORDER: PassengerType[] = ["ADULT", "CHILD", "INFANT"];

/** Every rial of the total is explained here: base fare, taxes, service fee. No surprises at payment. */
export function FareBreakdownTable({ fare, seatFees = 0 }: FareBreakdownProps) {
  const groups = ORDER.map((type) => {
    const rows = fare.perPassenger.filter((row) => row.type === type);
    return { type, count: rows.length, row: rows[0] };
  }).filter((group) => group.count > 0 && group.row);

  return (
    <dl className="flex flex-col gap-2 text-sm">
      {groups.map(({ type, count, row }) =>
        row ? (
          <div key={type} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">
              {PASSENGER_TYPE_LABELS[type]} × {formatNumber(count)}
            </dt>
            <dd>
              <Toman rial={row.total * count} className="text-sm" />
            </dd>
          </div>
        ) : null,
      )}
      <div className="text-muted-foreground flex items-baseline justify-between gap-3 border-t pt-2 text-xs">
        <dt>کرایه‌ی پایه</dt>
        <dd className="tnum">
          <Toman rial={fare.baseTotal} className="text-xs" />
        </dd>
      </div>
      <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
        <dt>مالیات و عوارض فرودگاهی</dt>
        <dd>
          <Toman rial={fare.taxTotal} className="text-xs" />
        </dd>
      </div>
      <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
        <dt>کارمزد خدمات</dt>
        <dd>
          <Toman rial={fare.serviceFeeTotal} className="text-xs" />
        </dd>
      </div>
      {seatFees > 0 && (
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">هزینه‌ی انتخاب صندلی</dt>
          <dd>
            <Toman rial={seatFees} className="text-sm" />
          </dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3 border-t pt-3">
        <dt className="font-semibold">مبلغ قابل پرداخت</dt>
        <dd>
          <Toman rial={fare.total + seatFees} className="text-lg" />
        </dd>
      </div>
    </dl>
  );
}
