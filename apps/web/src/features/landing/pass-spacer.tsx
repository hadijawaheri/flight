/**
 * An empty stretch of open sky. The hour of the day changes while it crosses the screen, so no copy
 * is ever read against a shifting sky. The airliner has its own, longer stretch (see ApproachSpacer).
 */
export function PassSpacer({ id }: { id: "s1" | "s2" | "s3" }) {
  return <div aria-hidden="true" data-journey-pass={id} className="h-[45svh] md:h-[55svh]" />;
}

/**
 * The open sky that follows the hero while the airliner comes in, passes overhead and climbs away.
 * The approach is scroll-driven over APPROACH_SCROLL viewport heights from the top of the page: the
 * hero is one of them, this fills the rest, so the climb-out happens in clear sky.
 */
export function ApproachSpacer() {
  return <div aria-hidden="true" className="h-[160svh]" />;
}
