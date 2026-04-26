/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './core/**/*.{js,jsx,ts,tsx}',
    './modules/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       '#0F0F0F',
        surface:  '#1C1C1E',
        surface2: '#2A2A2A',
        primary:  '#6C63FF',
        success:  '#30D158',
        warning:  '#FFD60A',
        danger:   '#FF453A',
        text:     '#F5F5F5',
        muted:    '#636366',
        // Module accents
        workout:   '#6C63FF',
        diet:      '#30D158',
        water:     '#64D2FF',
        budget:    '#FFD60A',
        organizer: '#2DD4BF',
        notes:     '#FB923C',
        cal:       '#60A5FA',
        people:    '#FF6B9D',
        reminders: '#FF453A',
      },
      fontSize: {
        'screen-title':    ['24px', { fontWeight: '700' }],
        'section-header':  ['18px', { fontWeight: '600' }],
        'card-title':      ['16px', { fontWeight: '600' }],
        'body':            ['14px', { fontWeight: '400' }],
        'label':           ['12px', { fontWeight: '400' }],
        'micro':           ['11px', { fontWeight: '400' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      minHeight: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};
