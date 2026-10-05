"use client";

import type { PricePoint } from "@flysmart/contracts";
import { useId, useState } from "react";

import { formatJalaliShort, formatTomanCompact, formatTomanNumber } from "@/lib/format";

interface PriceChartProps {
  history: readonly PricePoint[];
  forecast: readonly PricePoint[];
  /** Typical (median) price, drawn as a reference line. */
  median: number;
  /** Suggested alert target, drawn when set. */
  target?: number | null;
}

const WIDTH = 640;
const HEIGHT = 220;
// The value axis sits at the end (right) edge: time runs right to left in a Persian layout.
const PAD = { top: 12, right: 52, bottom: 24, left: 12 };

/**
 * Hand-rolled SVG on purpose: one line, one reference, one dashed forecast. A chart library would
 * ship far more code than this needs and make RTL axis handling harder, not easier.
 */
export function PriceChart({ history, forecast, median, target }: PriceChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  const all = [...history, ...forecast];
  if (history.length < 2) return null;

  const values = [...all.map((point) => point.price), median, ...(target ? [target] : [])];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, high * 0.05);
  const yMin = low - span * 0.1;
  const yMax = high + span * 0.1;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const lastIndex = all.length - 1;
  // Time runs right to left in an RTL layout, so the newest point sits at the left edge.
  const x = (index: number): number => PAD.left + plotW - (index / lastIndex) * plotW;
  const y = (price: number): number => PAD.top + plotH - ((price - yMin) / (yMax - yMin)) * plotH;

  const line = (points: readonly PricePoint[], offset: number): string =>
    points
      .map(
        (point, i) =>
          `${i === 0 ? "M" : "L"}${x(i + offset).toFixed(1)},${y(point.price).toFixed(1)}`,
      )
      .join(" ");

  const lastHistory = history.length - 1;
  const todayPoint = history[lastHistory] as PricePoint;
  const forecastPath = forecast.length > 0 ? line([todayPoint, ...forecast], lastHistory) : "";
  const ticks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];

  const active = hover !== null ? all[hover] : undefined;
  const isForecast = hover !== null && hover > lastHistory;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * WIDTH;
    const index = Math.round(((PAD.left + plotW - svgX) / plotW) * lastIndex);
    setHover(Math.min(lastIndex, Math.max(0, index)));
  }

  return (
    <figure className="flex flex-col gap-2">
      <div
        className="text-muted-foreground flex min-h-5 items-center justify-between text-xs"
        aria-live="off"
      >
        {active ? (
          <p>
            {formatJalaliShort(active.date)}
            {isForecast && " (پیش‌بینی)"}:{" "}
            <bdi className="text-foreground tnum font-semibold">
              {formatTomanNumber(active.price)}
            </bdi>{" "}
            تومان
          </p>
        ) : (
          <p>برای دیدن قیمت هر روز، روی نمودار حرکت کنید.</p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-labelledby={titleId}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <title id={titleId}>نمودار قیمت این پرواز در روزهای گذشته و پیش‌بینی روزهای آینده</title>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-border"
              strokeDasharray="2 4"
            />
            <text
              x={WIDTH - PAD.right + 6}
              y={y(tick)}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatTomanCompact(tick)}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(median)}
          y2={y(median)}
          className="stroke-muted-foreground"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          x={PAD.left}
          y={y(median) - 4}
          textAnchor="start"
          className="fill-muted-foreground text-[10px]"
        >
          قیمت معمول
        </text>

        {target ? (
          <>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(target)}
              y2={y(target)}
              className="stroke-warning"
              strokeWidth={1.5}
            />
            <text
              x={PAD.left}
              y={y(target) - 4}
              textAnchor="start"
              className="fill-warning-ink text-[10px]"
            >
              هدف پیشنهادی
            </text>
          </>
        ) : null}

        <path
          d={line(history, 0)}
          fill="none"
          className="stroke-primary"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            className="stroke-warning"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}

        <circle
          cx={x(lastHistory)}
          cy={y(todayPoint.price)}
          r={5}
          className="fill-primary stroke-background"
          strokeWidth={2}
        />

        {hover !== null && active && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              className="stroke-foreground/30"
            />
            <circle
              cx={x(hover)}
              cy={y(active.price)}
              r={4}
              className={isForecast ? "fill-warning" : "fill-primary"}
            />
          </g>
        )}

        <text
          x={PAD.left + plotW}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {formatJalaliShort((history[0] as PricePoint).date)}
        </text>
        <text
          x={PAD.left}
          y={HEIGHT - 6}
          textAnchor="start"
          className="fill-muted-foreground text-[10px]"
        >
          {formatJalaliShort((all[lastIndex] as PricePoint).date)}
        </text>
      </svg>
      <figcaption className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary inline-block h-0.5 w-4" aria-hidden="true" /> قیمت ثبت‌شده
        </span>
        {forecast.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="bg-warning inline-block h-0.5 w-4" aria-hidden="true" /> پیش‌بینی
          </span>
        )}
      </figcaption>
    </figure>
  );
}
