import type { ListingLabel } from '../lib/listing-labels.ts'

// Each kind has its own shape as well as its own colour, so the labels read the same without colour.
const shapes: Record<ListingLabel['kind'], React.ReactNode> = {
  warning: <path d="M8 1.5 15 14.5H1z" />,
  caution: <path d="M8 1 15 8 8 15 1 8z" />,
  time: (
    <>
      <circle cx="8" cy="8" r="6.25" fill="none" strokeWidth="1.5" />
      <path d="M8 4v4.5l3 1.75" fill="none" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  source: <circle cx="8" cy="8" r="4.5" />,
}

export function ListingStatus({ labels }: { labels: ListingLabel[] }) {
  return (
    <ul className="listing-status">
      {labels.map(label => (
        <li key={`${label.kind}:${label.text}`} className={`label label-${label.kind}`} data-kind={label.kind}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor" stroke="currentColor">
            {shapes[label.kind]}
          </svg>{' '}
          {label.text}
        </li>
      ))}
    </ul>
  )
}
