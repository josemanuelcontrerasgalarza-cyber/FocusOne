# FocusOne HORIZON — Rediseño Inmersivo 2035

> Sistema de diseño y arquitectura de experiencia para convertir FocusOne en una
> interfaz holográfica tridimensional: JARVIS × Vision Pro × Linear × Nothing.
> Complementa a `PLAN_MAESTRO.md` (la capa visual de la Fase 1-2).

---

## 1. Auditoría del diseño actual

**Veredicto: competente y genérico. Es "cualquier dashboard de Tailwind de 2023".**

| Dimensión | Estado actual | Problema |
|---|---|---|
| Paleta | Zinc oscuro + violeta `#7C3AED` plano | Es la paleta por defecto de shadcn. Cero identidad. Sin luz, sin atmósfera |
| Profundidad | `bg-surface` sobre `bg-base` + bordes 1px | Profundidad simulada con 3 grises. No hay capas reales, ni luz, ni sombra direccional |
| Movimiento | 2 keyframes (`fadeIn`, `slideIn`), transiciones `ease-out 150ms` | El movimiento no comunica nada: no hay física, ni continuidad espacial, ni jerarquía temporal |
| Tipografía | Inter para todo | Correcta y olvidable. Sin voz tipográfica, sin monospace para datos |
| Componentes | `Card` = caja gris con borde; `Button` = rectángulo violeta | Lenguaje visual de formulario, no de instrumento |
| 3D / WebGL | Inexistente | — |
| Iluminación | Inexistente | Todo es color plano; nada emite, nada refleja |
| Celebración | `toast.success('Tarea creada')` | Completar una misión y rellenar un formulario se sienten idéntico |
| Identidad | El logo es un cuadrado violeta | Nada que recordar, nada que desear |

**Diagnóstico raíz:** el diseño actual trata la productividad como administración.
El rediseño la trata como **pilotar algo**. No se itera sobre esto: se reemplaza el
lenguaje visual completo. Lo único que se conserva es la disciplina de tokens
(Tailwind) y la estructura responsive.

---

## 2. Nuevo sistema visual — "HORIZON"

### 2.1 Concepto

> **Estás dentro del centro de mando de tu propia vida.**
> El fondo es espacio profundo. Los datos flotan en cristal. Kratos es un núcleo
> de energía vivo en el centro. Cada tarea es una misión en órbita.

Tres principios no negociables:

1. **La luz es información.** Nada usa color plano: todo emite, refleja o refracta.
   El estado del sistema (foco, peligro, victoria) se comunica con temperatura y
   dirección de luz, no con badges.
2. **La profundidad es jerarquía.** Lo importante está cerca (grande, nítido,
   brillante); lo secundario está lejos (pequeño, desenfocado, tenue). El eje Z
   sustituye al peso visual.
3. **El movimiento es física.** Nada aparece ni desaparece: entra, sale, orbita o
   se pliega. Springs, no duraciones; continuidad espacial, no cortes.

### 2.2 Tokens

```ts
// packages/ui/tokens.ts
export const horizon = {
  color: {
    // Fondo: negro espacial con tinte azul (nunca #000 puro — aplana el glass)
    void:        '#030308',   // capa más profunda (canvas 3D)
    abyss:       '#06070F',   // fondo DOM
    // Cristal (siempre con alpha — el color real lo da lo que hay detrás)
    glass:       'rgba(16, 18, 32, 0.55)',
    glassBorder: 'rgba(140, 160, 255, 0.14)',
    glassEdge:   'rgba(255, 255, 255, 0.35)', // filo especular superior (1px)
    // Energía (la identidad: cian-eléctrico → violeta-plasma)
    core:        '#5EEAD4',   // cian Kratos — IA, foco activo
    plasma:      '#8B5CF6',   // violeta — progreso, XP
    solar:       '#F59E0B',   // ámbar — advertencia, racha en riesgo
    nova:        '#FB7185',   // rosa-rojo — peligro, abandono
    // Texto
    ink:         '#F2F4FF',
    inkDim:      'rgba(242, 244, 255, 0.55)',
    inkGhost:    'rgba(242, 244, 255, 0.28)',
  },
  glow: {
    core:   '0 0 24px rgba(94, 234, 212, 0.35), 0 0 96px rgba(94, 234, 212, 0.12)',
    plasma: '0 0 24px rgba(139, 92, 246, 0.40), 0 0 96px rgba(139, 92, 246, 0.14)',
  },
  font: {
    display: '"Space Grotesk", sans-serif',   // títulos, números héroe
    body:    '"Inter", sans-serif',           // texto
    data:    '"JetBrains Mono", monospace',   // métricas, timers, coordenadas
  },
  // Capas de profundidad (Z físico, no z-index arbitrario)
  depth: {
    cosmos: -400,  // fondo 3D (estrellas, niebla, nodos lejanos)
    field:  -120,  // objetos 3D medios (constelación de tareas)
    stage:     0,  // paneles de cristal (DOM)
    float:    40,  // elementos elevados (hover, modales)
    kratos:   80,  // el orbe siempre por encima del stage
    overlay: 120,  // command palette, celebraciones
  },
  spring: {
    snappy:  { type: 'spring', stiffness: 480, damping: 32, mass: 0.7 },  // micro
    smooth:  { type: 'spring', stiffness: 200, damping: 26, mass: 1 },    // paneles
    cinema:  { type: 'spring', stiffness: 90,  damping: 20, mass: 1.4 },  // escenas
  },
} as const
```

