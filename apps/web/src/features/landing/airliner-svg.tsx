import { cn } from "@/lib/utils";

import {
  bodyHalfWidth,
  ENGINE_PLAN,
  LENGTH,
  NOSE_X,
  type PlanStation,
  TAIL_X,
  tailPlan,
  wingPlan,
} from "./airliner-geometry";

/** Both views share one width in metres, so the engine can size either by the aircraft's span. */
export const SVG_VIEW_WIDTH = 36.4;

const fixed = (value: number): string => value.toFixed(2);

/** A swept lifting surface, seen from below with the nose up, as a closed outline for one side. */
function surfaceOutline(stations: readonly PlanStation[], side: 1 | -1): string {
  const edge = (pick: (s: PlanStation) => number, list: readonly PlanStation[]): string[] =>
    list.map((s) => `${fixed(side * s.z)} ${fixed(-pick(s))}`);
  const leading = edge((s) => s.lead, stations);
  const trailing = edge((s) => s.trail, [...stations].reverse());
  return `M${leading.join(" L")} L${trailing.join(" L")} Z`;
}

function bodyOutline(): string {
  const steps = 72;
  const xs = Array.from({ length: steps + 1 }, (_, i) => NOSE_X - (i / steps) * LENGTH);
  const right = xs.map((x) => `${fixed(bodyHalfWidth(x))} ${fixed(-x)}`);
  const left = [...xs].reverse().map((x) => `${fixed(-bodyHalfWidth(x))} ${fixed(-x)}`);
  return `M${right.join(" L")} L${left.join(" L")} Z`;
}

const WING = wingPlan();
const WING_TIP: PlanStation = WING[WING.length - 1] ?? { z: 17.5, lead: -4.5, trail: -6.2 };
const TAIL = tailPlan();
const BODY = bodyOutline();

/**
 * The airliner seen head-on, drawn from the same numbers as the 3D model. It stands in for the
 * WebGL aircraft on lite devices and before the 3D scene has produced a frame.
 */
export function AirlinerFront({ className }: { className?: string }) {
  const sides = [1, -1] as const;
  return (
    <svg
      viewBox={`${-SVG_VIEW_WIDTH / 2} -13.4 ${SVG_VIEW_WIDTH} 26.8`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-auto w-full", className)}
    >
      <defs>
        <radialGradient id="front-hull" cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor="var(--plane-body)" />
          <stop offset="0.7" stopColor="var(--plane-body)" />
          <stop offset="1" stopColor="var(--plane-shade)" />
        </radialGradient>
        <radialGradient id="front-fan" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c5cad2" />
          <stop offset="0.22" stopColor="#c5cad2" />
          <stop offset="0.26" stopColor="#4a4e56" />
          <stop offset="0.95" stopColor="#23262c" />
          <stop offset="1" stopColor="#101216" />
        </radialGradient>
        <radialGradient id="front-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="front-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--plane-body)" />
          <stop offset="1" stopColor="var(--plane-shade)" />
        </linearGradient>
      </defs>

      {/* Everything is drawn with y up and flipped once, so the numbers read like the 3D model's */}
      <g transform="scale(1 -1)">
        {/* Fin and tailplane stand behind the fuselage */}
        <path d="M-0.42 1.6 L-0.2 12.8 L0.2 12.8 L0.42 1.6 Z" className="fill-plane-livery" />
        <path
          d="M-6.1 1.55 L-2.2 1.05 L2.2 1.05 L6.1 1.55 L6.1 1.7 L2.2 1.38 L-2.2 1.38 L-6.1 1.7 Z"
          className="fill-plane-shade"
        />

        {sides.map((side) => (
          <g key={side}>
            {/* Wing: a thin dihedral sliver, thick at the root and fine at the tip, with its sharklet */}
            <path
              d={`M${side * 1.8} -1.62 L${side * 17.5} 0.18 L${side * 17.5} 0.36 L${side * 1.8} -0.5 Z`}
              fill="url(#front-wing)"
            />
            <path
              d={`M${side * 17.45} 0.2 L${side * 17.78} 0.2 L${side * 17.98} 2.9 L${side * 17.82} 2.9 Z`}
              className="fill-plane-body"
            />
            {/* Engine: pylon, cowl, intake lip, dark duct and the fan with its spinner */}
            <rect
              x={side * ENGINE_PLAN.z - 0.2}
              y={ENGINE_PLAN.y + 0.9}
              width={0.4}
              height={0.8}
              className="fill-plane-shade"
            />
            <circle
              cx={side * ENGINE_PLAN.z}
              cy={ENGINE_PLAN.y}
              r={ENGINE_PLAN.radius}
              fill="url(#front-hull)"
            />
            <circle cx={side * ENGINE_PLAN.z} cy={ENGINE_PLAN.y} r={0.95} fill="#8a9099" />
            <circle cx={side * ENGINE_PLAN.z} cy={ENGINE_PLAN.y} r={0.86} fill="url(#front-fan)" />
            {/* Landing light glare on the wing roots */}
            <circle cx={side * 3.4} cy={-1.1} r={0.75} fill="url(#front-glow)" />
          </g>
        ))}

        {/* Fuselage and windscreen */}
        <circle cx="0" cy="-0.05" r="2.07" fill="url(#front-hull)" />
        <path d="M-1.28 0.52 L-0.1 0.78 L-0.1 1.22 L-1.1 1.04 Z" className="fill-plane-glass" />
        <path d="M1.28 0.52 L0.1 0.78 L0.1 1.22 L1.1 1.04 Z" className="fill-plane-glass" />
        <circle cx="0" cy="-1.55" r="0.5" fill="url(#front-glow)" />
      </g>
    </svg>
  );
}

