import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Miami Synthesis primary palette ──────────────────────────────
        coral: {
          DEFAULT: '#D9685A',
          light:   '#E8927F',
          pale:    '#F2C4BB',
          dark:    '#B84E41',
        },
        teal: {
          DEFAULT: '#2A9D9D',
          light:   '#5ABFBF',
          deep:    '#1A7070',
        },
        // ── Neutrals ─────────────────────────────────────────────────────
        black: {
          DEFAULT: '#0D0D0D',
          warm:    '#161416',
        },
        charcoal: {
          DEFAULT: '#2E2E2E',
          dark:    '#1C1C1C',
        },
        gray: {
          DEFAULT: '#6B6B6B',
          dark:    '#4A4A4A',
          muted:   '#9A9A9A',
          light:   '#C8C8C8',
        },
        // ── Warm backgrounds ─────────────────────────────────────────────
        warm: {
          page:  '#FAF8F5',
          white: '#F5F2ED',
        },
        // ── Neon accents (outline-only on dark backgrounds) ──────────────
        neon: {
          pink: '#FF3C8E',
          blue: '#00D4FF',
        },

        // ── Legacy aliases — keep for admin pages ─────────────────────────
        'warm-sand':    '#C4A87C',   // → coral-pale approx
        'terracotta':   '#D9685A',   // → coral DEFAULT
        'burnished':    '#1A7070',   // → teal-deep
        'dusty-rose':   '#FF3C8E',   // → neon-pink
        'deep-umber':   '#1C1C1C',   // → charcoal-dark
        'near-black':   '#0D0D0D',   // → black DEFAULT
        'stone-grey':   '#6B6B6B',   // → gray DEFAULT
        'pale-stone':   '#C8C8C8',   // → gray-light
        'cream':        '#FAF8F5',   // → warm-page
        'sand-bg':      '#F5F2ED',   // → warm-white
        'linen-white':  '#F5F2ED',   // → warm-white
        'off-white':    '#FAF8F5',   // → warm-page
        'linen-peach':  '#F2C4BB',   // → coral-pale
        'rose-magenta': '#FF3C8E',   // → neon-pink
        'sky-steel':    '#2A9D9D',   // → teal DEFAULT
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Arial Black', 'sans-serif'],
        sans:    ['var(--font-sans)',    '-apple-system', 'sans-serif'],
        serif:   ['var(--font-serif)',   'Georgia', 'serif'],
        // legacy aliases
        body:    ['var(--font-sans)',    '-apple-system', 'sans-serif'],
        mono:    ['var(--font-sans)',    'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'label': ['0.7rem', { letterSpacing: '0.15em', lineHeight: '1' }],
      },
      maxWidth: {
        'content': '72rem',
        'site':    '72rem',
      },
    },
  },
  plugins: [],
}

export default config
