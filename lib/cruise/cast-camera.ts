/** Public Cruise cameras, including the legacy coastal view used by shortcuts. */
export const CAST_CAMERA_VIEWS = ['low', 'driver', 'director', 'chase'] as const
export type CastCameraView = typeof CAST_CAMERA_VIEWS[number]

export function readCastCamera(value: unknown): CastCameraView | null {
  return typeof value === 'string' && (CAST_CAMERA_VIEWS as readonly string[]).includes(value)
    ? value as CastCameraView : null
}
