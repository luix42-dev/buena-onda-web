// Single source of truth for site navigation.
// NEXT_PUBLIC_CRUISE_LIVE is inlined at build time: flipping it requires a redeploy.
export const CRUISE_LIVE = process.env.NEXT_PUBLIC_CRUISE_LIVE === 'true'

export type NavLink = { href: string; label: string }

// Where "Radio" lives: the standalone archive today, Cruise once it is live.
export const RADIO_HREF = CRUISE_LIVE ? '/cruise' : '/radio'

const legacyHeaderLinks: NavLink[] = [
  { href: '/',            label: 'Home'        },
  { href: '/about',       label: 'About'       },
  { href: '/events',      label: 'Live Events' },
  { href: '/culture',     label: 'Culture'     },
  { href: '/themes',      label: 'Catalog'     },
  { href: '/radio',       label: 'Radio'       },
  { href: '/cruise',      label: 'Cruise'      },
  { href: '/contact',     label: 'Contact'     },
]

const cruiseHeaderLinks: NavLink[] = [
  { href: '/',            label: 'Home'    },
  { href: '/themes',      label: 'Shop'    },
  { href: '/cruise',      label: 'Radio'   },
  { href: '/culture',     label: 'Culture' },
  { href: '/contact',     label: 'Contact' },
]

const legacyFooterLinks: NavLink[] = [
  { href: '/about',   label: 'About'   },
  { href: '/culture', label: 'Culture' },
  { href: '/themes',  label: 'Catalog' },
  { href: '/radio',   label: 'Radio'   },
  { href: '/search',  label: 'Search'  },
  { href: '/contact', label: 'Contact' },
]

const cruiseFooterLinks: NavLink[] = [
  { href: '/about',   label: 'About'       },
  { href: '/events',  label: 'Live Events' },
  { href: '/culture', label: 'Culture'     },
  { href: '/themes',  label: 'Shop'        },
  { href: '/cruise',  label: 'Radio'       },
  { href: '/search',  label: 'Search'      },
  { href: '/contact', label: 'Contact'     },
]

export const headerLinks: NavLink[] = CRUISE_LIVE ? cruiseHeaderLinks : legacyHeaderLinks
export const footerLinks: NavLink[] = CRUISE_LIVE ? cruiseFooterLinks : legacyFooterLinks
