// Placeholder data for Dashboard V22. Swap these objects for real API data.

export const user = {
  name: 'Daniel Reyes',
  firstName: 'Daniel',
  role: 'Head of Product',
  hue: 158,
}

export const navItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'messages', label: 'Messages', icon: 'message', badge: 3 },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export const hero = {
  eyebrow: 'Team workspace',
  before: 'Work is always ',
  highlight: 'better',
  after: ' together',
  subtitle: 'Four people shipped 23 tasks this week. Sprint 14 closes in 3 days.',
}

// status: online | away | busy | offline
export const team = [
  { id: 1, name: 'Ava Thompson', role: 'Product Designer', status: 'online', hue: 158, done: 8, goal: 10 },
  { id: 2, name: 'Marcus Lee', role: 'Frontend Engineer', status: 'busy', hue: 214, done: 6, goal: 8 },
  { id: 3, name: 'Sofia Martín', role: 'Data Analyst', status: 'away', hue: 32, done: 4, goal: 9 },
  { id: 4, name: 'Kenji Watanabe', role: 'Backend Engineer', status: 'online', hue: 268, done: 5, goal: 6 },
]

export const calendar = {
  // Month shown first (0-based month index). Today is highlighted when it falls in view.
  year: 2026,
  month: 10,
  events: {
    '2026-11-03': 'Sprint planning',
    '2026-11-07': 'Design review',
    '2026-11-12': 'Quarterly sync',
    '2026-11-18': 'Release 4.2',
    '2026-11-24': 'Customer demo',
    '2026-11-27': 'Retro',
  },
}

export const kpis = [
  {
    id: 'conversion',
    label: 'Conversion rate',
    value: '57.3%',
    delta: 12,
    note: 'vs. last month',
    series: [31, 34, 33, 38, 41, 39, 44, 47, 46, 51, 54, 57],
  },
  {
    id: 'users',
    label: 'Active users',
    value: '1,284',
    delta: 8,
    note: 'vs. last week',
    series: [920, 980, 1010, 990, 1060, 1110, 1090, 1150, 1170, 1230, 1210, 1284],
  },
  {
    id: 'revenue',
    label: 'Monthly revenue',
    value: '$24.8k',
    delta: -3,
    note: 'vs. last month',
    series: [27.1, 26.4, 26.9, 25.8, 26.2, 25.1, 25.6, 24.9, 25.3, 24.4, 24.9, 24.8],
  },
]

export const analytics = {
  title: 'Analytics',
  metric: 'Sessions',
  ranges: {
    week: {
      label: 'Week',
      total: '18,420',
      delta: 14.2,
      points: [
        { label: 'Mon', value: 2140 },
        { label: 'Tue', value: 2680 },
        { label: 'Wed', value: 2390 },
        { label: 'Thu', value: 3120 },
        { label: 'Fri', value: 2860 },
        { label: 'Sat', value: 2210 },
        { label: 'Sun', value: 3020 },
      ],
    },
    month: {
      label: 'Month',
      total: '72,800',
      delta: 9.6,
      points: [
        { label: 'Week 1', value: 15400 },
        { label: 'Week 2', value: 18900 },
        { label: 'Week 3', value: 17200 },
        { label: 'Week 4', value: 21300 },
      ],
    },
    year: {
      label: 'Year',
      total: '842k',
      delta: 22.8,
      points: [
        { label: 'Jan', value: 52 },
        { label: 'Feb', value: 58 },
        { label: 'Mar', value: 61 },
        { label: 'Apr', value: 57 },
        { label: 'May', value: 66 },
        { label: 'Jun', value: 72 },
        { label: 'Jul', value: 69 },
        { label: 'Aug', value: 75 },
        { label: 'Sep', value: 81 },
        { label: 'Oct', value: 78 },
        { label: 'Nov', value: 86 },
        { label: 'Dec', value: 87 },
      ],
      unit: 'k',
    },
  },
}

export const projects = [
  {
    id: 1,
    title: 'Onboarding walkthrough',
    meta: '12 videos · updated 2h ago',
    progress: 82,
    art: 'mint',
    icon: 'play',
  },
  {
    id: 2,
    title: 'Mobile app redesign',
    meta: '8 screens · updated yesterday',
    progress: 56,
    art: 'blue',
    icon: 'layers',
  },
  {
    id: 3,
    title: 'Q4 brand campaign',
    meta: '5 videos · updated 3d ago',
    progress: 34,
    art: 'peach',
    icon: 'video',
  },
]

export const activity = [
  { id: 1, who: 'Ava Thompson', hue: 158, text: 'commented on Mobile app redesign', time: '4 min ago', unread: true },
  { id: 2, who: 'Marcus Lee', hue: 214, text: 'merged “Checkout v3” into main', time: '28 min ago', unread: true },
  { id: 3, who: 'Sofia Martín', hue: 32, text: 'shared the October retention report', time: '1 h ago' },
  { id: 4, who: 'Kenji Watanabe', hue: 268, text: 'moved API rate limits to Done', time: '3 h ago' },
  { id: 5, who: 'Lena Fischer', hue: 340, text: 'joined the Growth workspace', time: 'Yesterday' },
]

export const promo = {
  title: 'Upgrade to Premium',
  text: 'Unlimited projects, advanced analytics and priority support for your whole team.',
  features: ['Unlimited workspaces', 'Real-time analytics', 'Priority support'],
  price: '$18',
  period: '/ seat / month',
  cta: 'Upgrade now',
}
