export const TIME_ZONE = 'America/Los_Angeles'

// The calendar date (YYYY-MM-DD) at `at` in the service area's time zone.
export function localDate(at: Date, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

// Monday to Sunday, as Daily Help's Pulse week runs.
export function weekOf(day: string): { start: string; end: string; dates: string[] } {
  const offset = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
  const start = addDays(day, -offset)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return { start, end: dates[6]!, dates }
}
