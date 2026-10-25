import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFound, { loader } from './not-found.tsx'

describe('not found', () => {
  it('answers with a 404 status', () => {
    expect(loader().init?.status).toBe(404)
  })

  it('says so and links home', async () => {
    const Stub = createRoutesStub([{ path: '*', Component: NotFound }])
    render(<Stub initialEntries={['/no-such-page']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Go to the homepage' }).getAttribute('href')).toBe('/')
  })
})
