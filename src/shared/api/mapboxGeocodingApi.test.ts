import { CanceledError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GeocodingError, geocodeAddress } from '@/shared/api/mapboxGeocodingApi'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/shared/api/mapboxClient', () => ({
  mapboxClient: { get: mockGet },
}))

beforeEach(() => {
  mockGet.mockReset()
})

describe('geocodeAddress', () => {
  it('sends the query restricted to Mexico and maps features to candidates', async () => {
    mockGet.mockResolvedValue({
      data: {
        features: [
          {
            id: 'raw-id',
            geometry: { coordinates: [-99.1332, 19.4326] },
            properties: { mapbox_id: 'mb-1', full_address: 'Av. Reforma 100, CDMX' },
          },
        ],
      },
    })

    const result = await geocodeAddress('Av. Reforma 100, CDMX', 'pk.token')

    expect(mockGet).toHaveBeenCalledWith('/search/geocode/v6/forward', {
      params: {
        q: 'Av. Reforma 100, CDMX',
        access_token: 'pk.token',
        country: 'mx',
        language: 'es',
        limit: 5,
      },
    })
    expect(result).toEqual([
      { id: 'mb-1', placeName: 'Av. Reforma 100, CDMX', lat: 19.4326, lng: -99.1332 },
    ])
  })

  it('falls back to place_formatted, then name, when full_address is missing', async () => {
    mockGet.mockResolvedValue({
      data: {
        features: [
          {
            id: 'raw-id',
            geometry: { coordinates: [-99.1, 19.4] },
            properties: { place_formatted: 'Centro, CDMX' },
          },
        ],
      },
    })

    const result = await geocodeAddress('Centro', 'pk.token')

    expect(result[0]?.placeName).toBe('Centro, CDMX')
    expect(result[0]?.id).toBe('raw-id')
  })

  it('resolves to an empty array for a genuine zero-result search', async () => {
    mockGet.mockResolvedValue({ data: { features: [] } })

    const result = await geocodeAddress('dirección inexistente', 'pk.token')

    expect(result).toEqual([])
  })

  it('wraps a network/provider failure in GeocodingError', async () => {
    mockGet.mockRejectedValue(new Error('network down'))

    await expect(geocodeAddress('Av. Reforma 100', 'pk.token')).rejects.toBeInstanceOf(
      GeocodingError,
    )
  })

  it('propagates cancellation unchanged instead of wrapping it', async () => {
    const controller = new AbortController()
    const cancelError = new CanceledError('canceled')
    mockGet.mockRejectedValue(cancelError)

    await expect(
      geocodeAddress('Av. Reforma 100', 'pk.token', controller.signal),
    ).rejects.toBe(cancelError)
  })
})
