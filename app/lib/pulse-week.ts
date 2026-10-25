// A published week asked for by its Monday; anything else means this week so far.
export const weekParam = (params: URLSearchParams) => {
  const week = params.get('week')
  return week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : null
}