/** The airliner passing overhead, seen from below with the nose up, drawn from the 3D model's planform. */
export function AirlinerBelly({ className }: { className?: string }) {
  const sides = [1, -1] as const;
  const engineY = -(ENGINE_PLAN.front + ENGINE_PLAN.back) / 2;
  const engineLength = (ENGINE_PLAN.front - ENGINE_PLAN.back) / 2;
  return (
    <svg
      viewBox={`${-SVG_VIEW_WIDTH / 2} -19.5 ${SVG_VIEW_WIDTH} 39`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-auto w-full", className)}
    >
      <defs>
        <linearGradient id="belly-hull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--plane-shade)" />
          <stop offset="0.5" stopColor="var(--plane-body)" />
          <stop offset="1" stopColor="var(--plane-shade)" />
        </linearGradient>
        <linearGradient id="belly-wing" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--plane-shade)" />
          <stop offset="1" stopColor="var(--plane-body)" />
        </linearGradient>
      </defs>

      {/* Fin seen end-on along the keel line, then the tailplane, wings and engines */}
      <path d="M-0.17 8 L-0.17 15.4 L0.17 15.4 L0.17 8 Z" className="fill-plane-livery" />
      {sides.map((side) => (
        <g key={side}>
          <path d={surfaceOutline(TAIL, side)} className="fill-plane-shade" />
          <path d={surfaceOutline(WING, side)} fill="url(#belly-wing)" />
          <path
            d={`M${side * 17.4} ${fixed(-WING_TIP.lead)} L${side * 17.8} ${fixed(-WING_TIP.lead + 2.4)} L${side * 17.7} ${fixed(-WING_TIP.trail + 0.6)} L${side * 17.4} ${fixed(-WING_TIP.trail)} Z`}
            className="fill-plane-body"
          />
          <ellipse
            cx={side * ENGINE_PLAN.z}
            cy={engineY}
            rx={ENGINE_PLAN.radius}
            ry={engineLength}
            className="fill-plane-body"
          />
          <ellipse
            cx={side * ENGINE_PLAN.z}
            cy={-ENGINE_PLAN.front + 0.18}
            rx={ENGINE_PLAN.radius * 0.8}
            ry={0.28}
            className="fill-plane-glass"
          />
        </g>
      ))}

      <path d={BODY} fill="url(#belly-hull)" />
      <path
        d={`M-0.6 ${fixed(-(NOSE_X - 1.6))} L0.6 ${fixed(-(NOSE_X - 1.6))} L0.5 ${fixed(-(NOSE_X - 2.6))} L-0.5 ${fixed(-(NOSE_X - 2.6))} Z`}
        className="fill-plane-shade"
      />
      <path
        d={`M-0.9 ${fixed(-(TAIL_X + 3))} L0.9 ${fixed(-(TAIL_X + 3))} L0.2 ${fixed(-TAIL_X)} L-0.2 ${fixed(-TAIL_X)} Z`}
        className="fill-plane-shade"
      />
    </svg>
  );
}