### 2.3 Material "cristal líquido" (especificación exacta)

El glassmorphism barato mata el rendimiento y se ve a plástico. Receta HORIZON:

```css
.glass-panel {
  background: linear-gradient(135deg, rgba(20,24,44,.62), rgba(10,12,26,.48));
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(140,160,255,.14);
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),   /* filo especular superior */
    inset 0 -1px 0 rgba(0,0,0,.30),        /* peso inferior */
    0 16px 48px rgba(0,0,0,.45);           /* sombra de elevación */
  /* Ruido sutil para matar el banding del blur */
  background-blend-mode: overlay;
}
```

Reglas duras: **máximo 6 superficies con `backdrop-filter` visibles a la vez**
(presupuesto de GPU); el blur nunca anima — lo que anima es `transform`/`opacity`
del panel; el "líquido" lo aporta una luz especular que sigue al cursor (gradiente
radial en una pseudo-capa, solo `transform`).

### 2.4 Movimiento (lenguaje cinematográfico)

| Evento | Coreografía |
|---|---|
| Cambio de página | La cámara 3D del fondo *viaja* (dolly + leve roll); los paneles salientes se pliegan hacia atrás en Z, los entrantes emergen desde `depth.float` con stagger de 40ms |
| Hover en panel | Tilt 3D ≤ 4° hacia el cursor + la luz especular se desplaza + sombra se profundiza |
| Completar misión | El nodo colapsa → pulso de onda expansiva desde el nodo → partículas viajan hasta la barra de XP → la barra absorbe y destella |
| Kratos habla | El orbe se acerca 20% (dolly-in), el resto de la UI baja brillo 30% y se desenfoca levemente: *cinematic focus pull* |
| Subir de nivel | Slow-motion 0.4×, burst de partículas full-screen (canvas overlay), acorde de luz violeta→cian, número de nivel en `font.display` 120px |

---

## 3. Arquitectura UI (híbrida DOM + WebGL)

**Decisión central: la UI legible vive en el DOM; la atmósfera y los objetos héroe
viven en un único canvas WebGL/WebGPU detrás (y un overlay encima para celebraciones).**
Renderizar texto/inputs en WebGL es un error: pierdes accesibilidad, i18n, selección
y nitidez. Vision Pro hace exactamente esto: contenido 2D nítido flotando en un
entorno 3D.

