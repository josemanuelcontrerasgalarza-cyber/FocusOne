# Dashboard V22

Premium admin dashboard UI built with **React 18** (function components + hooks) and **plain CSS3**.
No UI or chart libraries: icons, avatars, sparklines and the analytics chart are hand-written SVG.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Structure

```
src/
  data.js                 placeholder data (team, KPIs, chart series, projects, activity…)
  index.css               design tokens (CSS variables), glass card, shared animations
  App.jsx / App.css       12-column grid layout + theme state
  lib/curve.js            monotone curve, nice axis scale, number formatting
  components/
    Sidebar               72px rail, glowing active pill, tooltips (bottom bar on phones)
    Topbar                greeting, search, green/blue theme switch, notifications
    HeroTeamCard          headline + 4 team member cards with status and weekly progress
    CalendarCard          month grid, today in accent, event dots, month navigation
    KpiCard + Sparkline   big number, trend badge, animated sparkline
    ChartCard             SVG area/bar chart: Week/Month/Year, hover + keyboard tooltip
    ProjectsCard          thumbnails with animated progress bars
    ActivityList          avatars, messages, timestamps, mark as read
    PromoCard             "Upgrade to Premium" with illustration and glowing CTA
    Avatar, Icon          shared primitives
```

## Theming

Every color is a CSS variable in `src/index.css`. Two themes ship out of the box:

- `data-theme="green"`: white, soft mint `#E8F5EF`, deep green `#0F3D2E`, accent `#3B82F6`
- `data-theme="blue"`: blue & white with a navy rail

Switch from the toggle in the top bar (remembered in `localStorage`), or set
`document.documentElement.dataset.theme = 'blue'`. To add a theme, copy the
`[data-theme='blue']` block and change the values; no component CSS needs editing.

## Interactions

- Cards lift on hover (`translateY(-4px)`, deeper shadow, 250ms ease).
- Staggered fade + slide-up entrance per card (`--i` × 70ms).
- Chart draws in on mount and on range/type change; tooltip by mouse, touch or arrow keys.
- Calendar days have hover and selected states; sidebar icons show tooltips.
- All motion is reduced under `prefers-reduced-motion`.
