import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ListingCard } from '../components/listing-card.tsx'
import { I18nProvider } from '../i18n/provider.tsx'
import Resources from './resources.tsx'

const showers: ListingCard = {
  id: 'ohra-showers',
  name: 'Shower Program',
  provider: 'OHRA',
  categories: ['Showers and hygiene'],
  area: 'Ashland',
  schedule: { text: 'Website lists Tuesdays and Thursdays, 9 am to noon.', fromFeed: true },
  translated: false,
  saved: false,
  address: '2350 Ashland St, Ashland',
  phone: '541-708-6100',
  labels: [
    { kind: 'warning', text: 'Schedule needs checking' },
    { kind: 'source', text: 'Added by Daily Help from ohrahelps.org' },
  ],
}

type Data = Awaited<ReturnType<typeof import('./resources.tsx').loader>>

function renderPage(data: Partial<Data>, url = '/resources', lang: 'en' | 'es' = 'en') {
  const loaderData: Data = {
    filters: {},
    results: [showers],
    feedLoaded: true,
    demonstration: false,
    ...data,
  }
  const Stub = createRoutesStub([
    { path: lang === 'es' ? '/es/resources' : '/resources', Component: Resources, loader: () => loaderData },
  ])
  render(
    <I18nProvider lang={lang}>
      <Stub initialEntries={[url]} />
    </I18nProvider>,
  )
}

