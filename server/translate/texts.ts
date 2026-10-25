import type { FeedListing } from '../../contract/steward/feed.ts'

// Prose a reader needs to understand; names, addresses, phone numbers and links stay exactly as the provider wrote them.
const FIELDS = ['description', 'schedule', 'access', 'requirements', 'cost', 'accessibility', 'capacity'] as const

export type TranslatableField = (typeof FIELDS)[number] | 'mayBeCanceled'

export interface TranslatableText {
  field: TranslatableField
  english: string
}

const meaningful = (text: string | undefined): text is string =>
  !!text && !['', 'unknown'].includes(text.trim().toLowerCase())

export function translatableTexts(listing: FeedListing): TranslatableText[] {
  const texts: TranslatableText[] = FIELDS.filter(field => meaningful(listing[field])).map(field => ({
    field,
    english: listing[field].trim(),
  }))
  if (meaningful(listing.mayBeCanceled)) texts.push({ field: 'mayBeCanceled', english: listing.mayBeCanceled.trim() })
  return texts
}

export async function hashText(lang: string, english: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${lang}\n${english.trim()}`))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
