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
        // Primary accent — warm analog
        'warm-sand':    '#C4A87C',
        'terracotta':   '#C4724A',
        'burnished':    '#8B6848',
        'dusty-rose':   '#C85A7C',
        'deep-umber':   '#3D2B1F',
        // Neutrals — warm
        'near-black':   '#1A1A18',
        'charcoal':     '#4A4A48',
        'stone-grey':   '#9A9590',
        'pale-stone':   '#D8D2C8',
        // Backgrounds — cream / sand
        'cream':        '#FAF6F0',
        'sand-bg':      '#F2ECE2',
        'linen-white':  '#F5F0E8',
        'off-white':    '#FFFDF8',
        'linen-peach':  '#EDE0D0',
        // Legacy aliases (keep for admin pages)
        'rose-magenta': '#C4724A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
        body:    ['var(--font-body)', '-apple-system', 'sans-serif'],
        mono:    ['var(--font-mono)', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'label': ['0.7rem', { letterSpacing: '0.15em', lineHeight: '1' }],
      },
      maxWidth: {
        'content': '72rem',
      },
    },
  },
  plugins: [],
}

export default config
