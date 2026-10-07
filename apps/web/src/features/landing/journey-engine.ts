import { SPAN } from "./airliner-geometry";
import {
  type AircraftPose,
  aircraftVisible,
  approachAt,
  approachProgress,
  cameraAt,
  type CameraPose,
  clamp01,
  FOG_DENSITY,
  project,
  smoothstep,
} from "./approach-model";
import {
  buildClouds,
  type CloudSpec,
  cloudTintAt,
  hourFromSpacers,
  nightFactor,
  rgbToCss,
  skyAt,
  skyColorAt,
  sunDirAt,
  sunGlowAt,
  type Tier,
} from "./journey-model";

/** Both SVG views are drawn 36.4 m wide so they can be sized by the aircraft's 35.8 m span. */
const SVG_VIEW_SPAN = 36.4;

export const CLOUDS: readonly CloudSpec[] = buildClouds();

/** Where the aircraft hangs, small and far, when motion is turned off. */
const STILL_U = 0.34;
const RAD_TO_DEG = 180 / Math.PI;

export interface Frame {
  /** Seconds since the page loaded. */
  time: number;
  delta: number;
  hour: number;
  night: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
  aspect: number;
  dark: boolean;
  tier: Tier;
  /** How far the approach has got: 0 at the top of the page, 1 once the aircraft has gone. */
  u: number;
  camera: CameraPose;
  /** Null once the aircraft is out of sight, so nothing is drawn or moved. */
  aircraft: AircraftPose | null;
  /** Smoothed pointer position, -1 to 1 on both axes. */
  pointerX: number;
  pointerY: number;
}

export interface EngineTargets {
  root: HTMLElement;
  sky: HTMLElement;
  plane: HTMLElement | null;
  planeFront: HTMLElement | null;
  planeBelly: HTMLElement | null;
  clouds: HTMLElement | null;
}

interface Box {
  top: number;
  height: number;
}

type SpacerId = "s1" | "s2" | "s3";

const asSpacerId = (value: string | undefined): SpacerId | null =>
  value === "s1" || value === "s2" || value === "s3" ? value : null;

/** The fog the WebGL scene lays over the aircraft, so both versions fade alike. */
const fogAt = (distance: number): number => 1 - Math.exp(-((FOG_DENSITY * distance) ** 2));

/**
 * Turns scrolling into a flight: it derives the aircraft's pose and the viewer's head angle from
 * the scroll position and the hour of the day from the spacers, writes the sky as CSS variables (no
 * React renders per frame) and moves the SVG stand-ins. The WebGL scene subscribes to the same frames.
 */
export class JourneyEngine {
  private targets: EngineTargets | null = null;
  private tier: Tier = "lite";
  private dark = false;
  private continuous = false;
  private visible = true;
  private sceneReady = false;
  private dirty = true;
  private raf = 0;
  private lastNow = 0;
  private spacers: Record<SpacerId, Box> = {
    s1: { top: 0, height: 1 },
    s2: { top: 0, height: 1 },
    s3: { top: 0, height: 1 },
  };
  private cloudNodes: { el: HTMLElement; spec: CloudSpec }[] = [];
  private pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private listeners = new Set<(frame: Frame) => void>();
  private cleanup: (() => void)[] = [];

