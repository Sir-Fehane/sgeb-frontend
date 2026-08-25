/** Deterministic TanStack Query keys for the account feature. No params — `GET /usuarios/me`/`GET /usuarios/me/datos-bancarios` both resolve the subject from the JWT, never from an argument (see `services/usuariosApi.ts`). */
export const accountQueryKeys = {
  all: ['account'] as const,
  miPerfil: () => [...accountQueryKeys.all, 'mi-perfil'] as const,
  misDatosBancarios: () => [...accountQueryKeys.all, 'mis-datos-bancarios'] as const,
}