describe('/resources', () => {
  it('shows a labelled search form holding the current filters', async () => {
    renderPage({ filters: { query: 'shower', category: 'hygiene' } }, '/resources?q=shower&category=hygiene')
    const form = await screen.findByRole('search')
    expect(within(form).getByRole('searchbox', { name: 'Words to search for' })).toHaveProperty('value', 'shower')
    expect(within(form).getByRole('combobox', { name: 'Kind of help' })).toHaveProperty('value', 'hygiene')
    expect(within(form).queryByRole('combobox', { name: 'Area' })).toBeNull()
    expect(within(form).getByRole('button', { name: 'Search' })).toBeDefined()
  })

  it('announces how many places match, and shows each as a card with its labels', async () => {
    renderPage({})
    expect((await screen.findByRole('status')).textContent).toBe('1 place')
    const card = screen.getByRole('article', { name: 'Shower Program' })
    expect(within(card).getByText('OHRA')).toBeDefined()
    expect(within(card).getByRole('link', { name: '541-708-6100' }).getAttribute('href')).toBe('tel:5417086100')
    expect(within(card).getByText('Schedule needs checking')).toBeDefined()
    expect(within(card).getByText('Added by Daily Help from ohrahelps.org')).toBeDefined()
  })

  it('says a missing phone is not confirmed', async () => {
    renderPage({ results: [{ ...showers, phone: null }] })
    expect(within(await screen.findByRole('article')).getByText('Not confirmed')).toBeDefined()
  })

  it('suggests removing filters and calling 211 when nothing matches', async () => {
    renderPage({ results: [], filters: { query: 'zzyzx' } }, '/resources?q=zzyzx')
    expect((await screen.findByRole('status')).textContent).toBe('No places match')
    const clear = screen.getByRole('link', { name: 'clear the search' })
    expect(clear.getAttribute('href')).toBe('/resources')
    expect(clear.closest('p')?.textContent).toBe(
      'Try fewer words, or another kind of help. You can also clear the search. For help finding services, call 211.',
    )
    expect(screen.getByRole('link', { name: 'Call 211' }).getAttribute('href')).toBe('tel:211')
  })

  it('says nothing is listed, without suggesting filters, when nothing matches an unfiltered search', async () => {
    renderPage({ results: [] })
    expect(
      await screen.findByText('No places are listed right now. For help finding services, call 211.'),
    ).toBeDefined()
    expect(screen.queryByRole('link', { name: 'clear the search' })).toBeNull()
  })

  it('says when listings have not loaded yet, instead of "no match"', async () => {
    renderPage({ results: [], feedLoaded: false })
    expect(
      await screen.findByText('Listings have not loaded yet. For help finding services now, call 211.'),
    ).toBeDefined()
    expect(screen.getByRole('link', { name: 'Call 211' })).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('puts the cards straight under the count, with no heading over them', async () => {
    renderPage({})
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it('labels demonstration data next to the results', async () => {
    renderPage({ demonstration: true })
    expect(await screen.findByText('This is demonstration data. Some listings are fictional.')).toBeDefined()
  })

  it('is all in Spanish on a Spanish page, links included', async () => {
    renderPage({ results: [], filters: { query: 'zzyzx' } }, '/es/resources?q=zzyzx', 'es')
    expect(await screen.findByRole('heading', { level: 1, name: 'Buscar ayuda' })).toBeDefined()
    expect(screen.getByRole('searchbox', { name: 'Palabras para buscar' })).toBeDefined()
    expect(screen.getByRole('status').textContent).toBe('No se encontraron lugares')
    expect(screen.getByRole('link', { name: 'borrar la búsqueda' }).getAttribute('href')).toBe('/es/resources')
    expect(screen.getByRole('link', { name: 'Llamar al 211' }).getAttribute('href')).toBe('tel:211')
  })

  it('marks the steward’s English listing text as English on a Spanish page', async () => {
    renderPage(
      {
        results: [
          { ...showers, labels: [{ kind: 'source', text: 'Added by Daily Help from ohrahelps.org', fromFeed: true }] },
        ],
      },
      '/es/resources',
      'es',
    )
    const card = await screen.findByRole('article')
    expect(within(card).getByRole('heading', { level: 3 }).getAttribute('lang')).toBe('en')
    expect(within(card).getByText(showers.schedule.text).getAttribute('lang')).toBe('en')
    expect(within(card).getByText('Added by Daily Help from ohrahelps.org').closest('li')?.getAttribute('lang')).toBe(
      'en',
    )
    expect(within(card).getByText('Showers and hygiene').getAttribute('lang')).toBeNull()
  })

  it('labels machine-translated text on a Spanish card and links to the English listing', async () => {
    renderPage(
      {
        results: [
          { ...showers, schedule: { text: 'El sitio web indica martes y jueves.', fromFeed: false }, translated: true },
        ],
      },
      '/es/resources',
      'es',
    )
    const card = await screen.findByRole('article')
    expect(within(card).getByText('El sitio web indica martes y jueves.').getAttribute('lang')).toBeNull()
    expect(within(card).getByText(/Traducción automática/)).toBeDefined()
    const english = within(card).getByRole('link', { name: 'Ver en inglés' })
    expect(english.getAttribute('href')).toBe('/resources/ohra-showers')
    expect(english.getAttribute('hreflang')).toBe('en')
  })

  it('offers a printable sheet for a kind of help, but not for a word search', async () => {
    renderPage({ filters: { category: 'food' } }, '/resources?category=food')
    expect((await screen.findByRole('link', { name: 'Print this' })).getAttribute('href')).toBe('/print?category=food')
    cleanup()
    renderPage({ filters: { query: 'meal', category: 'food' } }, '/resources?q=meal&category=food')
    await screen.findByRole('status')
    expect(screen.queryByRole('link', { name: 'Print this' })).toBeNull()
  })

  describe('sorting by distance', () => {
    const plaza = { coords: { latitude: 42.199, longitude: -122.7158 } }
    const near: ListingCard = { ...showers, id: 'near', name: 'Near the Plaza', geo: { lat: 42.1995, lng: -122.716 } }
    const far: ListingCard = { ...showers, id: 'far', name: 'Out east', geo: { lat: 42.1876, lng: -122.6839 } }
    const unknown: ListingCard = { ...showers, id: 'unknown', name: 'No map location' }
    const locate = (answer: (ok: PositionCallback, fail: PositionErrorCallback) => void) =>
      vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: vi.fn(answer) } })
    afterEach(() => vi.unstubAllGlobals())

    it('sorts the results on this device by distance from where I am, sending my location nowhere', async () => {
      locate(ok => ok(plaza as GeolocationPosition))
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      renderPage({ results: [unknown, far, near] })
      fireEvent.click(await screen.findByRole('button', { name: 'Sort by distance from me' }))
      expect(await screen.findByText('Sorted by distance from you. Your location stays on this phone.')).toBeDefined()
      expect(screen.getAllByRole('article').map(card => card.getAttribute('id'))).toEqual(['near', 'far', 'unknown'])
      expect(
        within(screen.getByRole('article', { name: 'Near the Plaza' })).getByText('Under 0.1 mi · about 1 min walk'),
      )
      expect(within(screen.getByRole('article', { name: 'Out east' })).getByText('1.8 mi · about 36 min walk'))
      expect(within(screen.getByRole('article', { name: 'No map location' })).getByText('Distance not known'))
      expect(fetch).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Back to the usual order' }))
      expect(screen.getByText('Back in the usual order.')).toBeDefined()
      expect(screen.getAllByRole('article').map(card => card.getAttribute('id'))).toEqual(['unknown', 'far', 'near'])
    })

    it('says it is finding me while it waits, ignores a second press, and gives no walk time past two miles', async () => {
      let answer: PositionCallback = () => {}
      locate(ok => {
        answer = ok
      })
      const medford: ListingCard = {
        ...showers,
        id: 'medford',
        name: 'In Medford',
        geo: { lat: 42.3265, lng: -122.8756 },
      }
      renderPage({ results: [medford, near] })
      const sort = await screen.findByRole('button', { name: 'Sort by distance from me' })
      fireEvent.click(sort)
      expect(screen.getByText('Finding where you are…')).toBeDefined()
      expect(sort.getAttribute('aria-disabled')).toBe('true')
      fireEvent.click(sort)
      expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
      act(() => answer(plaza as GeolocationPosition))
      expect(await screen.findByText('Sorted by distance from you. Your location stays on this phone.')).toBeDefined()
      expect(within(screen.getByRole('article', { name: 'In Medford' })).getByText('12.0 mi')).toBeDefined()
    })

    it('says it can’t sort on a phone that can’t give a location', async () => {
      vi.stubGlobal('navigator', { ...navigator, geolocation: undefined })
      renderPage({ results: [far, near] })
      fireEvent.click(await screen.findByRole('button', { name: 'Sort by distance from me' }))
      expect(await screen.findByText('Couldn’t get your location. Results stay in their usual order.')).toBeDefined()
    })

    it('keeps the usual order and says so when the location can’t be had', async () => {
      locate((_, fail) => fail({ code: 1 } as GeolocationPositionError))
      renderPage({ results: [far, near] })
      fireEvent.click(await screen.findByRole('button', { name: 'Sort by distance from me' }))
      expect(await screen.findByText('Couldn’t get your location. Results stay in their usual order.')).toBeDefined()
      expect(screen.getAllByRole('article').map(card => card.getAttribute('id'))).toEqual(['far', 'near'])
    })
  })
})
