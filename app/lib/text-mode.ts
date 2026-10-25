export const TEXT_COOKIE = 'text'

// Text-only mode leaves out images, web fonts and decoration. The visitor's own choice wins; without one, a browser
// asking to save data gets it.
export function textOnly(headers: Headers): boolean {
  const chosen = headers
    .get('Cookie')
    ?.split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === TEXT_COOKIE)?.[1]
  if (chosen === 'on') return true
  if (chosen === 'off') return false
  return headers.get('Save-Data')?.toLowerCase() === 'on'
}