```
┌─ <CelebrationCanvas>  (z: overlay, frameloop solo durante eventos) ─┐
│ ┌─ DOM: paneles de cristal, texto, formularios (z: stage/float) ──┐ │
│ │  Framer Motion (layout, springs) · tilt por cursor              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─ <CosmosCanvas> fixed, 100vw/100vh (z: cosmos) ─────────────────┐ │
│ │  R3F: estrellas + niebla + nodos + KRATOS + constelaciones      │ │
│ │  Una sola escena, una cámara; cada "página" = posición de       │ │
│ │  cámara (GSAP timeline) — el mundo es continuo, no se desmonta  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- **Un solo `<Canvas>` persistente** montado en el layout raíz de Next.js. Las rutas
  cambian el contenido DOM y *animan la cámara*; la escena nunca se desmonta (cero
  re-compilación de shaders, transiciones continuas).
- **Puente DOM↔3D:** store Zustand `useCosmos` (fuera de React state para datos
  por-frame: refs mutables). El DOM publica intents (`kratos.state = 'speaking'`,
  `camera.goTo('stats')`); la escena los consume en `useFrame`.
- **WebGPU first:** `WebGPURenderer` de three (TSL para shaders) con detección y
  fallback automático a WebGL2. Los materiales custom se escriben en TSL donde sea
  posible (compila a WGSL y GLSL); los GLSL legacy se mantienen para el fallback.

---

## 4. Componentes necesarios

### Núcleo 3D (escena)
| Componente | Descripción |
|---|---|
| `<CosmosCanvas>` | Canvas raíz: renderer WebGPU/WebGL, cámara, gestor de calidad, postprocesado |
| `<KratosCore>` | El orbe: icosaedro con displacement de ruido + fresnel + halo + anillos de energía + partículas orbitales. 5 estados: `idle · listening · thinking · speaking · celebrating` |
| `<StarVolume>` | 6.000 estrellas instanciadas en 3 capas de parallax + niebla volumétrica falsa (planos con ruido) |
| `<TaskConstellation>` | Cada proyecto = constelación; cada tarea = nodo (InstancedMesh); dependencias = líneas de energía con flujo animado (shader de dash desplazado) |
| `<MissionPlanet>` | Vista de proyecto: planeta central (progreso = terminator día/noche) con tareas en órbita |
| `<ProgressRing3D>` | Toro con shader de arco + glow para métricas héroe |
| `<CelebrationBurst>` | Sistema de partículas GPU (10k, simulación en shader) para completados/level-up |

### Cristal (DOM)
| Componente | Descripción |
|---|---|
| `<GlassPanel>` | Superficie base: glass + filo especular + tilt + luz que sigue al cursor |
| `<HoloStat>` | Métrica héroe: número en `font.data` con odómetro animado + sparkline + glow |
| `<MissionCard>` | Tarea como ficha de misión: rango de prioridad (insignia), riesgo de abandono (anillo `nova`), botón "INICIAR" |
| `<FocusHUD>` | HUD de sesión deep work: timer monumental, intención, forma de Kratos minimizada, métricas vivas |
| `<XPBar>` | Barra segmentada con flujo de plasma (gradiente animado por `background-position`) |
| `<CommandDeck>` | ⌘K palette estilo JARVIS: input + respuesta de Kratos en streaming |
| `<LevelUpOverlay>` | Toma de celebración full-screen (monta `<CelebrationBurst>`) |
| `<AchievementSigil>` | Logro como sello holográfico giratorio (CSS 3D, no WebGL) |

---

## 5. Librerías recomendadas

| Paquete | Rol | Nota |
|---|---|---|
| `three` (r17x+) | Motor 3D | Incluye `three/webgpu` + TSL |
| `@react-three/fiber` v9 | React renderer | Compatible React 19 |
| `@react-three/drei` | Helpers | `Instances`, `Line`, `Billboard`, `AdaptiveDpr`, `PerformanceMonitor`, `Preload` |
| `@react-three/postprocessing` | Bloom, vignette, ChromaticAberration | **Solo** estos 3 efectos; presupuesto cerrado |
| `maath` | Easing/ruido/random para `useFrame` | |
| `framer-motion` (motion) v12 | Springs y layout DOM | Todo el movimiento DOM |
| `gsap` + `@gsap/react` | Timelines de cámara y secuencias cinematográficas | Núcleo gratuito es suficiente |
| `lenis` | Smooth scroll con momentum | Sincronizado con parallax del cosmos |
| `zustand` | Puente DOM↔3D + estado UI | Ya está en el proyecto |
| `r3f-perf`, `leva` | Medición y tuning (solo dev) | |
| **NO usar** | `react-spring/three` (duplicaría física), partículas via CPU, más de un canvas persistente, librerías de glassmorphism | |

---

## 6. Estructura de carpetas (sobre el monorepo del PLAN_MAESTRO)

```
apps/web/src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # monta <CosmosCanvas> persistente + providers
│   └── (deck)/               # rutas: dashboard, missions, stats, focus...
├── cosmos/                   # TODO el mundo 3D
│   ├── CosmosCanvas.tsx
│   ├── scene/                # KratosCore, StarVolume, TaskConstellation...
│   ├── shaders/              # *.glsl + *.tsl.ts (pares WebGL/WebGPU)
│   ├── cameras/              # rig + waypoints por ruta + timelines GSAP
│   ├── state/                # useCosmos (zustand, refs mutables por-frame)
│   └── quality/              # QualityManager, tiers, device probe
├── glass/                    # sistema de componentes DOM (GlassPanel, HUD...)
│   ├── primitives/
│   ├── widgets/
│   └── celebrations/
├── motion/                   # springs, variants, coreografías compartidas
└── styles/                   # tokens.css (variables), glass.css, noise.png
packages/ui/                  # tokens + primitivas compartidas
```

---

## 7. Código de ejemplo

### 7.1 KratosCore — el orbe vivo (R3F + GLSL)

```tsx
// cosmos/scene/KratosCore.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCosmos } from '../state/useCosmos'

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uTurbulence;   // 0 idle → 1 thinking
  uniform float uVoice;        // amplitud de voz 0..1 (analizador de audio)
  varying float vDisp;
  varying vec3 vNormalW;

  // simplex noise 3D (Ashima) — omitido por brevedad: snoise(vec3)
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
  uniform vec3 uColorA;   // core  #5EEAD4
  uniform vec3 uColorB;   // plasma #8B5CF6
  uniform float uTime;
  varying float vDisp;
  varying vec3 vNormalW;

  void main() {
    // Fresnel: el borde brilla, el centro es profundo
    float fresnel = pow(1.0 - abs(dot(vNormalW, vec3(0.0, 0.0, 1.0))), 2.4);
    vec3 base = mix(uColorB * 0.25, uColorA, smoothstep(-0.08, 0.14, vDisp));
    vec3 col = base + fresnel * mix(uColorA, uColorB, 0.5 + 0.5 * sin(uTime * 0.6)) * 1.6;
    gl_FragColor = vec4(col, 0.92);   // el bloom del postprocesado hace el halo
  }
