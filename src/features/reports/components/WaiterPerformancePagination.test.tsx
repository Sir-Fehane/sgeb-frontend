import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterPerformancePagination } from '@/features/reports/components/WaiterPerformancePagination'

describe('WaiterPerformancePagination', () => {
  it('renders nothing when there are no results', () => {
    const { container } = render(
      <WaiterPerformancePagination
        page={1}
        lastPage={1}
        total={0}
        onPageChange={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the current page, last page, and total result count', () => {
    render(
      <WaiterPerformancePagination
        page={2}
        lastPage={4}
        total={80}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/Página 2 de 4/)).toBeInTheDocument()
    expect(screen.getByText(/80 mesero\(s\)/)).toBeInTheDocument()
  })

  it('disables "Anterior" on the first page and "Siguiente" on the last page', () => {
    render(
      <WaiterPerformancePagination
        page={1}
        lastPage={1}
        total={5}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('calls onPageChange with page + 1 / page - 1 when the boundaries allow it', async () => {
    const onPageChange = vi.fn()
    render(
      <WaiterPerformancePagination
        page={2}
        lastPage={3}
        total={60}
        onPageChange={onPageChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
  })
})
