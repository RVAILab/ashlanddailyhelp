const ID = /^[a-z0-9][a-z0-9-]*$/
const MAX = 30
const YEAR = 60 * 60 * 24 * 365

export function parseIds(value: string | null | undefined): string[] {
  const ids = (value ?? '').split(/[.,]/).filter(id => ID.test(id))
  return [...new Set(ids)].slice(0, MAX)
}

// The list is kept in a cookie on the device: listing ids only, nothing about the person.
export function savedIds(cookie: string | null | undefined): string[] {
  const value = cookie
    ?.split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === 'saved')?.[1]
  return parseIds(value ? decodeURIComponent(value) : '')
}

export const toggled = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id].slice(-MAX)

// Listings saved together, added to the list; when it is full, the oldest give way, as with one at a time.
export const merged = (ids: string[], adding: string[]) =>
  [...ids, ...adding.filter(id => !ids.includes(id))].slice(-MAX)

export function listCookie(ids: string[], secure: boolean): string {
  const attributes = `Path=/; Max-Age=${ids.length ? YEAR : 0}; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`
  return `saved=${ids.join('.')}; ${attributes}`
}