`

const TARGETS = {       // turbulence, voice-boost, escala
  idle:        { turb: 0.08, scale: 1.00 },
  listening:   { turb: 0.18, scale: 1.06 },
  thinking:    { turb: 0.85, scale: 0.96 },
  speaking:    { turb: 0.30, scale: 1.10 },
  celebrating: { turb: 1.00, scale: 1.18 },
} as const

export function KratosCore() {
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const mesh = useRef<THREE.Mesh>(null!)

  useFrame((_, dt) => {
    const { kratosState, voiceLevel } = useCosmos.getState()  // sin re-render
    const t = TARGETS[kratosState]
    const u = mat.current.uniforms
    u.uTime.value += dt
    // damping exponencial: transiciones de estado siempre suaves
    u.uTurbulence.value = THREE.MathUtils.damp(u.uTurbulence.value, t.turb, 4, dt)
    u.uVoice.value      = THREE.MathUtils.damp(u.uVoice.value, voiceLevel, 12, dt)
    const s = THREE.MathUtils.damp(mesh.current.scale.x, t.scale, 4, dt)
    mesh.current.scale.setScalar(s)
    mesh.current.rotation.y += dt * 0.15
  })

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 64]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        uniforms={{
          uTime: { value: 0 },
          uTurbulence: { value: 0.08 },
          uVoice: { value: 0 },
          uColorA: { value: new THREE.Color('#5EEAD4') },
          uColorB: { value: new THREE.Color('#8B5CF6') },
        }}
      />
    </mesh>
  )
}
```

### 7.2 Canvas raíz con gestión de calidad y WebGPU

