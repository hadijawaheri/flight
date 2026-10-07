/**
 * GLSL for the landing sky. The gradient curve in `skyBase` is the same one `skyColorAt` evaluates in
 * journey-model.ts: the fog on the aircraft and the CSS fallback read the JS copy, so the two
 * must stay in step. Colours are linear; the shader converts to sRGB itself because the sky
 * material is not tone-mapped (the aircraft is, and its fog is blended after tone mapping).
 */

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm5(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    sum += amp * noise2(p);
    p = turn * p;
    amp *= 0.5;
  }
  return sum;
}

float fbm3(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) {
    sum += amp * noise2(p);
    p = turn * p;
    amp *= 0.5;
  }
  return sum;
}
`;

const SKY_BASE = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;

vec3 skyBase(float up) {
  vec3 base = up >= 0.0
    ? mix(uHorizon, uZenith, pow(clamp(up, 0.0, 1.0), 0.45))
    : mix(uHorizon, uHaze, smoothstep(0.0, 1.0, clamp(-up / 0.25, 0.0, 1.0)));
  return mix(base, uHaze, 0.5 * exp(-abs(up) * 12.0));
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
`;

export const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAGMENT = /* glsl */ `
${SKY_BASE}
${NOISE}
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uSunGlow;
uniform float uNight;
uniform float uTime;
uniform float uCover;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float up = d.y;
  vec3 col = skyBase(up);

  // Sun, or the moon at night: a wide scattering halo, a tight aureole and a hard core
  float cs = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunGlow * (0.20 * pow(cs, 5.0) + 0.45 * pow(cs, 48.0) + 16.0 * pow(cs, 2400.0));

  float fade = smoothstep(0.02, 0.22, up);
  float cloudAlpha = 0.0;
  if (up > 0.02) {
    vec2 wind = vec2(uTime * 0.0035, uTime * 0.0012);
    vec2 sunXZ = normalize(uSunDir.xz + vec2(0.0001));

    // Thin high cirrus, stretched along the wind
    vec2 hi = d.xz / (up + 0.14) * vec2(0.34, 1.1) + wind * 0.6 + vec2(3.7, 1.3);
    float cirrus = smoothstep(0.46, 0.9, fbm3(hi)) * 0.38 * fade;
    col = mix(col, uCloudLit, cirrus * (1.0 - 0.5 * uNight));

    // Fair-weather cumulus on a flat base, lit from the side the sun is on
    vec2 p = d.xz / (up + 0.1) * 0.78 + wind;
    float n = fbm5(p);
    float body = smoothstep(uCover, uCover + 0.2, n);
    float toward = fbm5(p + sunXZ * 0.07);
    float shade = clamp(0.5 + (n - toward) * 4.5, 0.0, 1.0);
    float rim = body * (1.0 - smoothstep(0.35, 0.95, body));
    vec3 cloud = mix(uCloudLit, uCloudShade, shade * 0.85 * smoothstep(0.1, 1.0, body));
    cloud += uCloudLit * rim * 0.35;
    cloudAlpha = body * fade * 0.92;
    col = mix(col, cloud, cloudAlpha);
  }

  // Stars, only in a dark sky and only where no cloud covers them
  if (uNight > 0.01 && up > 0.0) {
    vec3 cell = floor(d * 170.0);
    float h = hash31(cell);
    vec3 local = fract(d * 170.0) - 0.5;
    float spark = smoothstep(0.3, 0.0, length(local)) * step(0.9935, h);
    float tw = 0.7 + 0.3 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
    col += vec3(0.85, 0.9, 1.0) * spark * tw * uNight * (1.0 - cloudAlpha) * smoothstep(0.0, 0.12, up);
  }

  // A touch of noise keeps the long, soft gradient from banding on 8-bit displays
  float dither = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(toSrgb(col) + dither, 1.0);
}
`;

/** The same sky without clouds or stars, but with an HDR sun, painted into the environment map. */
export const ENV_FRAGMENT = /* glsl */ `
${SKY_BASE}
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunGlow;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyBase(d.y);
  // Below the horizon the ground and cloud tops bounce light back up at the belly of the aircraft
  col = mix(col, uHaze * 0.9, smoothstep(0.0, 0.4, -d.y) * 0.6);
  float cs = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunGlow * (0.3 * pow(cs, 6.0) + 2.0 * pow(cs, 60.0) + 40.0 * pow(cs, 1200.0));
  gl_FragColor = vec4(col, 1.0);
}
`;
