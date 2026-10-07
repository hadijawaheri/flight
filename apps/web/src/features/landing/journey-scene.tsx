"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { buildAirliner } from "./airliner";
import { FOG_DENSITY } from "./approach-model";
import type { Frame, JourneyEngine } from "./journey-engine";
import {
  cloudTintAt,
  lerp,
  type Rgb,
  skyAt,
  skyColorAt,
  type SkyColors,
  srgbToLinear,
  sunDirAt,
  sunGlowAt,
  sunLightAt,
} from "./journey-model";
import { demoteTier } from "./journey-tier";
import { ENV_FRAGMENT, SKY_FRAGMENT, SKY_VERTEX } from "./sky-shader";

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software/i;
const COVER = 0.44;

const asVector = (color: Rgb): THREE.Vector3 => new THREE.Vector3(color[0], color[1], color[2]);

function skyUniforms() {
  return {
    uZenith: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Vector3() },
    uHaze: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Vector3(1, 1, 1) },
    uSunGlow: { value: 1 },
  };
}

function setSkyUniforms(
  uniforms: ReturnType<typeof skyUniforms>,
  sky: SkyColors,
  hour: number,
): void {
  uniforms.uZenith.value.copy(asVector(srgbToLinear(sky.zenith)));
  uniforms.uHorizon.value.copy(asVector(srgbToLinear(sky.horizon)));
  uniforms.uHaze.value.copy(asVector(srgbToLinear(sky.haze)));
  const sun = sunDirAt(hour);
  uniforms.uSunDir.value.set(sun[0], sun[1], sun[2]);
  uniforms.uSunColor.value.copy(asVector(srgbToLinear(sunLightAt(hour).color)));
  uniforms.uSunGlow.value = sunGlowAt(hour);
}

