/**
 * Small authored demonstrations of the three promises. They are drawings of the idea, not data:
 * the shapes carry no prices and no claims, so they cannot be mistaken for a real quote.
 */

export function PriceVerdictArt() {
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true" focusable="false" className="w-full">
      <path d="M8 40 H232" strokeDasharray="4 5" className="stroke-border" strokeWidth="1.5" />
      <path
        d="M8 36 C34 30 48 52 72 50 S112 24 138 46 S176 84 200 88 L232 90"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <path
        d="M138 46 S176 84 200 88 L232 90 L232 112 L138 112 Z"
        className="fill-primary/10"
        stroke="none"
      />
      <circle cx="232" cy="90" r="6" className="fill-warning" />
      <circle cx="232" cy="90" r="11" className="stroke-warning" strokeWidth="2" />
    </svg>
  );
}

export function AssistantArt() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col gap-2">
      <div className="bg-primary/10 h-8 w-3/5 self-start rounded-2xl rounded-ss-md" />
      <div className="bg-muted flex flex-col gap-2 self-end rounded-2xl rounded-se-md p-3">
        <div className="bg-muted-foreground/25 h-2 w-40 rounded-full" />
        <div className="bg-muted-foreground/25 h-2 w-32 rounded-full" />
        <div className="bg-brand-soft text-brand-ink w-fit rounded-full px-2.5 py-0.5 text-xs font-bold">
          منبع و میزان اطمینان
        </div>
      </div>
    </div>
  );
}

export function AlertArt() {
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true" focusable="false" className="w-full">
      <path d="M8 76 H232" strokeDasharray="4 5" className="stroke-warning" strokeWidth="2" />
      <path
        d="M8 30 C40 22 56 42 84 46 S124 36 150 62 S190 96 232 84"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <circle cx="168" cy="76" r="6" className="fill-warning" />
      <circle cx="168" cy="76" r="12" className="stroke-warning" strokeWidth="2" />
    </svg>
  );
}
