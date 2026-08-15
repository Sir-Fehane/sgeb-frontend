/**
 * UI domain types for the live Comanda contract (`docs/decisions.md`
 * ADR-007; `docs/api/openapi-sgeb.yaml`'s `/eventos/{id_evento}/comanda*`
 * paths and `Comanda` schema), confirmed against the pinned backend's
 * `comanda_service.ts`/`comanda_controller.ts`/`comanda_evento.ts`.
 *
 * Deliberately excludes `url`/`expira_en`: those two fields are only ever
 * used ONE-SHOT, immediately at "Abrir comanda" time
 * (`queries/useOpenComandaMutation.ts`) — never cached, never part of the
 * stable metadata this feature reads/displays/invalidates. See
 * `services/comandaApi.ts`'s `mapComandaMetadata` vs `mapComandaAccess`.
 */
export interface ComandaMetadataViewModel {
  idComanda: number
  nombreOriginal: string
  tipoMime: string
  tamanoBytes: number
  activo: boolean
  creadoEn: string
}
