"use client";

import { useMemo } from "react";
import { ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Layered value noise in deep blues and violets, with a few bright veins: mostly dark,
// so the stage view declares a light cursor ink.
const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 p = vUv * vec2(6.0, 4.0);
    float n = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      n += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    vec3 deep = vec3(0.03, 0.04, 0.12);
    vec3 violet = vec3(0.22, 0.10, 0.40);
    vec3 vein = vec3(0.35, 0.62, 0.95);
    vec3 color = mix(deep, violet, smoothstep(0.3, 0.7, n));
    color = mix(color, vein, smoothstep(0.72, 0.8, n) * 0.6);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** A full-view plane of WebGL noise: the cursor playground's "3D" background. Static. */
export default function NoisePlane() {
  const material = useMemo(() => new ShaderMaterial({ vertexShader, fragmentShader, depthTest: false }), []);
  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
