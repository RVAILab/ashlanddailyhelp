import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Navigator, { handle } from './navigator.tsx'

let shown: object | undefined

function NavigatorWith() {
  const props = { actionData: shown } as unknown as Parameters<typeof Navigator>[0]
  return <Navigator {...props} />
}

function renderNavigator(actionData?: object) {
  shown = actionData
  const Stub = createRoutesStub([{ path: '/navigator', Component: NavigatorWith }])
  render(<Stub initialEntries={['/navigator']} />)
}

describe('/navigator', () => {
  it('asks with a form that posts here, for people helping someone else', async () => {
    renderNavigator()
    const box = await screen.findByRole('textbox', { name: 'Your question' })
    expect(box.closest('form')?.getAttribute('action')).toBe('/navigator')
    expect(screen.getByRole('heading', { level: 1, name: 'Navigator assistant' })).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })

  it('turns the listings an answer uses into a shareable list, a handout, or the saved list', async () => {
    renderNavigator({
      state: 'answered',
      question: 'What do people need to bring to the food pantry?',
      answer: {
        paragraphs: ['Their website lists photo ID.'],
        crisis: false,
        known: true,
        asOf: null,
        citations: [
          {
            id: 'access-pantries',
            name: 'Groceries for the week ahead',
            site: 'accesshelps.org',
            sourceUrl: 'https://accesshelps.org/',
            listingId: 'access-pantries',
          },
          {
            id: 'uncle-foods',
            name: 'A seat at the community table',
            site: 'unclefoods.org',
            sourceUrl: 'https://unclefoods.org/',
            listingId: 'uncle-foods',
          },
          { id: 'breakfast-1', name: 'Pancake breakfast', site: null, sourceUrl: null, listingId: null },
        ],
      },
    })
    const share = await screen.findByRole('region', { name: 'Use these listings' })
    const href = (name: string) => within(share).getByRole('link', { name }).getAttribute('href')
    expect(href('Open as a shareable list')).toBe('/list?ids=access-pantries.uncle-foods')
    expect(href('Print a handout')).toBe('/print?ids=access-pantries.uncle-foods')
    expect(href('Save these to my list')).toBe('/list/save?ids=access-pantries.uncle-foods')
    expect(screen.getByRole('link', { name: /^accesshelps\.org/ }).getAttribute('href')).toBe(
      'https://accesshelps.org/',
    )
  })

  it('offers nothing to share when the answer uses no listings', async () => {
    renderNavigator({
      state: 'answered',
      question: 'Is there a pancake breakfast?',
      answer: {
        paragraphs: ['I couldn’t find that in the Daily Help directory, and I won’t guess.'],
        crisis: false,
        known: false,
        asOf: null,
        citations: [{ id: 'breakfast-1', name: 'Pancake breakfast', site: null, sourceUrl: null, listingId: null }],
      },
    })
    await screen.findByRole('region', { name: /You asked/ })
    expect(screen.queryByRole('region', { name: 'Use these listings' })).toBeNull()
  })

  for (const [state, says] of [
    ['empty', 'Type a question first.'],
    ['limited', /Please wait a minute.*211/],
    ['unavailable', /isn’t available right now.*211/],
  ] as const)
    it(`says why there is no answer when it is ${state}`, async () => {
      renderNavigator({ state })
      expect((await screen.findByRole('status')).textContent).toMatch(says)
    })
})
