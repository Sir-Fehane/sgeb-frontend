export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoBounds {
  sw: GeoPoint
  ne: GeoPoint
}

/** A single-ring GeoJSON `Polygon` Feature — exactly what a Mapbox `geojson` source/`fill`/`line` layer pair consumes directly, no extra adaptation needed at the call site. */
export interface GeoCircleFeature {
  type: 'Feature'
  properties: Record<string, never>
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
}

const EARTH_RADIUS_METERS = 6_371_000
/** 64 points around the ring reads as a smooth circle at every zoom level this feature ever renders at (10-1000 m radii), without generating more GeoJSON than a live-updating map layer needs. */
const CIRCLE_POINTS = 64

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * One point at `bearingRadians`/`distanceMeters` from `center`, via the
 * spherical-earth destination formula (Ed Williams' Aviation Formulary —
 * the same one behind most "point at distance and bearing" implementations,
 * including Turf.js's own `destination`). A spherical model (not the WGS84
 * ellipsoid) introduces at most ~0.3% error, which at SGEB's 10-1000 m
 * geofence radii is sub-3-meter — invisible at both the map's rendered
 * scale and the arrival-radius decision it visualizes — at any latitude,
 * including SGEB's current Mexico operating area.
 */
function destinationPoint(
  center: GeoPoint,
  distanceMeters: number,
  bearingRadians: number,
): GeoPoint {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS
  const lat1 = toRadians(center.lat)
  const lng1 = toRadians(center.lng)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRadians),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )

  return { lat: toDegrees(lat2), lng: toDegrees(lng2) }
}

/**
 * Builds a real geodesic circle (a closed GeoJSON `Polygon` ring) centered
 * exactly on `center`, `radiusMeters` in every direction — never a pixel- or
 * CSS-scaled approximation. `center` is reproduced verbatim as every
 * bearing's origin, so the ring is always centered on the exact coordinate
 * given, not a rounded/projected approximation of it.
 *
 * Deliberately hand-rolled instead of pulling in Turf.js: this is the one
 * geodesic operation this codebase needs (a circle, not general GIS
 * analysis), and the whole implementation is ~15 lines — not enough surface
 * to justify a new dependency (CLAUDE.md: "do not add unnecessary
 * dependencies").
 *
 * Throws on a non-finite or non-positive radius — this function never
 * clamps/normalizes an invalid radius into range itself. The 10-1000 m
 * documented range is `createEventFormSchema`/`editEventFormSchema`'s
 * concern (Zod); this stays a pure geometry primitive that computes exactly
 * what it is given, or refuses to compute anything at all.
 */
export function createGeoCircle(
  center: GeoPoint,
  radiusMeters: number,
): GeoCircleFeature {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new RangeError('radiusMeters must be a finite, positive number.')
  }
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    throw new RangeError('center.lat/center.lng must be finite numbers.')
  }

  const ring: [number, number][] = []
  for (let i = 0; i <= CIRCLE_POINTS; i += 1) {
    const bearing = (i / CIRCLE_POINTS) * 2 * Math.PI
    const point = destinationPoint(center, radiusMeters, bearing)
    ring.push([point.lng, point.lat])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

/** The axis-aligned lng/lat bounding box of a circle's ring — ready to feed a Mapbox `fitBounds` camera. */
export function getGeoCircleBounds(feature: GeoCircleFeature): GeoBounds {
  const ring = feature.geometry.coordinates[0]
  if (!ring || ring.length === 0) {
    throw new RangeError('feature has an empty ring.')
  }

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  return { sw: { lat: minLat, lng: minLng }, ne: { lat: maxLat, lng: maxLng } }
}
