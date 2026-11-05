export type CruiseCityVariant = 'district' | 'hybrid' | 'legacy' | 'source'

/** The mapped original City with imported Ocean Drive buildings and streets is the prototype default. */
export function cruiseCityVariant(value: string | null): CruiseCityVariant {
  return value === 'hybrid' || value === 'legacy' || value === 'source' ? value : 'district'
}
