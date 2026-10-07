import * as THREE from "three";

// The livery is an illustration of a fictional airline, so its colours are fixed rather than theme tokens.
const PAINT = "#f1f3f6";
const BELLY = "#cdd3db";
const NAVY = "#1b3b8f";
const AMBER = "#f2a31b";

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2d canvas is unavailable");
  return [canvas, context];
}

function finish(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  colorSpace: boolean,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * The fuselage paint, mapped nose (left) to tail (right) and round the body (up). Starboard is
 * at v 0.25, the keel at 0.5 and port at 0.75, so everything is drawn once and mirrored.
 */
export function liveryTexture(anisotropy: number): THREE.CanvasTexture {
  const width = 2048;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const x = (u: number): number => u * width;
  // flipY puts v = 0 at the bottom of the image
  const y = (v: number): number => (1 - v) * height;

  ctx.fillStyle = PAINT;
  ctx.fillRect(0, 0, width, height);

  // The belly is a shade darker where it has never seen the sun, with soft edges
  const belly = ctx.createLinearGradient(0, y(0.66), 0, y(0.34));
  belly.addColorStop(0, "rgba(205,211,219,0)");
  belly.addColorStop(0.22, BELLY);
  belly.addColorStop(0.78, BELLY);
  belly.addColorStop(1, "rgba(205,211,219,0)");
  ctx.fillStyle = belly;
  ctx.fillRect(0, y(0.66), width, y(0.34) - y(0.66));

  // Panel seams: barrel joins round the body, fore-and-aft seams along it
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(40,50,70,0.11)";
  for (let u = 0.045; u < 1; u += 0.0475) {
    ctx.beginPath();
    ctx.moveTo(x(u), 0);
    ctx.lineTo(x(u), height);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(40,50,70,0.08)";
  for (const v of [0.125, 0.375, 0.625, 0.875]) {
    ctx.beginPath();
    ctx.moveTo(0, y(v));
    ctx.lineTo(width, y(v));
    ctx.stroke();
  }

  for (const side of [0, 1]) {
    const m = (v: number): number => (side === 0 ? v : 1 - v);

    // The cheat line under the windows, with a thin amber line beneath it
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(x(0.045), y(m(0.268)));
    ctx.lineTo(x(0.07), y(m(0.292)));
    ctx.lineTo(x(0.86), y(m(0.292)));
    ctx.lineTo(x(0.95), y(m(0.31)));
    ctx.lineTo(x(0.95), y(m(0.252)));
    ctx.lineTo(x(0.86), y(m(0.262)));
    ctx.lineTo(x(0.07), y(m(0.262)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = AMBER;
    ctx.fillRect(x(0.07), y(m(0.3)), x(0.8), Math.abs(y(m(0.296)) - y(m(0.3))) + 1.5);

    // Door outlines
    ctx.strokeStyle = "rgba(40,50,70,0.5)";
    ctx.lineWidth = 2;
    for (const [u0, u1] of [
      [0.1, 0.119],
      [0.605, 0.628],
    ] as const) {
      ctx.strokeRect(
        x(u0),
        Math.min(y(m(0.205)), y(m(0.315))),
        x(u1) - x(u0),
        Math.abs(y(m(0.315)) - y(m(0.205))),
      );
    }
  }

  // Fine grain, so a large flat white area does not look like a plastic render
  for (let i = 0; i < 9000; i += 1) {
    const a = 0.015 + Math.random() * 0.03;
    ctx.fillStyle = `rgba(60,70,90,${a.toFixed(3)})`;
    ctx.fillRect(
      Math.random() * width,
      Math.random() * height,
      1 + Math.random() * 2,
      1 + Math.random() * 3,
    );
  }

  return finish(canvas, anisotropy, true);
}

/** Fan blades seen from the front: swept blades round a pale spinner. v runs round, so offset.y spins it. */
export function fanTexture(anisotropy: number): THREE.CanvasTexture {
  const width = 128;
  const height = 512;
  const [canvas, ctx] = makeCanvas(width, height);
  const image = ctx.createImageData(width, height);
  const blades = 24;
  const smooth = (edge0: number, edge1: number, value: number): number => {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const t = col / (width - 1);
      const angle = row / height;
      const phase = (((angle * blades + t * 1.7) % 1) + 1) % 1;
      const blade = smooth(0, 0.1, phase) * (1 - smooth(0.46, 0.6, phase));
      const sheen = 0.55 + 0.45 * Math.sin(phase * Math.PI);
      let value = 20 + blade * (95 + 55 * sheen);
      if (t < 0.22) value = 150 + 50 * (1 - t / 0.22);
      else if (t < 0.26) value = 70;
      if (t > 0.96) value = 38;
      const index = (row * width + col) * 4;
      image.data[index] = value;
      image.data[index + 1] = value + 2;
      image.data[index + 2] = value + 6;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = finish(canvas, anisotropy, true);
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A soft round glow for navigation lights, strobes and the landing lights. */
export function glowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return finish(canvas, 1, true);
}
