import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaitersPageHeader } from '@/features/waiters/components/WaitersPageHeader'

describe('WaitersPageHeader', () => {
  it('invokes onInvite when the real invite action is activated', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn()
    render(<WaitersPageHeader onInvite={onInvite} />)

    await user.click(screen.getByRole('button', { name: 'Invitar mesero' }))

    expect(onInvite).toHaveBeenCalledOnce()
  })

  it('disables the invite action only while isInviteDisabled is true (e.g. GET /roles still resolving)', () => {
    render(<WaitersPageHeader onInvite={vi.fn()} isInviteDisabled />)

    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeDisabled()
  })

  it('enables the invite action by default', () => {
    render(<WaitersPageHeader onInvite={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeEnabled()
  })
})
