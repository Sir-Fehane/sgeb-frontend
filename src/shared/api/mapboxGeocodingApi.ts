import axios from 'axios'

import { mapboxClient } from '@/shared/api/mapboxClient'

/** One resolved candidate location for a searched address. */
export interface GeocodingCandidate {
  id: string
  /** Human-readable formatted address, for a result list the user can pick from. */
  placeName: string
  lat: number
  lng: number
}

/** Thrown for a network/provider failure — never for a zero-result search, which resolves to `[]` instead (see `geocodeAddress`). */
export class GeocodingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeocodingError'
  }
}

interface MapboxForwardGeocodeFeature {
  id: string
  geometry: {
    coordinates: [number, number]
  }
  properties: {
    mapbox_id?: string
    full_address?: string
    name?: string
    place_formatted?: string
  }
}

interface MapboxForwardGeocodeResponse {
  features: MapboxForwardGeocodeFeature[]
}

const RESULT_LIMIT = 5

function toCandidate(feature: MapboxForwardGeocodeFeature): GeocodingCandidate {
  const [lng, lat] = feature.geometry.coordinates
  return {
    id: feature.properties.mapbox_id ?? feature.id,
    placeName:
      feature.properties.full_address ??
      feature.properties.place_formatted ??
      feature.properties.name ??
      `${String(lat)}, ${String(lng)}`,
    lat,
    lng,
  }
}

/**
 * Forward-geocodes a free-text address through Mapbox's Geocoding API v6,
 * restricted to Mexico (`country=mx`) — every SGEB salón address is
 * Mexican (`docs/data/Diccionario_Datos_Dominio.md`'s discrete
 * `calle/cp/colonia/ciudad/estado` fields). Returns an empty array for a
 * genuine zero-result search — that is a normal outcome the caller should
 * present as "sin resultados", not an error. Only rejects (with
 * `GeocodingError`) for an actual network/provider failure, and never for
 * an aborted request (the original cancellation propagates unchanged, same
 * contract as `requestSgeb`).
 */
export async function geocodeAddress(
  query: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<GeocodingCandidate[]> {
  try {
    const response = await mapboxClient.get<MapboxForwardGeocodeResponse>(
      '/search/geocode/v6/forward',
      {
        params: {
          q: query,
          access_token: accessToken,
          country: 'mx',
          language: 'es',
          limit: RESULT_LIMIT,
        },
        ...(signal ? { signal } : {}),
      },
    )
    return response.data.features.map(toCandidate)
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error
    }
    throw new GeocodingError('No se pudo buscar la ubicación. Intenta de nuevo.')
  }
}
