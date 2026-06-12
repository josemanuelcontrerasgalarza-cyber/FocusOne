'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCosmos } from '../state/useCosmos'
import { SNOISE_GLSL } from './snoise'

const vertex = /* glsl */ `
uniform float uTime;
uniform float uTurbulence;
uniform float uVoice;
varying float vDisp;
varying vec3 vNormalW;

${SNOISE_GLSL}

void main() {
  float n = snoise(normal * 2.2 + uTime * 0.35);
  float pulse = snoise(normal * 6.0 + uTime * 2.0) * uVoice;
  float disp = n * (0.06 + uTurbulence * 0.16) + pulse * 0.12;
  vDisp = disp;
  vNormalW = normalize(normalMatrix * normal);
  vec3 p = position + normal * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
varying float vDisp;
varying vec3 vNormalW;

void main() {
  float fresnel = pow(1.0 - abs(dot(vNormalW, vec3(0.0, 0.0, 1.0))), 2.4);
  vec3 base = mix(uColorB * 0.25, uColorA, smoothstep(-0.08, 0.14, vDisp));
  vec3 col = base + fresnel * mix(uColorA, uColorB, 0.5 + 0.5 * sin(uTime * 0.6)) * 1.6;
  gl_FragColor = vec4(col, 0.92);
}
`

const TARGETS = {
  idle: { turb: 0.08, scale: 1.0 },
  listening: { turb: 0.18, scale: 1.06 },
  thinking: { turb: 0.85, scale: 0.96 },
  speaking: { turb: 0.3, scale: 1.1 },
  celebrating: { turb: 1.0, scale: 1.18 },
} as const

function makeHaloTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(94,234,212,0.55)')
  g.addColorStop(0.4, 'rgba(139,92,246,0.20)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export function KratosCore(props: { position?: [number, number, number]; scale?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const mesh = useRef<THREE.Mesh>(null!)
  const halo = useRef<THREE.Sprite>(null!)
  const ringA = useRef<THREE.Mesh>(null!)
  const ringB = useRef<THREE.Mesh>(null!)

  const haloTexture = useMemo(() => makeHaloTexture(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTurbulence: { value: 0.08 },
      uVoice: { value: 0 },
      uColorA: { value: new THREE.Color('#5EEAD4') },
      uColorB: { value: new THREE.Color('#8B5CF6') },
    }),
    [],
  )

  useFrame((_, dt) => {
    const { kratosState, voiceLevel } = useCosmos.getState()
    const t = TARGETS[kratosState]
    const u = mat.current.uniforms
    u.uTime.value += dt
    u.uTurbulence.value = THREE.MathUtils.damp(u.uTurbulence.value, t.turb, 4, dt)
    u.uVoice.value = THREE.MathUtils.damp(u.uVoice.value, voiceLevel, 12, dt)

    const s = THREE.MathUtils.damp(mesh.current.scale.x, t.scale, 4, dt)
    mesh.current.scale.setScalar(s)
    mesh.current.rotation.y += dt * 0.15

    halo.current.scale.setScalar(s * 4.6)
    const haloMat = halo.current.material as THREE.SpriteMaterial
    haloMat.opacity = THREE.MathUtils.damp(
      haloMat.opacity,
      kratosState === 'celebrating' ? 1 : 0.55,
      3,
      dt,
    )

    ringA.current.rotation.z += dt * 0.4
    ringA.current.rotation.x = Math.sin(u.uTime.value * 0.3) * 0.4 + 1.2
    ringB.current.rotation.z -= dt * 0.25
    ringB.current.rotation.x = Math.cos(u.uTime.value * 0.22) * 0.5 + 0.6
  })

  return (
    <group position={props.position ?? [0, 0, 0]} scale={props.scale ?? 1}>
      <sprite ref={halo}>
        <spriteMaterial
          map={haloTexture}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 48]} />
        <shaderMaterial
          ref={mat}
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          uniforms={uniforms}
        />
      </mesh>

      <mesh ref={ringA} rotation={[1.2, 0, 0]}>
        <torusGeometry args={[1.55, 0.012, 8, 96]} />
        <meshBasicMaterial color="#5EEAD4" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ringB} rotation={[0.6, 0, 0]}>
        <torusGeometry args={[1.9, 0.008, 8, 96]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.25} />
      </mesh>
    </group>
  )
}
