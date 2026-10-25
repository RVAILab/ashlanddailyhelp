import type { ListingLabel } from '../lib/listing-labels.ts'

// Each kind has its own shape as well as its own colour, so the labels read the same without colour.
const shapes: Record<ListingLabel['kind'], string> = { warning: '▲', caution: '◆', time: '◷', source: '●' }

export function ListingStatus({ labels }: { labels: ListingLabel[] }) {
  return (
    <ul className="listing-status">
      {labels.map(label => (
        <li key={`${label.kind}:${label.text}`} className={`label label-${label.kind}`}>
          <span aria-hidden="true">{shapes[label.kind]}</span> {label.text}
        </li>
      ))}
    </ul>
  )
}
