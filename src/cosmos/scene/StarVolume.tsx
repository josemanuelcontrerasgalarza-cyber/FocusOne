'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function makeStarPositions(count: number, spread: number, depth: number) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6
    positions[i * 3 + 2] = depth - Math.random() * 18
  }
  return positions
}

function StarLayer({
  count,
  spread,
  depth,
  size,
  color,
  drift,
}: {
  count: number
  spread: number
  depth: number
  size: number
  color: string
  drift: number
}) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => makeStarPositions(count, spread, depth), [count, spread, depth])

  useFrame((state) => {
    // Parallax sutil con el cursor: capas lejanas se mueven menos
    const px = state.pointer.x * drift
    const py = state.pointer.y * drift * 0.6
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, px, 2, 0.016)
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, py, 2, 0.016)
    ref.current.rotation.z += 0.00012
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export function StarVolume() {
  return (
    <group>
      <StarLayer count={2400} spread={70} depth={-26} size={0.05} color="#8a93c8" drift={0.35} />
      <StarLayer count={1400} spread={55} depth={-18} size={0.07} color="#aeb8e8" drift={0.7} />
      <StarLayer count={600} spread={45} depth={-12} size={0.1} color="#d5dcff" drift={1.1} />
    </group>
  )
}
