// Tests run only on fixtures: a request that would leave the machine fails instead of quietly reaching the internet.
const local = new Set(['localhost', '127.0.0.1', '[::1]'])
const localFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost/')
  if ((url.protocol === 'http:' || url.protocol === 'https:') && !local.has(url.hostname))
    throw new Error(`tests must not reach the network: ${url.href}`)
  return localFetch(input, init)
}