```tsx
// cosmos/CosmosCanvas.tsx
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { WebGPURenderer } from 'three/webgpu'
import { useState } from 'react'
import { useCosmos } from './state/useCosmos'

export function CosmosCanvas({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<2 | 1 | 0>(2)   // 2=ultra 1=high 0=lite

  return (
    <Canvas
      className="fixed inset-0 -z-10"
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 7], fov: 42 }}
      gl={async (props) => {                        // WebGPU con fallback automático
        const renderer = new WebGPURenderer({ ...props, antialias: true })
        await renderer.init()
        return renderer
      }}
      frameloop={useCosmos((s) => s.active ? 'always' : 'demand')}
    >
      <PerformanceMonitor
        onDecline={() => setTier((t) => Math.max(0, t - 1) as 0 | 1)}
        onIncline={() => setTier((t) => Math.min(2, t + 1) as 1 | 2)}
      >
        <AdaptiveDpr pixelated />
        {children}
        {tier >= 1 && (
          <EffectComposer multisampling={tier === 2 ? 4 : 0}>
            <Bloom intensity={0.9} luminanceThreshold={0.7} mipmapBlur />
            <Vignette darkness={0.55} offset={0.3} />
          </EffectComposer>
        )}
        <Preload all />
      </PerformanceMonitor>
    </Canvas>
  )
}
```

### 7.3 GlassPanel con tilt y luz especular (DOM, 120 FPS-safe)

```tsx
// glass/primitives/GlassPanel.tsx
'use client'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { horizon } from '@focusone/ui/tokens'

export function GlassPanel({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  // Solo transform/opacity: todo corre en el compositor, nunca en main thread
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 300, damping: 30 })
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), { stiffness: 300, damping: 30 })
  const lightX = useTransform(mx, (v) => `${v * 100}%`)
  const lightY = useTransform(my, (v) => `${v * 100}%`)

  return (
    <motion.div
      className={`glass-panel relative overflow-hidden will-change-transform ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width)
        my.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5) }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={horizon.spring.smooth}
    >
      {/* luz especular que sigue al cursor — capa propia, GPU-only */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-60"
        style={{
          background: 'radial-gradient(420px circle at var(--lx) var(--ly), rgba(140,160,255,.10), transparent 65%)',
          '--lx': lightX, '--ly': lightY,
        } as React.CSSProperties}
      />
      {children}
    </motion.div>
  )
}
```

### 7.4 Constelación de tareas (instancing — 1 draw call para 500 nodos)

```tsx
// cosmos/scene/TaskConstellation.tsx
import { Instances, Instance, Line } from '@react-three/drei'

