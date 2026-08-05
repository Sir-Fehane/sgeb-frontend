import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaiterStatusBadge } from '@/features/waiters/components/WaiterStatusBadge'
import type { WaiterAccountStatus } from '@/features/waiters/types/waiter'

const CASES: [WaiterAccountStatus, string][] = [
  ['activo', 'Activo'],
  ['inactivo', 'Inactivo'],
]

describe('WaiterStatusBadge', () => {
  it.each(CASES)(
    'renders %s as the text "%s" — never color alone',
    (estadoCuenta, label) => {
      render(<WaiterStatusBadge estadoCuenta={estadoCuenta} />)

      expect(screen.getByText(label)).toBeInTheDocument()
    },
  )
})
