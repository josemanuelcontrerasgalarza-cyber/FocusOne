/**
 * Animaciones de entrada de los gráficos. React 19 eleva y deduplica este
 * <style> (mismo `href`), así que cada gráfico puede incluirlo sin coste.
 * Con `prefers-reduced-motion` no hay animación (aquí y en la regla global).
 */
const CSS = `
@keyframes kchart-grow-y{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes kchart-grow-x{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.kchart-grow-y{transform-box:fill-box;transform-origin:50% 100%;animation:kchart-grow-y 560ms cubic-bezier(.16,1,.3,1) both}
.kchart-grow-x{transform-origin:0 50%;animation:kchart-grow-x 560ms cubic-bezier(.16,1,.3,1) both}
@media (prefers-reduced-motion: reduce){.kchart-grow-y,.kchart-grow-x{animation:none}}
`

export function ChartStyles() {
  return (
    <style href="kairo-charts" precedence="medium">
      {CSS}
    </style>
  )
}
