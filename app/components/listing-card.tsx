import { useId } from 'react'
import type { ListingLabel } from '../lib/listing-labels.ts'
import { ListingStatus } from './listing-status.tsx'

export interface ListingCard {
  id: string
  name: string
  provider: string
  categories: string[]
  area: string
  schedule: string
  address: string
  phone: string | null
  labels: ListingLabel[]
}

export function ListingCardView({ listing }: { listing: ListingCard }) {
  const heading = useId()
  return (
    <article className="listing-card" aria-labelledby={heading}>
      <h3 id={heading}>{listing.name}</h3>
      <p className="provider">{listing.provider}</p>
      <ListingStatus labels={listing.labels} />
      <dl>
        <dt>Kind of help</dt>
        <dd>{listing.categories.join(', ')}</dd>
        <dt>Area</dt>
        <dd>{listing.area}</dd>
        <dt>When</dt>
        <dd>{listing.schedule}</dd>
        <dt>Where</dt>
        <dd>{listing.address}</dd>
        <dt>Phone</dt>
        <dd>{listing.phone ? <a href={`tel:${listing.phone}`}>{listing.phone}</a> : 'Phone not listed'}</dd>
      </dl>
    </article>
  )
}