  attach(targets: EngineTargets): void {
    this.detach();
    this.targets = targets;
    this.measure();

    const onScroll = (): void => this.invalidate();
    const onResize = (): void => {
      this.measure();
      this.invalidate();
    };
    const onVisibility = (): void => this.invalidate();
    const onPointer = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") return;
      this.pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
      this.invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanup.push(
      () => window.removeEventListener("scroll", onScroll),
      () => window.removeEventListener("resize", onResize),
      () => window.removeEventListener("pointermove", onPointer),
      () => document.removeEventListener("visibilitychange", onVisibility),
    );

    // Panels grow when deals arrive, which moves every spacer; re-measure instead of guessing
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(targets.root);
    this.cleanup.push(() => resizeObserver.disconnect());

    // Nothing is drawn or computed while the landing page is scrolled out of view
    const intersection = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      this.invalidate();
    });
    intersection.observe(targets.root);
    this.cleanup.push(() => intersection.disconnect());

    this.invalidate();
  }

  detach(): void {
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    if (this.raf !== 0) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.targets = null;
    this.cloudNodes = [];
  }

  configure(options: { tier: Tier; dark: boolean }): void {
    this.tier = options.tier;
    this.dark = options.dark;
    if (this.targets) this.targets.root.dataset.tier = options.tier;
    this.invalidate();
  }

  /** While the aircraft is on screen the scene asks for a frame every animation frame, so lights blink and the fan turns. */
  setContinuous(on: boolean): void {
    if (this.continuous === on) return;
    this.continuous = on;
    this.invalidate();
  }

  setSceneReady(ready: boolean): void {
    this.sceneReady = ready;
    if (this.targets) this.targets.root.dataset.scene = ready ? "ready" : "pending";
  }

  subscribe(listener: (frame: Frame) => void): () => void {
    this.listeners.add(listener);
    this.invalidate();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private invalidate(): void {
    this.dirty = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.raf === 0 && this.targets && this.visible && !document.hidden) {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private measure(): void {
    const targets = this.targets;
    if (!targets) return;
    const scrollY = window.scrollY;
    targets.root.querySelectorAll<HTMLElement>("[data-journey-pass]").forEach((el) => {
      const id = asSpacerId(el.dataset.journeyPass);
      if (!id) return;
      const rect = el.getBoundingClientRect();
      this.spacers[id] = { top: rect.top + scrollY, height: Math.max(1, rect.height) };
    });

    if (targets.clouds && this.cloudNodes.length === 0) {
      this.cloudNodes = Array.from(targets.clouds.querySelectorAll<HTMLElement>("[data-cloud]"))
        .map((el) => ({ el, spec: CLOUDS[Number(el.dataset.cloud)] }))
        .filter((node): node is { el: HTMLElement; spec: CloudSpec } => node.spec !== undefined);
    }
  }

  private readonly tick = (now: number): void => {
    this.raf = 0;
    if (!this.targets) return;
    const delta = this.lastNow === 0 ? 1 / 60 : Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;
    this.dirty = false;

    const frame = this.buildFrame(now / 1000, delta);
    this.apply(frame);
    this.listeners.forEach((listener) => listener(frame));

    const settling =
      Math.abs(this.pointer.targetX - this.pointer.x) > 0.002 ||
      Math.abs(this.pointer.targetY - this.pointer.y) > 0.002;
    if (this.dirty || settling || this.continuous) this.schedule();
  };

  private buildFrame(time: number, delta: number): Frame {
    const scrollY = window.scrollY;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const aspect = viewportW / viewportH;
    const still = this.tier === "off";

    const q = (box: Box): number => (scrollY + viewportH / 2 - box.top) / box.height;
    const hour = hourFromSpacers([
      clamp01(q(this.spacers.s1)),
      clamp01(q(this.spacers.s2)),
      clamp01(q(this.spacers.s3)),
    ]);

    const u = still ? STILL_U : approachProgress(scrollY, viewportH);
    // In the still tier the aircraft belongs to the first screen only
    const present = still ? scrollY < viewportH * 0.6 : aircraftVisible(u);

    const follow = Math.min(1, delta * 5);
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * follow;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * follow;

    return {
      time,
      delta,
      hour,
      night: nightFactor(hour),
      scrollY,
      viewportW,
      viewportH,
      aspect,
      dark: this.dark,
      tier: this.tier,
      u,
      camera: cameraAt(u, aspect),
      aircraft: present ? approachAt(u) : null,
      pointerX: this.pointer.x,
      pointerY: this.pointer.y,
    };
  }

  private apply(frame: Frame): void {
    const targets = this.targets;
    if (!targets) return;
    const sky = skyAt(frame.hour, frame.dark);
    const tanY = Math.tan(frame.camera.fovY / 2);

    const style = targets.sky.style;
    // Five stops of the same vertical gradient the WebGL sky paints, sampled at the angles the screen covers
    for (let i = 0; i < 5; i += 1) {
      const ndcY = 1 - (2 * i) / 4;
      const angle = frame.camera.pitch + Math.atan(ndcY * tanY);
      style.setProperty(`--sky-${i}`, rgbToCss(skyColorAt(sky, angle)));
    }

    const sun = sunDirAt(frame.hour);
    const where = project(
      [sun[0] * 1000, sun[1] * 1000, sun[2] * 1000],
      frame.camera,
      frame.aspect,
    );
    const glow = where.depth > 0 ? sunGlowAt(frame.hour) : 0;
    style.setProperty("--sun-x", `${((where.x * 0.5 + 0.5) * 100).toFixed(2)}%`);
    style.setProperty("--sun-y", `${((0.5 - where.y * 0.5) * 100).toFixed(2)}%`);
    style.setProperty("--sun-o", glow.toFixed(3));
    style.setProperty("--star-o", frame.night.toFixed(3));
    style.setProperty("--cloud", rgbToCss(cloudTintAt(frame.hour)));

    // Once WebGL has drawn a frame it owns the aircraft and the clouds; until then the SVG ones stand in
    if (frame.tier === "full" && this.sceneReady) return;
    this.applyPlane(frame);
    this.applyClouds(frame);
  }

  private applyPlane(frame: Frame): void {
    const { plane, planeFront, planeBelly } = this.targets ?? {};
    if (!plane || !planeFront || !planeBelly) return;
    const pose = frame.aircraft;
    if (!pose) {
      plane.style.opacity = "0";
      return;
    }
    const { camera, aspect, viewportW, viewportH } = frame;
    const tanY = Math.tan(camera.fovY / 2);
    const centre = project(pose.position, camera, aspect);
    if (centre.depth <= 1) {
      plane.style.opacity = "0";
      return;
    }

    const widthPx = (SPAN / pose.distance) * (viewportH / 2 / tanY);
    const x = (centre.x * viewportW) / 2;
    const y = (-centre.y * viewportH) / 2;

    // Seen head-on while the viewer's head is level, from underneath once it tilts back to follow the climb
    const belly = smoothstep((camera.pitch * RAD_TO_DEG - 22) / 22);
    const front = 1 - belly;

    // The belly view points its nose along the aircraft's screen-space heading
    const cosPitch = Math.cos(pose.pitch);
    const ahead = project(
      [
        pose.position[0] + Math.cos(pose.yaw) * cosPitch * 30,
        pose.position[1] + Math.sin(pose.pitch) * 30,
        pose.position[2] - Math.sin(pose.yaw) * cosPitch * 30,
      ],
      camera,
      aspect,
    );
    const heading =
      ahead.depth > 1
        ? Math.atan2((ahead.x - centre.x) * aspect, ahead.y - centre.y) * RAD_TO_DEG
        : 0;

    const fog = fogAt(pose.distance);
    const fade = frame.tier === "off" ? 1 - clamp01(frame.scrollY / (viewportH * 0.6)) : 1;
    plane.style.opacity = (fade * (1 - 0.5 * fog)).toFixed(3);
    plane.style.width = `${((widthPx * SVG_VIEW_SPAN) / SPAN).toFixed(1)}px`;
    plane.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0)`;
    planeFront.style.opacity = front.toFixed(3);
    planeFront.style.transform = `rotate(${(pose.roll * RAD_TO_DEG).toFixed(2)}deg)`;
    planeBelly.style.opacity = belly.toFixed(3);
    planeBelly.style.transform = `rotate(${heading.toFixed(2)}deg)`;
  }

  private applyClouds(frame: Frame): void {
    const clouds = this.targets?.clouds;
    if (!clouds) return;
    clouds.style.setProperty("--cloud", rgbToCss(cloudTintAt(frame.hour)));
    // Hidden until the first positions are written, so clouds never flash stacked in a corner
    clouds.style.opacity = "1";
    const { camera, aspect, viewportW, viewportH } = frame;
    const pixelsPerRadian = viewportH / 2 / Math.tan(camera.fovY / 2);
    const drift = frame.tier === "off" ? 0 : frame.time * 0.004;
    for (const { el, spec } of this.cloudNodes) {
      const azimuth = spec.azimuth + drift;
      const cosEl = Math.cos(spec.elevation);
      const where = project(
        [
          Math.sin(azimuth) * cosEl * 1000,
          Math.sin(spec.elevation) * 1000,
          -Math.cos(azimuth) * cosEl * 1000,
        ],
        camera,
        aspect,
      );
      if (where.depth <= 1) {
        el.style.opacity = "0";
        continue;
      }
      el.style.opacity = String(spec.opacity);
      el.style.width = `${(spec.width * pixelsPerRadian).toFixed(1)}px`;
      el.style.transform = `translate3d(calc(-50% + ${((where.x * viewportW) / 2).toFixed(1)}px), calc(-50% + ${((-where.y * viewportH) / 2).toFixed(1)}px), 0)`;
    }
  }
}
