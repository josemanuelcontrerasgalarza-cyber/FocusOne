'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { StarVolume } from './scene/StarVolume'
import { KratosCore } from './scene/KratosCore'

function CameraRig() {
  const { camera } = useThree()
  useFrame((state, dt) => {
    camera.position.x = THREE.MathUtils.damp(camera.position.x, state.pointer.x * 0.4, 2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.4 + state.pointer.y * 0.25, 2, dt)
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function CosmosCanvas() {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 7], fov: 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={({ gl }) => gl.setClearColor('#030308')}
      >
        <AdaptiveDpr pixelated />
        <fog attach="fog" args={['#030308', 14, 34]} />
        <StarVolume />
        <KratosCore position={[0, 0.3, -3]} scale={1.4} />
        <CameraRig />
      </Canvas>
      {/* Viñeta + gradiente para legibilidad del DOM encima */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,3,8,0.55)_100%)]" />
    </div>
  )
}
