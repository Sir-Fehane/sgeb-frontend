/**
 * Standalone (not part of `mapbox-map.tsx`) specifically so it can be
 * imported without pulling in that module's eager `mapbox-gl` runtime
 * import — `EventGeofenceMapPreview`'s "Centrar en salón" control needs
 * this same check but must stay lazy-load-safe (see that file's own
 * comment on why `mapbox-gl` is never imported outside `React.lazy`).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
