import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from './home.tsx'

describe('homepage', () => {
  it('names the site', async () => {
    const Stub = createRoutesStub([{ path: '/', Component: Home }])
    render(<Stub initialEntries={['/']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Ashland Daily Help' })).toBeDefined()
  })
})
