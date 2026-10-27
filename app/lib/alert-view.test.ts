import { describe, expect, it } from 'vitest'
import type { FeedAlert } from '../../server/feed/contract.ts'
import { alertView } from './alert-view.ts'

const alert: FeedAlert = {
  id: 'shelter-sunday',
  kind: 'shelter_opening',
  severity: 'urgent',
  title: 'Severe weather shelter open Sunday night',
  message: 'The City of Ashland is opening a severe weather shelter.',
  startsAt: '2026-10-25T19:00:00-07:00',
  endsAt: '2026-10-26T07:30:00-07:00',
  area: 'Ashland',
  provenanceLabel: 'From a City of Ashland alert',
}

describe('alertView', () => {
  it('gives an alert in effect no status, and names nothing when it lists no listings', () => {
    expect(alertView(alert, 'en')).toMatchObject({ status: null, listingIds: [], severityText: 'Urgent' })
  })

  it('says an alert was canceled, in the steward’s words when it gives them', () => {
    expect(alertView({ ...alert, status: 'canceled' }, 'en').status).toBe('Canceled')
    expect(alertView({ ...alert, status: 'canceled', note: 'The shelter will not open.' }, 'en').status).toBe(
      'The shelter will not open.',
    )
  })

  it('says an alert may be canceled, in the steward’s words when it gives them', () => {
    expect(alertView({ ...alert, status: 'may_be_canceled' }, 'en').status).toBe('May be canceled')
    expect(alertView({ ...alert, status: 'may_be_canceled', note: 'Waiting on volunteers.' }, 'en').status).toBe(
      'Waiting on volunteers.',
    )
  })

  it('writes the times in Spanish with whole day names', () => {
    const view = alertView({ ...alert, status: 'canceled' }, 'es')
    expect(view.when).toBe('Del domingo 7:00 p.m. al lunes 7:30 a.m.')
    expect(view.status).toBe('Cancelado')
  })
})
