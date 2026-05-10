// Design tokens — single source of truth for all colors, spacing, and type
// Rustic-futuristic dark theme. All modules must read from here, never hardcode values.

export const colors = {
  // Backgrounds — forge charcoal family
  bg:       '#14110d',
  surface:  '#1d1812',
  surface2: '#251f17',
  border:   '#2e2619',

  // Border accents
  borderAccent: '#6e5a3d',
  borderHero:   '#b08a55',

  // Semantic
  primary:  '#b08a55',   // worn brass — primary actions
  success:  '#8fa860',   // moss copper
  warning:  '#d4a574',   // raw brass
  danger:   '#c4452a',   // oxidized iron

  // Text — parchment family
  text:      '#ede0c8',
  textMuted: '#b09e7d',

  // Module accents
  workout:    '#d97a4a',   // forge orange
  diet:       '#8fa860',   // moss copper
  water:      '#6ba0aa',   // verdigris
  budget:     '#d4a574',   // raw brass
  organizer:  '#9b8ab8',   // faded violet
  notes:      '#d49a4a',   // amber
  calendar:   '#6ba0aa',   // verdigris (reuse water)
  people:     '#c46a6a',   // rust red
  reminders:  '#c4452a',   // oxidized iron (reuse danger)
  checklist:  '#9b8ab8',   // faded violet (reuse organizer)
  steps:      '#d4a574',   // raw brass (reuse warning)
} as const

// Importance tier colors (Organizer module) — mapped to rustic palette
export const tierColors = {
  veryImportant:  '#9b8ab8',   // faded violet
  family:         '#c46a6a',   // rust red
  closeFriends:   '#d4a574',   // raw brass
  friends:        '#8fa860',   // moss copper
  acquaintances:  '#6b5a47',   // dark brass/brown
} as const

// Typography scale
export const fontSize = {
  screenTitle:    24,
  sectionHeader:  18,
  cardTitle:      16,
  body:           14,
  label:          12,
  micro:          11,
} as const

export const fontWeight = {
  screenTitle:   '700',
  sectionHeader: '600',
  cardTitle:     '600',
  body:          '400',
  label:         '400',
  micro:         '400',
} as const

// Spacing (4-pt grid)
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

// Border radius — sharper, industrial feel
export const radius = {
  sm:   4,
  md:   8,
  lg:   8,
  full: 9999,
} as const

// Minimum tap target (48px per UI principles)
export const minTapTarget = 48

// Font families — Space Grotesk (UI) + JetBrains Mono (data/numbers)
export const fonts = {
  ui:   'SpaceGrotesk',
  mono: 'JetBrainsMono',
} as const
