import nextConfig from 'eslint-config-next'

export default [
  ...nextConfig,
  {
    rules: {
      // Reglas de React Compiler (eslint-plugin-react-hooks v7) recién llegadas
      // a `next/core-web-vitals`. Se revisaron todos los casos que marcan en
      // este repo y son patrones intencionales, no bugs: reset de estado
      // optimista local al refrescar props del servidor (RewardsStore,
      // WeeklyDrops, PetStudio, ForgeCommand), hidratación desde localStorage
      // tras el mount (useDailyGoal) y mutación imperativa de la cámara de
      // react-three-fiber dentro de useFrame (CosmosCanvas), que es el patrón
      // estándar de r3f. Se bajan a warning en vez de silenciarlas: quedan
      // visibles para revisión futura sin bloquear el build por falsos
      // positivos de una regla experimental.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]
