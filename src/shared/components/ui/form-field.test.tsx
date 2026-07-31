import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FormField } from '@/shared/components/ui/form-field'
import { Input } from '@/shared/components/ui/input'

describe('FormField', () => {
  it('associates the visible label with its control', () => {
    render(
      <FormField label="Correo" description="Usaremos este correo para contactarte.">
        {(field) => <Input type="email" {...field} />}
      </FormField>,
    )

    const input = screen.getByLabelText('Correo')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Usaremos este correo para contactarte.')
  })

  it('marks the control invalid and announces the error message', () => {
    render(
      <FormField label="Correo" error="Ingresa un correo válido.">
        {(field) => <Input type="email" {...field} />}
      </FormField>,
    )

    const input = screen.getByLabelText('Correo')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Ingresa un correo válido.')
    expect(input).toHaveAccessibleDescription('Ingresa un correo válido.')
  })
})
