/** `۱۴:۰۵` style mm:ss in Persian digits; never negative. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const fa = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
  return `${fa.format(minutes)}:${fa.format(seconds)}`;
}

export function secondsUntil(isoTarget: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(isoTarget) - now) / 1000));
}
