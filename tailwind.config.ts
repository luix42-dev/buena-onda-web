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
        // Primary palette
        'warm-sand':    '#C0A880',
        'terracotta':   '#A88860',
        'burnished':    '#786048',
        'dusty-rose':   '#906060',
        'deep-umber':   '#604830',
        // Secondary palette
        'sky-steel':    '#90A8C0',
        'hazy-blue':    '#A8C0D8',
        'slate-blue':   '#7890A8',
        'pale-sky':     '#C0D8E8',
        // Accent palette
        'rose-magenta': '#BE5582',
        'warm-blush':   '#A87860',
        'linen-peach':  '#E8C0A8',
        // Neutrals
        'near-black':   '#202020',
        'charcoal':     '#606060',
        'stone-grey':   '#A0A0A0',
        'pale-stone':   '#E0E0E0',
        'off-white':    '#F8F8F8',
        'linen-white':  '#F5F0E8',
        'cream':        '#FAF6F0',
        'sand-bg':      '#F2ECE2',
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
        'site': '1120px',
      },
      spacing: {
        'section': 'clamp(3rem, 8vw, 6rem)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'scan':       'scan 1s ease forwards',
        'fade-up':    'fadeUp 0.6s ease forwards',
      },
      keyframes: {
        scan: {
          '0%':   { clipPath: 'inset(0 0 100% 0)' },
          '100%': { clipPath: 'inset(0 0 0% 0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'analog': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
}

export default config
