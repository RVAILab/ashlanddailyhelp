import type { Category } from '../../contract/steward/values.ts'

export const en = {
  siteName: 'Ashland Daily Help',
  language: { name: 'English', switchTo: 'Español' },
  home: {
    tagline: 'Food, shelter, showers and health care in Ashland and Jackson County.',
    findHelp: 'Find help',
  },
  categories: {
    food: 'Food',
    housing: 'Shelter and housing',
    hygiene: 'Showers and hygiene',
    health: 'Health care',
    essentials: 'Essentials',
  } satisfies Record<Category, string>,
  areas: {
    'Jackson County': 'Jackson County (county-wide)',
    Oregon: 'Oregon (statewide)',
  } as Record<string, string>,
  search: {
    title: 'Find help',
    words: 'Words to search for',
    kind: 'Kind of help',
    anyKind: 'All kinds of help',
    area: 'Area',
    anyArea: 'All areas',
    submit: 'Search',
    results: 'Results',
    places: (count: number) => (count === 0 ? 'No places match' : count === 1 ? '1 place' : `${count} places`),
    tryFewer: 'Try fewer words, or another kind of help or area. You can also',
    clear: 'clear the search',
    help211: 'For help finding services, call 211.',
    noneListed: 'No places are listed right now. For help finding services, call 211.',
    notLoaded: 'Listings have not loaded yet. For help finding services now, call 211.',
    call211: 'Call 211',
  },
  card: {
    kind: 'Kind of help',
    area: 'Area',
    when: 'When',
    where: 'Where',
    phone: 'Phone',
    noPhone: 'Not confirmed',
  },
  labels: {
    conflict: 'Schedule needs checking',
    unconfirmed: 'Not yet confirmed by provider',
    fictional: 'Fictional example',
    ends: (when: string) => `Ends ${when}`,
    sourceReviewed: (day: string) => `Source reviewed · ${day}`,
    lastConfirmed: (day: string) => `Last confirmed ${day}`,
  },
  feed: {
    asOf: 'Listings as of',
    updateFailing: 'The latest update could not be loaded, so these listings may be out of date.',
    demonstration: 'This is demonstration data. Some listings are fictional.',
    none: 'Listings have not loaded yet.',
    unavailable: 'Listings are unavailable right now. For help finding services, call',
  },
  errors: {
    notFound: 'Page not found',
    notFoundDetail: 'There is no page at this address.',
    failed: 'Something went wrong',
    failedDetail: 'Please try again.',
    home: 'Go to the homepage',
    call211: 'For help finding services, call',
  },
}

export type Messages = typeof en
