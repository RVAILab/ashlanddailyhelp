import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Ask, { handle } from './ask.tsx'

let shown: object | undefined

function AskWith() {
  const props = { actionData: shown } as unknown as Parameters<typeof Ask>[0]
  return <Ask {...props} />
}

function renderAsk(actionData?: object) {
  shown = actionData
  const Stub = createRoutesStub([{ path: '/ask', Component: AskWith }])
  render(<Stub initialEntries={['/ask']} />)
}

describe('/ask', () => {
  it('offers a labelled question box that posts to /ask, saying nothing is kept', async () => {
    renderAsk()
    const box = await screen.findByRole('textbox', { name: 'Your question' })
    expect(box.closest('form')?.getAttribute('method')).toBe('post')
    expect(box.closest('form')?.getAttribute('action')).toBe('/ask')
    expect(screen.getByText(/isn’t saved/)).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })

  it('shows the answer, crisis numbers first, with links to the listings it uses', async () => {
    renderAsk({
      state: 'answered',
      question: 'I want to kill myself, is there a shelter?',
      answer: {
        paragraphs: [
          'If you or someone else is in danger, call 911. To talk to someone now: 988, or 541-774-8201.',
          'Their page lists a shelter.',
        ],
        crisis: true,
        known: true,
        asOf: 'Sun, Oct 25, 2026, 12:00 PM PDT',
        citations: [
          {
            id: 'ohra-shelter',
            name: 'Talk through shelter options',
            site: 'ohrahelps.org',
            sourceUrl: 'https://ohrahelps.org/',
            listingId: 'ohra-shelter',
          },
          { id: 'shelter-sunday', name: 'Severe weather shelter', site: null, sourceUrl: null, listingId: null },
        ],
      },
    })
    const answer = await screen.findByRole('region', { name: /You asked/ })
    const paragraphs = within(answer).getAllByText(/./, { selector: 'p' })
    expect(paragraphs[0]?.textContent).toContain('911')
    for (const [number, dial] of [
      ['911', 'tel:911'],
      ['988', 'tel:988'],
      ['541-774-8201', 'tel:5417748201'],
    ])
      expect(within(answer).getByRole('link', { name: number }).getAttribute('href')).toBe(dial)
    expect(within(answer).getByRole('link', { name: 'Talk through shelter options' }).getAttribute('href')).toBe(
      '/resources/ohra-shelter',
    )
    expect(within(answer).getByText('Severe weather shelter')).toBeDefined()
    expect(within(answer).getByText('From listings as of Sun, Oct 25, 2026, 12:00 PM PDT.')).toBeDefined()
  })

  it('says when asking isn’t available, pointing to 211', async () => {
    renderAsk({ state: 'unavailable' })
    expect((await screen.findByRole('status')).textContent).toContain('211')
  })

  it('asks for a question when the box was empty', async () => {
    renderAsk({ state: 'empty' })
    expect((await screen.findByRole('status')).textContent).toBe('Type a question first.')
  })

  it('asks people to wait after too many questions, pointing to 211', async () => {
    renderAsk({ state: 'limited' })
    expect((await screen.findByRole('status')).textContent).toMatch(/Please wait a minute.*211/)
  })
})
