import { useId } from 'react'
import { useI18n } from '../i18n/provider.tsx'
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

const dialable = (phone: string) => phone.replace(/[^\d+]/g, '')

export function ListingCardView({ listing }: { listing: ListingCard }) {
  const heading = useId()
  const { t } = useI18n()
  return (
    <article className="listing-card" aria-labelledby={heading}>
      <h3 id={heading}>{listing.name}</h3>
      <p className="provider">{listing.provider}</p>
      <ListingStatus labels={listing.labels} />
      <dl>
        <dt>{t.card.kind}</dt>
        <dd>{listing.categories.join(', ')}</dd>
        <dt>{t.card.area}</dt>
        <dd>{listing.area}</dd>
        <dt>{t.card.when}</dt>
        <dd>{listing.schedule}</dd>
        <dt>{t.card.where}</dt>
        <dd>{listing.address}</dd>
        <dt>{t.card.phone}</dt>
        <dd>{listing.phone ? <a href={`tel:${dialable(listing.phone)}`}>{listing.phone}</a> : t.card.noPhone}</dd>
      </dl>
    </article>
  )
}
