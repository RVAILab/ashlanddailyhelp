const asOf = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

// Runs on the server only, so the page and its hydration agree whatever the browser's date formatting does.
export function formatAsOf(iso: string): string {
  return asOf.format(new Date(iso)).replace(/\s/g, ' ')
}
