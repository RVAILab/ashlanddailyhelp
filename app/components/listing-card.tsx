import { useId } from 'react'
import { Link, useLocation } from 'react-router'
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
  const { t, lang, path } = useI18n()
  const { search } = useLocation()
  // Listing text comes from the steward in English; on other pages, mark it so screen readers use an English voice.
  const feedLang = lang === 'en' ? undefined : 'en'
  return (
    <article className="listing-card" aria-labelledby={heading}>
      <h3 id={heading} lang={feedLang}>
        <Link to={path(`/resources/${listing.id}`)} state={{ search }}>
          {listing.name}
        </Link>
      </h3>
      <p className="provider" lang={feedLang}>
        {listing.provider}
      </p>
      <ListingStatus labels={listing.labels} />
      <dl>
        <dt>{t.card.kind}</dt>
        <dd>{listing.categories.join(', ')}</dd>
        <dt>{t.card.area}</dt>
        <dd>{listing.area}</dd>
        <dt>{t.card.when}</dt>
        <dd lang={feedLang}>{listing.schedule}</dd>
        <dt>{t.card.where}</dt>
        <dd lang={feedLang}>{listing.address}</dd>
        <dt>{t.card.phone}</dt>
        <dd>{listing.phone ? <a href={`tel:${dialable(listing.phone)}`}>{listing.phone}</a> : t.card.noPhone}</dd>
      </dl>
    </article>
  )
}
