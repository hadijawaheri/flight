import type { RefundPolicy } from "@flysmart/contracts";

import { formatPercent } from "@/lib/format";

/** The stepped penalty table, always visible before booking: surprise fees destroy trust. */
export function RefundPolicyList({ policy }: { policy: RefundPolicy }) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y rounded-lg border text-sm">
        {policy.tiers.map((tier) => (
          <li key={tier.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <span>{tier.label}</span>
            <span className="tnum font-medium">جریمه {formatPercent(tier.penaltyPercent)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-3 py-2">
          <span>عدم حضور در پرواز</span>
          <span className="tnum font-medium">
            جریمه {formatPercent(policy.noShowPenaltyPercent)}
          </span>
        </li>
      </ul>
      <p className="text-muted-foreground text-xs">
        جریمه روی کرایه‌ی پایه حساب می‌شود و کارمزد خدمات در لغو ارادی بازگردانده نمی‌شود. اگر
        ایرلاین پرواز را لغو کند، جریمه‌ای در کار نیست.
      </p>
    </div>
  );
}
