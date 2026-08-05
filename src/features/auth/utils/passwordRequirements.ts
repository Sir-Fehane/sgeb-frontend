export interface PasswordRequirement {
  id: string
  label: string
  met: (password: string) => boolean
}

/**
 * Individual, itemized breakdown of `PASSWORD_POLICY_PATTERN` (see
 * ./patterns.ts) for the S6 live checklist. Each check must stay
 * consistent with that single regex — this is a display convenience,
 * not a second source of truth for the rule itself.
 */
export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    met: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayúscula',
    met: (password) => /[A-ZÁÉÍÓÚÑ]/.test(password),
  },
  {
    id: 'digit',
    label: 'Al menos un número',
    met: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Al menos un símbolo',
    met: (password) => /[^A-Za-z0-9]/.test(password),
  },
]
