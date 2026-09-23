import type Stripe from 'stripe'

// Published policy (items page): "Free Delivery — Miami & Surroundings",
// "delivered by our team in Miami". Stripe only restricts by country, so the
// default is US; the delivery radius is enforced by a human in the studio.
const DEFAULT_COUNTRIES = ['US']

export function shippingCountries(): Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] {
  const configured = (process.env.SHIPPING_ALLOWED_COUNTRIES ?? '')
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter(code => /^[A-Z]{2}$/.test(code))
  return (configured.length ? configured : DEFAULT_COUNTRIES) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[]
}

export type ShippingAddress = {
  name: string | null
  phone: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

type ShippingDetailsLike = {
  name?: string | null
  phone?: string | null
  address?: Partial<Record<'line1' | 'line2' | 'city' | 'state' | 'postal_code' | 'country', string | null>> | null
} | null | undefined

/** Works for the pinned API version (shipping_details) and newer ones (collected_information). */
export function shippingFromSession(session: unknown): ShippingAddress | null {
  const s = session as {
    shipping_details?: ShippingDetailsLike
    collected_information?: { shipping_details?: ShippingDetailsLike } | null
    customer_details?: { phone?: string | null } | null
  }
  const details = s.shipping_details ?? s.collected_information?.shipping_details ?? null
  if (!details?.address?.line1) return null
  const a = details.address
  return {
    name: details.name ?? null,
    phone: details.phone ?? s.customer_details?.phone ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postal_code: a.postal_code ?? null,
    country: a.country ?? null,
  }
}

export function formatShippingLines(address: ShippingAddress): string[] {
  return [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line && line.trim()))
}