export function TaskConstellation({ nodes, links }: ConstellationData) {
  return (
    <group position={[0, 0, horizonDepth.field]}>
      <Instances limit={500}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
        {nodes.map((n) => (
          <Instance
            key={n.id}
            position={n.position}
            scale={n.done ? 0.7 : 1 + n.priorityWeight}
            color={n.done ? '#3b3f5c' : n.risk > 0.6 ? '#FB7185' : '#5EEAD4'}
          />
        ))}
      </Instances>
      {links.map((l) => (
        <Line key={l.id} points={[l.from, l.to]} lineWidth={1}
              color="#8B5CF6" transparent opacity={0.35} dashed dashScale={8} />
      ))}
    </group>
  )
}
```

---

## 8. Roadmap de implementación

> Prerrequisito: shell Next.js del PLAN_MAESTRO (Fase 1, semanas 1-2). HORIZON se
> construye encima, en paralelo a partir de la semana 2.

**Sprint H1 (sem. 2-3) — Fundación.** Tokens + fuentes + `glass.css`. `<CosmosCanvas>`
con `StarVolume` y rig de cámara. `<GlassPanel>`, `<HoloStat>`, `<XPBar>`. Quality
Manager con 3 tiers. *Gate: 60 FPS en un portátil integrado tier-1.*

**Sprint H2 (sem. 3-4) — Kratos + Dashboard.** `<KratosCore>` con 5 estados y
reactividad a voz (AnalyserNode → `voiceLevel`). Dashboard holográfico: orbe central,
paneles orbitando en grid, transiciones de cámara entre rutas (GSAP waypoints).
`<CommandDeck>` (⌘K). *Gate: transición de página completa < 600ms percibidos, sin jank.*

**Sprint H3 (sem. 4-6) — Misiones + Gamificación.** `<TaskConstellation>` y
`<MissionPlanet>` con datos reales. `<MissionCard>` + `<FocusHUD>` (modo deep work
cinematográfico). `<CelebrationBurst>` GPU + `<LevelUpOverlay>` + `<AchievementSigil>`.
*Gate: completar tarea → celebración a 60+ FPS con la escena de fondo activa.*

**Sprint H4 (sem. 6-7) — Pulido y degradación.** Modo `lite` (tier 0) completo y
`prefers-reduced-motion`. Mobile: cosmos estático renderizado a textura, glass
reducido. Auditoría Lighthouse + WebGL en gama media Android. Easter eggs de Kratos.
*Gate: Lighthouse Performance > 85 en móvil con tier 0.*

---

## 9. Estrategia de rendimiento

**Presupuestos cerrados (se hace CI visual de esto, no opiniones):**

| Recurso | Presupuesto |
|---|---|
| Draw calls de la escena | ≤ 60 (instancing obligatorio para nodos/partículas) |
| Triángulos visibles | ≤ 350k (orbe 64-sub ≈ 80k es el mayor consumidor) |
| Superficies con `backdrop-filter` | ≤ 6 simultáneas |
| Postprocesado | Bloom + Vignette (+ ChromaticAberration solo en celebraciones) |
| JS por frame (main thread) | ≤ 3 ms (las animaciones DOM van al compositor) |
| Carga: chunk del cosmos | Lazy + `next/dynamic`; primer paint es DOM puro con gradiente estático que el canvas reemplaza con crossfade |

**Tácticas clave:**
1. **Cero React en el hot path:** los datos por-frame (cursor, voz, scroll, estado de
   Kratos) viajan por refs/Zustand `getState()`, jamás por props/state → cero
   re-renders a 120 Hz.
2. **`frameloop="demand"` cuando la escena está en reposo** (sin Kratos activo ni
   transición): el cosmos invalida solo con scroll/cursor. Batería y térmica.
3. **Instancing + materiales compartidos:** constelaciones y partículas en
   `InstancedMesh`; las celebraciones simulan posición en el vertex shader (GPU),
   no en JS.
4. **Texturas y geometría:** KTX2/basis para cualquier textura, `IcosahedronGeometry`
   generada (cero descargas de modelos), Draco solo si entra un GLB.
5. **DOM disciplinado:** solo `transform` y `opacity` animan; `will-change` quirúrgico;
   `content-visibility: auto` en listas largas; Lenis para scroll suave sin reflow.

## 10. Plan para mantener 60–120 FPS

**Sistema de tiers (automático, medido, reversible):**

| Tier | Activación | Configuración |
|---|---|---|
| **2 — Ultra (120 FPS)** | Pantallas ProMotion/144Hz + GPU dedicada (probe inicial + `PerformanceMonitor` estable) | DPR 2, MSAA 4×, bloom mipmap, 6k estrellas, partículas 10k, blur 20px |
| **1 — High (60 FPS)** | Por defecto | DPR ≤ 1.5, sin MSAA, 3k estrellas, partículas 4k, blur 16px |
| **0 — Lite (60 FPS garantizado)** | Móvil gama media, `PerformanceMonitor.onDecline` ×2, batería < 20%, `prefers-reduced-motion` | Cosmos congelado (1 frame a textura), orbe en CSS (gradiente cónico animado), glass sin blur (color sólido translúcido), springs → fades 150ms |

**Reglas de medición y guardia:**
- `r3f-perf` + overlay de FPS en dev; trazas de Performance API en prod (p95 de
  frame time por tier, enviado a PostHog).
- **Regla del frame:** a 120 Hz hay 8.3 ms; objetivo ≤ 6 ms de GPU y ≤ 3 ms de main
  thread. Cualquier feature nueva debe declarar su coste y caber en el presupuesto
  o degradarse por tier.
- El degradado **nunca** elimina información, solo espectáculo: tier 0 conserva el
  100% de la funcionalidad, jerarquía y estados — pierde blur, partículas y 3D vivo.
- `prefers-reduced-motion` es sagrado: sin parallax, sin orbe pulsante, sin
  celebraciones de pantalla completa; feedback por color y opacidad.

---

### Cierre

El diseño actual administra tareas. HORIZON las convierte en un mundo: Kratos en el
centro, tus misiones en órbita, tu progreso como luz. Nada de esto es decoración —
profundidad = jerarquía, luz = estado, movimiento = causalidad. Esa es la diferencia
entre un dashboard con efectos y una interfaz de 2035.
