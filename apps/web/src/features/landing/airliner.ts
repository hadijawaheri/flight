import * as THREE from "three";

import {
  buildAirlinerGeometry,
  type LightKind,
  type MeshData,
  type PartName,
} from "./airliner-geometry";
import { fanTexture, glowTexture, liveryTexture } from "./airliner-textures";

export interface AirlinerFrame {
  time: number;
  delta: number;
  /** 0 in daylight, 1 at night. */
  night: number;
  /** Metres from the viewer. */
  distance: number;
  /** How many pixels one metre covers at a distance of one metre. */
  pixelsPerMetre: number;
}

export interface Airliner {
  root: THREE.Group;
  update: (frame: AirlinerFrame) => void;
  dispose: () => void;
}

function toGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(mesh.uvs, 2));
  geometry.setIndex(mesh.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

interface LightStyle {
  color: number;
  /** World size in metres when close. */
  size: number;
  /** Never smaller than this on screen, so the lights still read from far away. */
  minPixels: number;
}

const LIGHT_STYLES: Record<LightKind, LightStyle> = {
  red: { color: 0xff2a1a, size: 0.5, minPixels: 6 },
  green: { color: 0x2bff6a, size: 0.5, minPixels: 6 },
  white: { color: 0xffffff, size: 0.5, minPixels: 6 },
  strobe: { color: 0xffffff, size: 1.1, minPixels: 12 },
  landing: { color: 0xfff1d6, size: 2.6, minPixels: 18 },
  beacon: { color: 0xff2418, size: 0.9, minPixels: 8 },
};

const pulse = (phase: number, centre: number, width: number): number =>
  Math.exp(-(((phase - centre) / width) ** 2));

function lightLevel(kind: LightKind, time: number, night: number, offset: number): number {
  switch (kind) {
    case "red":
    case "green":
    case "white":
      return 0.45 + 0.55 * night;
    case "landing":
      return 0.8 + 0.2 * night;
    case "strobe": {
      const phase = (time + offset) % 1.25;
      return (pulse(phase, 0.05, 0.025) + pulse(phase, 0.24, 0.025)) * (0.75 + 0.25 * night);
    }
    case "beacon":
      return pulse((time + offset) % 1.5, 0.1, 0.07) * (0.7 + 0.3 * night);
  }
}

/** A narrow-body twin-jet built from lofted geometry, painted and lit like a real aircraft. */
export function buildAirliner(anisotropy: number): Airliner {
  const geometry = buildAirlinerGeometry();
  const livery = liveryTexture(anisotropy);
  const fan = fanTexture(anisotropy);
  const glow = glowTexture();

  const paint = new THREE.MeshPhysicalMaterial({
    map: livery,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.7,
    clearcoatRoughness: 0.16,
  });
  const materials: Record<PartName, THREE.Material> = {
    fuselage: paint,
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x06090f,
      roughness: 0.04,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    }),
    wing: new THREE.MeshPhysicalMaterial({
      color: 0xdde1e8,
      roughness: 0.5,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
    }),
    tail: new THREE.MeshPhysicalMaterial({
      color: 0xe4e7ec,
      roughness: 0.5,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
    }),
    fin: new THREE.MeshPhysicalMaterial({
      color: 0x1b3b8f,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    }),
    nacelle: new THREE.MeshPhysicalMaterial({
      color: 0xeceff3,
      roughness: 0.36,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
    }),
    lip: new THREE.MeshStandardMaterial({
      color: 0xd8dde4,
      roughness: 0.22,
      metalness: 1,
      side: THREE.DoubleSide,
    }),
    duct: new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.85,
      metalness: 0.3,
      side: THREE.DoubleSide,
    }),
    fan: new THREE.MeshStandardMaterial({
      map: fan,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.6,
      side: THREE.DoubleSide,
    }),
    nozzle: new THREE.MeshStandardMaterial({
      color: 0x4a4d54,
      roughness: 0.45,
      metalness: 0.8,
      side: THREE.DoubleSide,
    }),
  };

  // Roll is x, yaw is y and pitch is z in this order, which is how the flight path is written
  const root = new THREE.Group();
  root.rotation.order = "YZX";

  const geometries: THREE.BufferGeometry[] = [];
  for (const part of geometry.parts) {
    const buffer = toGeometry(part.mesh);
    geometries.push(buffer);
    root.add(new THREE.Mesh(buffer, materials[part.name]));
  }

  const sprites = geometry.lights.map((spot, index) => {
    const style = LIGHT_STYLES[spot.kind];
    const material = new THREE.SpriteMaterial({
      map: glow,
      color: style.color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(spot.position[0], spot.position[1], spot.position[2]);
    root.add(sprite);
    return { sprite, material, style, kind: spot.kind, offset: index * 0.17 };
  });

  const update = (frame: AirlinerFrame): void => {
    fan.offset.y = (fan.offset.y + frame.delta * 0.5) % 1;
    const worldPerPixel = frame.distance > 0 ? 1 / (frame.pixelsPerMetre / frame.distance) : 1;
    for (const light of sprites) {
      const size = Math.max(light.style.size, light.style.minPixels * worldPerPixel * 0.5);
      light.sprite.scale.set(size, size, 1);
      light.material.opacity = Math.min(
        1,
        lightLevel(light.kind, frame.time, frame.night, light.offset),
      );
    }
  };

  const dispose = (): void => {
    geometries.forEach((buffer) => buffer.dispose());
    Object.values(materials).forEach((material) => material.dispose());
    sprites.forEach((light) => light.material.dispose());
    livery.dispose();
    fan.dispose();
    glow.dispose();
  };

  return { root, update, dispose };
}
