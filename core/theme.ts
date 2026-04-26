// Design tokens — single source of truth for all colors, spacing, and type
// Dark mode primary. All modules must read from here, never hardcode values.

export const colors = {
  // Backgrounds
  bg:       '#0F0F0F',
  surface:  '#1C1C1E',
  surface2: '#2A2A2A',
  border:   'rgba(255,255,255,0.07)',

  // Semantic
  primary:  '#6C63FF',
  success:  '#30D158',
  warning:  '#FFD60A',
  danger:   '#FF453A',

  // Text
  text:      '#F5F5F5',
  textMuted: '#636366',

  // Module accents
  workout:    '#6C63FF',
  diet:       '#30D158',
  water:      '#64D2FF',
  budget:     '#FFD60A',
  organizer:  '#2DD4BF',
  notes:      '#FB923C',
  calendar:   '#60A5FA',
  people:     '#FF6B9D',
  reminders:  '#FF453A',
} as const

// Importance tier colors (Organizer module)
export const tierColors = {
  veryImportant:  '#A855F7',
  family:         '#EF4444',
  closeFriends:   '#EAB308',
  friends:        '#22C55E',
  acquaintances:  '#6B7280',
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

// Border radius
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  full: 9999,
} as const

// Minimum tap target (48px per UI principles)
export const minTapTarget = 48
