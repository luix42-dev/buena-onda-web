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
        // Primary — hot pink / magenta
        'warm-sand':    '#FF2084',
        'terracotta':   '#E01070',
        'burnished':    '#CC0066',
        'dusty-rose':   '#FF2084',
        'deep-umber':   '#AA0055',
        // Secondary — light pink accents
        'sky-steel':    '#FF80BC',
        'hazy-blue':    '#FFB3D1',
        'slate-blue':   '#E05090',
        'pale-sky':     '#FFD6E8',
        // Accent
        'rose-magenta': '#FF2084',
        'warm-blush':   '#FF80BC',
        'linen-peach':  '#FFD6E8',
        // Neutrals — black / white system
        'near-black':   '#0A0A0A',
        'charcoal':     '#1A1A1A',
        'stone-grey':   '#888888',
        'pale-stone':   '#CCCCCC',
        'off-white':    '#F5F5F5',
        'linen-white':  '#FFFFFF',
        'cream':        '#FFFFFF',
        'sand-bg':      '#F0F0F0',
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
