import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('disables when loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button', { name: /save/i })
    expect(btn.disabled).toBe(true)
  })
})
