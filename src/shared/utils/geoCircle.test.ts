import { describe, expect, it } from 'vitest'

import {
  createGeoCircle,
  getGeoCircleBounds,
  type GeoPoint,
} from '@/shared/utils/geoCircle'

const EARTH_RADIUS_METERS = 6_371_000

/**
 * Independent haversine (inverse) distance check — `createGeoCircle` itself
 * uses the forward destination formula, so verifying its output against the
 * inverse formula is a genuine geometric cross-check, not a
 * tautological "does it match its own implementation" test.
 */
function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

// Torreón, Coahuila — the same neutral SGEB-relevant Mexico coordinate
// `SalonLocationPicker` defaults to.
const TORREON: GeoPoint = { lat: 25.5428, lng: -103.4068 }

describe('createGeoCircle', () => {
  it.each([10, 150, 1000])(
    'generates a ring whose points sit %d m from the center (within a fraction of a meter)',
    (radiusMeters) => {
      const circle = createGeoCircle(TORREON, radiusMeters)
      const ring = circle.geometry.coordinates[0]!

      for (const [lng, lat] of ring) {
        const distance = haversineDistanceMeters(TORREON, { lat, lng })
        expect(distance).toBeGreaterThan(radiusMeters - 0.5)
        expect(distance).toBeLessThan(radiusMeters + 0.5)
      }
    },
  )

  it('keeps the exact center coordinate as the origin — never rounds or projects it', () => {
    const center: GeoPoint = { lat: 25.542812345, lng: -103.406812345 }
    const circle = createGeoCircle(center, 150)
    const ring = circle.geometry.coordinates[0]!

    // Every point is equidistant from the EXACT given center, not a rounded
    // approximation of it — a shifted center would break this tolerance.
    for (const [lng, lat] of ring) {
      expect(haversineDistanceMeters(center, { lat, lng })).toBeCloseTo(150, 0)
    }
  })

  it('returns a closed ring (first point equals last point)', () => {
    const circle = createGeoCircle(TORREON, 150)
    const ring = circle.geometry.coordinates[0]!

    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('generates enough points for a visually smooth circle', () => {
    const circle = createGeoCircle(TORREON, 150)
    expect(circle.geometry.coordinates[0]!.length).toBeGreaterThanOrEqual(32)
  })

  it('behaves correctly at other SGEB-relevant Mexico latitudes (e.g. CDMX, ~19°N)', () => {
    const cdmx: GeoPoint = { lat: 19.4326, lng: -99.1332 }
    const circle = createGeoCircle(cdmx, 500)
    const ring = circle.geometry.coordinates[0]!

    for (const [lng, lat] of ring) {
      expect(haversineDistanceMeters(cdmx, { lat, lng })).toBeCloseTo(500, 0)
    }
  })

  it('is deterministic — the same center/radius always produces the same ring', () => {
    const first = createGeoCircle(TORREON, 150)
    const second = createGeoCircle(TORREON, 150)
    expect(first).toEqual(second)
  })

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws for an invalid radius (%s) instead of silently normalizing it',
    (invalidRadius) => {
      expect(() => createGeoCircle(TORREON, invalidRadius)).toThrow(RangeError)
    },
  )

  it('never clamps an out-of-documented-range radius into 10-1000 — that stays the form schema’s job', () => {
    // 1500 m is outside `createEventFormSchema`'s 10-1000 m range, but this
    // is a pure geometry primitive: it must compute exactly what it's
    // given, never silently reinterpret it as 1000.
    const circle = createGeoCircle(TORREON, 1500)
    const ring = circle.geometry.coordinates[0]!
    expect(
      haversineDistanceMeters(TORREON, { lat: ring[0]![1], lng: ring[0]![0] }),
    ).toBeCloseTo(1500, 0)
  })

  it('throws for a non-finite center coordinate', () => {
    expect(() => createGeoCircle({ lat: Number.NaN, lng: -103.4068 }, 150)).toThrow(
      RangeError,
    )
  })
})

describe('getGeoCircleBounds', () => {
  it('returns a bounding box that encompasses every ring point', () => {
    const circle = createGeoCircle(TORREON, 150)
    const bounds = getGeoCircleBounds(circle)
    const ring = circle.geometry.coordinates[0]!

    for (const [lng, lat] of ring) {
      expect(lat).toBeGreaterThanOrEqual(bounds.sw.lat)
      expect(lat).toBeLessThanOrEqual(bounds.ne.lat)
      expect(lng).toBeGreaterThanOrEqual(bounds.sw.lng)
      expect(lng).toBeLessThanOrEqual(bounds.ne.lng)
    }
  })

  it('centers the bounding box on the circle center', () => {
    const circle = createGeoCircle(TORREON, 300)
    const bounds = getGeoCircleBounds(circle)

    expect((bounds.sw.lat + bounds.ne.lat) / 2).toBeCloseTo(TORREON.lat, 3)
    expect((bounds.sw.lng + bounds.ne.lng) / 2).toBeCloseTo(TORREON.lng, 3)
  })

  it('grows with the radius', () => {
    const smallBounds = getGeoCircleBounds(createGeoCircle(TORREON, 10))
    const largeBounds = getGeoCircleBounds(createGeoCircle(TORREON, 1000))

    const smallSpan = smallBounds.ne.lat - smallBounds.sw.lat
    const largeSpan = largeBounds.ne.lat - largeBounds.sw.lat
    expect(largeSpan).toBeGreaterThan(smallSpan)
  })
})
