"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { AirlinerBelly, AirlinerFront } from "./airliner-svg";
import { CLOUDS, JourneyEngine } from "./journey-engine";
import { buildStars } from "./journey-model";
import { useJourneyTier } from "./journey-tier";

// three.js (~600 kB) is only fetched on devices that will actually draw the 3D scene
const JourneyScene = dynamic(
  () => import("./journey-scene").then((module) => module.JourneyScene),
  {
    ssr: false,
  },
);

const STARS = buildStars();

/**
 * One flight behind the page: an airliner appears as a speck on the horizon, grows as the visitor
 * scrolls, passes low overhead and climbs away, then the sky turns from morning to night. Everything
 * that moves is written straight to the DOM by the engine, so scrolling never triggers a React
 * render. The children are the page's own sections.
 */
export function Journey({ children }: { children: ReactNode }) {
  const tier = useJourneyTier();
  const { resolvedTheme } = useTheme();
  const [engine] = useState(() => new JourneyEngine());
  const rootRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const bellyRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const sky = skyRef.current;
    if (!root || !sky) return;
    engine.attach({
      root,
      sky,
      plane: planeRef.current,
      planeFront: frontRef.current,
      planeBelly: bellyRef.current,
      clouds: cloudsRef.current,
    });
    return () => engine.detach();
  }, [engine]);

  useEffect(() => {
    engine.configure({ tier, dark: resolvedTheme === "dark" });
  }, [engine, tier, resolvedTheme]);

  return (
    <div
      ref={rootRef}
      data-journey-root=""
      data-tier={tier}
      data-scene="pending"
      className="journey relative isolate"
    >
      <div aria-hidden="true" className="journey-layer">
        <div ref={skyRef} className="journey-sky">
          <div className="journey-sun" />
          <svg className="journey-stars" width="100%" height="100%" focusable="false">
            {STARS.map((star, index) => (
              <circle
                key={index}
                cx={`${star.x.toFixed(2)}%`}
                cy={`${star.y.toFixed(2)}%`}
                r={star.r}
                className="journey-star"
                style={{ animationDelay: `${star.twinkle.toFixed(2)}s` }}
              />
            ))}
          </svg>
        </div>
        <div ref={cloudsRef} className="journey-clouds">
          {CLOUDS.map((_, index) => (
            <div key={index} data-cloud={index} className="journey-cloud" />
          ))}
        </div>
        <div ref={planeRef} className="journey-plane">
          <div ref={frontRef}>
            <AirlinerFront />
          </div>
          <div ref={bellyRef} style={{ opacity: 0 }}>
            <AirlinerBelly />
          </div>
        </div>
        {tier === "full" ? <JourneyScene engine={engine} /> : null}
      </div>
      {children}
    </div>
  );
}
