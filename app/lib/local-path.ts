// A return address on this site, or the fallback. Resolving it the way a browser would (which drops tabs and line
// breaks, so "/\t/evil.example" becomes another site) and comparing origins is what keeps it here.
export function localReturn(value: string | null, origin: string, fallback: string): string {
  if (!value || !value.startsWith('/')) return fallback
  const resolved = new URL(value, origin)
  if (resolved.origin !== new URL(origin).origin) return fallback
  return `${resolved.pathname.replace(/^\/+/, '/')}${resolved.search}${resolved.hash}`
}