/** The WebGL half of the flight: a physically lit airliner against a sky with real clouds, drawn from the engine's frames. */
export function JourneyScene({ engine }: { engine: JourneyEngine }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      demoteTier("lite");
      return;
    }

    // Software rendering is too slow to scroll with; the SVG aircraft is the better experience there
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const gpuName = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (SOFTWARE_RENDERER.test(gpuName)) {
      renderer.dispose();
      demoteTier("lite");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    let pixelRatio = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(pixelRatio);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, FOG_DENSITY);
    const camera = new THREE.PerspectiveCamera(34, 1, 1, 30000);
    camera.rotation.order = "YXZ";

    // The sky: one dome that follows the camera, painted by a shader (gradient, sun, cirrus, cumulus, stars)
    const skyUniform = {
      ...skyUniforms(),
      uCloudLit: { value: new THREE.Vector3(1, 1, 1) },
      uCloudShade: { value: new THREE.Vector3(0.6, 0.65, 0.8) },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uCover: { value: COVER },
    };
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyUniform,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const skyGeometry = new THREE.SphereGeometry(9000, 48, 32);
    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    skyDome.frustumCulled = false;
    skyDome.renderOrder = -10;
    scene.add(skyDome);

    // Image-based light: the same sky, painted into a small environment map, so the paint and the
    // glass reflect the actual sky and the belly picks up light bounced from below
    const envUniform = skyUniforms();
    const envMaterial = new THREE.ShaderMaterial({
      uniforms: envUniform,
      vertexShader: SKY_VERTEX,
      fragmentShader: ENV_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    const envGeometry = new THREE.SphereGeometry(50, 32, 16);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(envGeometry, envMaterial));
    const pmrem = new THREE.PMREMGenerator(renderer);
    let environment: THREE.WebGLRenderTarget | null = null;
    let envHour = Number.NaN;
    let envDark: boolean | null = null;
    const refreshEnvironment = (sky: SkyColors, hour: number, dark: boolean): void => {
      if (envDark === dark && Math.abs(envHour - hour) < 0.12) return;
      setSkyUniforms(envUniform, sky, hour);
      const next = pmrem.fromScene(envScene, 0.02);
      environment?.dispose();
      environment = next;
      scene.environment = next.texture;
      envHour = hour;
      envDark = dark;
    };

    const sun = new THREE.DirectionalLight(0xffffff, 3);
    const fill = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3);
    scene.add(sun, fill);

    const airliner = buildAirliner(renderer.capabilities.getMaxAnisotropy());
    scene.add(airliner.root);

    let aspect = 1;
    const resize = (): void => {
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const onContextLost = (event: Event): void => {
      event.preventDefault();
      demoteTier("lite");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    let frames = 0;
    let slow = 0;
    let stage = 0;

    // If the phone cannot hold ~30fps, first drop to a 1x canvas, then give up and use the SVG aircraft
    const govern = (delta: number): void => {
      frames += 1;
      if (frames < 40) return;
      slow = delta > 0.036 ? slow + 1 : Math.max(0, slow - 1);
      if (slow < 45) return;
      slow = 0;
      if (stage === 0) {
        stage = 1;
        pixelRatio = 1;
        resize();
      } else {
        demoteTier("lite");
      }
    };

    let fov = 0;
    let ready = false;
    const linear = new THREE.Color();
    const draw = (frame: Frame): void => {
      const sky = skyAt(frame.hour, frame.dark);
      // Only the aircraft reflects the environment, so it is only repainted while the aircraft is in view
      if (frame.aircraft || environment === null) refreshEnvironment(sky, frame.hour, frame.dark);

      // Camera: the viewer's head follows the aircraft, with a whisper of pointer parallax
      const fovDegrees = (frame.camera.fovY * 180) / Math.PI;
      if (Math.abs(fovDegrees - fov) > 0.001 || camera.aspect !== aspect) {
        fov = fovDegrees;
        camera.fov = fovDegrees;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      camera.rotation.set(
        frame.camera.pitch - frame.pointerY * 0.006,
        frame.camera.yaw - frame.pointerX * 0.01,
        0,
      );

      // Sky
      setSkyUniforms(skyUniform, sky, frame.hour);
      const tint = srgbToLinear(cloudTintAt(frame.hour));
      skyUniform.uCloudLit.value.copy(asVector(tint));
      skyUniform.uCloudShade.value.set(tint[0] * 0.58, tint[1] * 0.64, tint[2] * 0.82);
      skyUniform.uNight.value = frame.night;
      skyUniform.uTime.value = frame.time;

      // Light
      const light = sunLightAt(frame.hour);
      linear.setRGB(
        light.color[0] / 255,
        light.color[1] / 255,
        light.color[2] / 255,
        THREE.SRGBColorSpace,
      );
      sun.color.copy(linear);
      sun.intensity = light.intensity;
      const dir = sunDirAt(frame.hour);
      sun.position.set(dir[0] * 200, dir[1] * 200, dir[2] * 200);
      linear.setRGB(
        sky.zenith[0] / 255,
        sky.zenith[1] / 255,
        sky.zenith[2] / 255,
        THREE.SRGBColorSpace,
      );
      fill.color.copy(linear);
      linear.setRGB(sky.haze[0] / 255, sky.haze[1] / 255, sky.haze[2] / 255, THREE.SRGBColorSpace);
      fill.groundColor.copy(linear);
      fill.intensity = lerp(0.3, 0.12, frame.night);
      scene.environmentIntensity = lerp(1, 0.55, frame.night);
      renderer.toneMappingExposure = lerp(1, 0.9, frame.night);

      // Aircraft
      const pose = frame.aircraft;
      if (pose) {
        airliner.root.visible = true;
        airliner.root.position.set(pose.position[0], pose.position[1], pose.position[2]);
        const sway = Math.min(1, 220 / pose.distance);
        airliner.root.rotation.set(
          pose.roll + Math.sin(frame.time * 0.7) * 0.012 * sway,
          pose.yaw,
          pose.pitch + Math.sin(frame.time * 1.1) * 0.004 * sway,
        );
        const elevation = Math.atan2(pose.position[1], -pose.position[2]);
        // The haze in front of the aircraft must be the colour of the sky behind it
        const haze = srgbToLinear(skyColorAt(sky, elevation));
        scene.fog?.color.setRGB(haze[0], haze[1], haze[2], THREE.LinearSRGBColorSpace);
        airliner.update({
          time: frame.time,
          delta: frame.delta,
          night: frame.night,
          distance: pose.distance,
          pixelsPerMetre: frame.viewportH / (2 * Math.tan(frame.camera.fovY / 2)),
        });
      } else {
        airliner.root.visible = false;
      }
      engine.setContinuous(pose !== null);

      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        engine.setSceneReady(true);
      }
      govern(frame.delta);
    };

    engine.setSceneReady(false);
    const unsubscribe = engine.subscribe(draw);

    return () => {
      unsubscribe();
      engine.setContinuous(false);
      engine.setSceneReady(false);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      airliner.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
      envGeometry.dispose();
      envMaterial.dispose();
      environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [engine]);

  return <canvas ref={canvasRef} className="absolute inset-0 block size-full" aria-hidden="true" />;
}
