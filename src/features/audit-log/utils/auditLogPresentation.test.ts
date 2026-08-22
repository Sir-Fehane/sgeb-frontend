import { describe, expect, it } from 'vitest'

import {
  formatAuditLogAction,
  formatAuditLogEntityType,
} from '@/features/audit-log/utils/auditLogPresentation'

describe('formatAuditLogEntityType', () => {
  it('maps a known tipoEntidad to its Spanish label', () => {
    expect(formatAuditLogEntityType('USUARIO')).toBe('Usuario')
    expect(formatAuditLogEntityType('INVITACION')).toBe('Invitación')
  })

  it('falls back to the raw value for an unrecognized entity type — never throws, never invents a label', () => {
    expect(formatAuditLogEntityType('EVENTO')).toBe('EVENTO')
  })
})

describe('formatAuditLogAction', () => {
  it('maps a known accion to its Spanish label', () => {
    expect(formatAuditLogAction('crear')).toBe('Alta')
    expect(formatAuditLogAction('desactivar')).toBe('Desactivación')
  })

  it('falls back to the raw value for an unrecognized action — defensive against a wire value outside the documented enum', () => {
    expect(formatAuditLogAction('archivar')).toBe('archivar')
  })
})
