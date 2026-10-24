export function filterResources(resources, { query = '', category = 'all', area = 'all', savedOnly = false, saved = [] } = {}) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return resources.filter(r => (category === 'all' || r.categories.includes(category)) && (area === 'all' || r.coverage.includes(area)) && (!savedOnly || saved.includes(r.id)) && words.every(w => [r.name, r.provider, r.description, r.area, ...r.tags].join(' ').toLowerCase().includes(w)));
}
export function validateReport(input, events) {
  if (!events.some(e => e.id === input.eventId)) throw new Error('Choose a sample event.');
  if (!['completed', 'partial', 'canceled', 'unknown'].includes(input.outcome)) throw new Error('Choose an event outcome.');
  if (!['counted', 'estimated', 'not_recorded'].includes(input.method)) throw new Error('Choose how the amount was measured.');
  let value = input.value === '' || input.value === null || input.value === undefined ? null : Number(input.value);
  if (input.method === 'not_recorded') value = null;
  else if (value === null || !Number.isSafeInteger(value) || value < 0 || value > 100000) throw new Error('Enter a whole number from 0 to 100,000, or choose Not recorded.');
  if (['canceled', 'unknown'].includes(input.outcome) && value !== null) throw new Error('Canceled or unknown events need Not recorded. No service amount is assumed.');
  if (!['none_observed', 'observed', 'not_assessed'].includes(input.unmet)) throw new Error('Choose whether unmet need was observed.');
  const allowed = ['capacity', 'supplies', 'transportation', 'timing', 'requirement', 'other'];
  const reasons = input.unmet === 'observed' ? [...new Set((input.reasons || []).filter(r => allowed.includes(r)))] : [];
  return { eventId: input.eventId, outcome: input.outcome, value, method: input.method, unmet: input.unmet, reasons };
}
export function queueReport(state, input, events) {
  const report = validateReport(input, events);
  return { reports: state.reports, pending: [...state.pending.filter(r => r.eventId !== report.eventId), report] };
}
export function approveReport(state, eventId) {
  const report = state.pending.find(r => r.eventId === eventId);
  if (!report) return state;
  return { reports: [...state.reports.filter(r => r.eventId !== eventId), report], pending: state.pending.filter(r => r.eventId !== eventId) };
}
export function aggregateReports(reports, events) {
  const current = new Map(reports.map(r => [r.eventId, r]));
  const result = { meals: { total: null, counted: 0, estimated: 0, measured: 0 }, sessions: { total: null, counted: 0, estimated: 0, measured: 0 }, encounters: { total: null, counted: 0, estimated: 0, measured: 0 }, reported: 0, eligible: new Set(events.map(e => e.provider)).size, unmet: {} };
  const providers = new Set();
  for (const [id, r] of current) {
    const event = events.find(e => e.id === id);
    if (!event) continue;
    providers.add(event.provider);
    if (r.value !== null && ['completed', 'partial'].includes(r.outcome)) {
      const metric = result[event.unit];
      metric.total = (metric.total ?? 0) + r.value;
      metric.measured++;
      metric[r.method] += r.value;
    }
    if (r.unmet === 'observed') for (const reason of new Set(r.reasons)) result.unmet[reason] = (result.unmet[reason] || 0) + 1;
  }
  result.reported = providers.size;
  return result;
}

export function reportSeries(reports, events, unit, dates) {
  const current = new Map(reports.map(report => [report.eventId, report]));
  return dates.map(date => {
    const scheduled = events.filter(event => event.date === date && event.unit === unit);
    const reported = scheduled.map(event => current.get(event.id)).filter(Boolean);
    const measured = reported.filter(report => report.value !== null && ['completed', 'partial'].includes(report.outcome));
    return {
      date,
      scheduled: scheduled.length,
      reported: reported.length,
      total: measured.length ? measured.reduce((total, report) => total + report.value, 0) : null,
      counted: measured.filter(report => report.method === 'counted').reduce((total, report) => total + report.value, 0),
      estimated: measured.filter(report => report.method === 'estimated').reduce((total, report) => total + report.value, 0),
      status: !scheduled.length ? 'No scheduled sample event' : !reported.length ? 'Awaiting a sample report' : reported.every(report => report.outcome === 'canceled') ? 'Reported service canceled' : !measured.length ? 'Amount not recorded' : measured.length < scheduled.length ? 'Partial reporting; known amounts only' : 'Amount reported'
    };
  });
}
