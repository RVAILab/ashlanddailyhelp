// Twilio signs each webhook: HMAC-SHA1, keyed by the account's auth token, of the full URL followed by every POST
// parameter's name and value sorted by name, in base64 (X-Twilio-Signature). Checked in constant time.
export async function validTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string,
): Promise<boolean> {
  if (!signature) return false
  const data =
    url +
    Object.keys(params)
      .sort()
      .map(key => key + params[key])
      .join('')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
  let given: Uint8Array
  try {
    given = Uint8Array.from(atob(signature), char => char.charCodeAt(0))
  } catch {
    return false
  }
  if (given.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index++) difference |= (expected[index] ?? 0) ^ (given[index] ?? 0)
  return difference === 0
}
