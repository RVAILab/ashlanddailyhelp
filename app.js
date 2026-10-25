import { resources, categories, demoEvents, initialReports } from './data.js';
import { filterResources, queueReport, approveReport, aggregateReports, reportSeries, checkListingsFeed, checkPulseFeed, listingEnded } from './core.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const paths = {
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 13v8h14v-8"/>',
  print: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6Z"/><path d="M17 11h1"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  food: '<path d="M4 3v7c0 3 4 3 4 0V3M6 3v18M17 3c-4 3-4 9 0 9h2M19 3v18"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  water: '<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  heart: '<path d="M20.5 5.5c-3-3-6-1-8.5 1-2.5-2-5.5-4-8.5-1-4 4 0 9 8.5 15 8.5-6 12.5-11 8.5-15Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  clipboard: '<path d="M9 4H5v17h14V4h-4M8 10h8m-8 4h8m-8 4h5"/><rect x="9" y="2" width="6" height="4" rx="1"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
Object.assign(paths, {
  phone: '<path d="M5 3.5h3.2l1.6 4.3-2.2 1.5a11 11 0 0 0 7.1 7.1l1.5-2.2 4.3 1.6v3.2A2 2 0 0 1 18.4 21 15.5 15.5 0 0 1 3 5.6a2 2 0 0 1 2-2.1Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  door: '<path d="M5 21V4.5L14 3v18M14 5h5v16M3 21h18"/><path d="M11 12.5v.5"/>',
  bag: '<path d="M5 8h14l-1 13H6Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8Z"/><circle cx="8" cy="9" r="1.4"/>',
  access: '<circle cx="12" cy="4.8" r="1.8"/><path d="M5 8.5c2.3.6 4.6.9 7 .9s4.7-.3 7-.9M12 9.4v5M12 14.4 9 21M12 14.4l3 6.6"/>',
  ok: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.7 2.7L16.2 9.4"/>',
  alert: '<path d="M12 3.5 21.5 20h-19Z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  route: '<circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="5.5" r="2"/><path d="M8 18.5h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z"/>'
});
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const motionOK = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
// Miniature category objects (original artwork). Decorative: the text label always carries the meaning.
const catArt = (id, size = 160, lazy = true) => `<picture><source type="image/avif" srcset="./art/cat-${id}-160.avif 1x, ./art/cat-${id}-320.avif 2x"><source type="image/webp" srcset="./art/cat-${id}-160.webp 1x, ./art/cat-${id}-320.webp 2x"><img src="./art/cat-${id}-160.png" alt="" width="${size}" height="${size}"${lazy ? ' loading="lazy"' : ''} decoding="async"></picture>`;
const longDate = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const endTime = iso => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).replace(/\s?([AP])M/, (_, x) => ` ${x.toLowerCase()}.m.`);
const chip = (warn, text) => `<p class="status-chip${warn ? ' is-warn' : ''}">${icon(warn ? 'alert' : 'ok')}${escape(text)}</p>`;
// Status labels come from the steward feed's fields; listings from data.js keep the original "Source reviewed" line.
const statusChip = r => `<div class="status-chips">${[
  r.mayBeCanceled && chip(true, r.mayBeCanceled),
  r.conflict && chip(true, 'Schedule needs checking'),
  r.endsAt && chip(true, `Ends ${endTime(r.endsAt)}`),
  r.unconfirmed && chip(true, 'Not yet confirmed by provider'),
  chip(false, r.provenanceLabel || `Source reviewed · ${new Date(r.reviewedDate + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`)
].filter(Boolean).join('')}</div>`;
const streetAddress = r => (r.address.match(/\d+\s[\w .]+?(?:Street|Avenue|Road|Boulevard|Blvd|Way|Lane)\b[^;]*/i) || [])[0] || null;
// The steward feed's location: one constant, overridable with <meta name="feed-base" content="https://…/"> (no build step).
const FEED_BASE = new URL($('meta[name="feed-base"]')?.content || './feed/', location.href);
const feedURL = name => new URL(name, FEED_BASE).href;
const feedTime = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
// First load: network (the service worker falls back to its stored copy), then the device cache directly, then data.js.
async function loadListings() {
  const url = feedURL('listings.json');
  for (const get of [() => fetch(url, { credentials: 'omit', cache: 'no-cache', signal: AbortSignal.timeout?.(6000) }), () => caches.match(url)]) {
    try { const response = await get(); if (response?.ok) { const feed = checkListingsFeed(await response.json()); if (feed) return feed; } } catch { /* Try the next source. */ }
  }
  return null;
}
const listingsFeed = location.protocol === 'file:' ? null : await loadListings();
const listings = listingsFeed ? listingsFeed.listings : resources;
const shown = () => listings.filter(r => !listingEnded(r));
if (listingsFeed) $$('[data-asof]').forEach(el => el.textContent = `Listings as of ${feedTime(listingsFeed.generatedAt)}`);
const SAVED_KEY = 'community-hub:saved:v1';
let saved = [];
try { const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); if (Array.isArray(parsed)) saved = parsed.filter(id => listings.some(r => r.id === id)); } catch { /* Storage is optional. */ }
// Pulse data: the built-in sample week until pulse.json arrives. Practice reports approved in this tab are kept on top of each poll.
let pulseEvents = demoEvents;
let pulseDates = ['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25'];
let baseReports = initialReports;
let dataset = 'FICTIONAL_DEMONSTRATION';
let practice = [];
const demo = () => dataset === 'FICTIONAL_DEMONSTRATION';
// With a real dataset, drop the lowercase "sample"/"fictional" qualifiers from generated copy.
const plain = text => demo() ? text : text.replace(/\b(?:fictional|sample) /g, '');
let state = { reports: structuredClone(initialReports), pending: [] };
let filters = { query: '', area: 'all', category: 'all', savedOnly: false };
let currentView = 'resources';
let toastTimer;
let installPrompt;
let activeResource;
let pulseUnit = 'meals';
let pulseDate = null;
let dataCleared = false;
const metricNames = { meals: 'Meals provided', sessions: 'Shower sessions', encounters: 'Navigation encounters' };
const monthDay = (date, month = true) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', month ? { month: 'long', day: 'numeric', timeZone: 'UTC' } : { day: 'numeric', timeZone: 'UTC' });
const weekLabel = (dash = '–') => { const [a, b] = [pulseDates[0], pulseDates[6]]; return a.slice(0, 7) === b.slice(0, 7) ? `${monthDay(a)}${dash}${monthDay(b, false)}` : `${monthDay(a)}${dash === '–' ? ' – ' : dash}${monthDay(b)}`; };
function applyDataset() {
  $$('[data-demo]').forEach(el => el.hidden = !demo());
  $$('[data-live]').forEach(el => el.hidden = demo());
  $$('[data-dataset]').forEach(el => el.textContent = dataset);
  $$('[data-week]').forEach(el => el.textContent = el.dataset.week === 'year' ? `${weekLabel()}, ${pulseDates[6].slice(0, 4)}` : weekLabel());
  $('#coverage-progress').setAttribute('aria-label', demo() ? 'Sample provider reporting coverage' : 'Provider reporting coverage');
  $('#coverage-list').setAttribute('aria-label', demo() ? 'Fictional participating providers' : 'Participating providers');
  $('#pg-stages').setAttribute('aria-label', plain('How a sample report travels'));
  setTitle();
}
// pulse.json: fetched once at startup, then every 30 s only while Pulse is visible and the tab is shown. Never cached by the service worker.
const PULSE_POLL = 30000;
let pulseFeed = null, pulseText = null, pulseTag = null, pulseTimer = null, pulseDelay = PULSE_POLL, pulseBusy = false, pulseStale = false;
const pulseStatus = () => !pulseFeed ? 'Sample reports loaded' : pulseStale ? `Last updated ${feedTime(pulseFeed.generatedAt)}. Showing the last figures received.` : `Updated ${feedTime(pulseFeed.generatedAt)}`;
function setUpdated(text) { if ($('#pulse-updated').textContent !== text) $('#pulse-updated').textContent = text; }
function stopPulse() { clearTimeout(pulseTimer); pulseTimer = null; }
async function pollPulse(once = false) {
  stopPulse();
  if (pulseBusy || location.protocol === 'file:' || (!once && (currentView !== 'impact' || document.hidden))) return;
  pulseBusy = true;
  try {
    // A page-set If-None-Match makes the browser pass the server's 304 straight through.
    const response = await fetch(feedURL('pulse.json'), pulseTag ? { credentials: 'omit', headers: { 'If-None-Match': pulseTag } } : { credentials: 'omit', cache: 'no-cache' });
    if (response.status !== 304) {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text !== pulseText) { const feed = checkPulseFeed(JSON.parse(text)); if (!feed) throw new Error('Invalid pulse feed'); applyPulse(feed); pulseText = text; }
      pulseTag = response.headers.get('ETag');
    }
    pulseStale = false; pulseDelay = PULSE_POLL;
  } catch {
    // Keep what's on screen and back off, up to five minutes.
    pulseStale = !!pulseFeed; pulseDelay = Math.min(pulseDelay * 2, 300000);
  } finally { pulseBusy = false; }
  if (pulseFeed) setUpdated(pulseStatus());
  if (currentView === 'impact' && !document.hidden) pulseTimer = setTimeout(pollPulse, pulseDelay);
}
function applyPulse(feed) {
  const eventsChanged = JSON.stringify(feed.events) !== JSON.stringify(pulseEvents);
  pulseFeed = feed; dataset = feed.dataset; pulseEvents = feed.events; pulseDates = feed.week.dates; baseReports = feed.reports;
  const known = r => pulseEvents.some(e => e.id === r.eventId);
  practice = practice.filter(known);
  state = { reports: [...feed.reports.filter(r => !practice.some(p => p.eventId === r.eventId)), ...practice], pending: state.pending.filter(known) };
  if (!pulseDates.includes(pulseDate)) pulseDate = null;
  if (eventsChanged) renderEventChoices();
  applyDataset(); renderQueue(); renderDashboard();
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, 6000); }
function setURL({ view = currentView, resource = null } = {}, push = false) {
  if (location.protocol === 'file:') return;
  const url = new URL(location.href);
  url.search = '';
  if (view !== 'resources') url.searchParams.set('view', view);
  if (view === 'resources') {
    if (filters.query) url.searchParams.set('q', filters.query);
    if (filters.category !== 'all') url.searchParams.set('category', filters.category);
    if (filters.area !== 'all') url.searchParams.set('area', filters.area);
    if (filters.sharedList) url.searchParams.set('list', filters.sharedList.join(','));
  }
  if (resource) url.searchParams.set('resource', resource);
  url.hash = '';
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}
function navigate(view, { history = true, focus = true } = {}) {
  currentView = ['resources', 'impact', 'providers', 'about'].includes(view) ? view : 'resources';
  $$('.view').forEach(el => el.hidden = el.id !== `view-${currentView}`);
  $$('[data-view]').forEach(el => { if (el.dataset.view === currentView) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  if (history) setURL({}, true);
  setTitle();
  if (currentView === 'impact') pollPulse(); else stopPulse();
  if (focus) { window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').focus({ preventScroll: true }); }
}
function setTitle() { document.title = `${({ resources: 'Find resources', impact: demo() ? 'Community pulse · Sample data' : 'Community pulse', providers: 'Provider preview', about: 'About the hub' })[currentView]} · Ashland Daily Help`; }
function readURL() {
  const p = new URLSearchParams(location.search);
  filters.query = (p.get('q') || '').slice(0, 200);
  filters.category = categories.some(c => c.id === p.get('category')) ? p.get('category') : 'all';
  filters.area = ['Ashland', 'Medford', 'Jackson County'].includes(p.get('area')) ? p.get('area') : 'all';
  filters.sharedList = p.has('list') ? p.get('list').split(',').filter(id => listings.some(r => r.id === id)) : null;
  filters.savedOnly = false;
  $('#search').value = filters.query; $('#hero-q').value = filters.query; $('#area').value = filters.area;
  navigate(p.get('view') || 'resources', { history: false, focus: false });
  renderResources();
  if ($('#resource-dialog').open) $('#resource-dialog').close();
  const resource = shown().find(r => r.id === p.get('resource'));
  if (resource) openResource(resource.id, false);
}
function categoryFor(r) { return categories.find(c => c.id === r.categories[0]); }
function visibleResources() {
  const base = filters.sharedList ? shown().filter(r => filters.sharedList.includes(r.id)) : shown();
  return filterResources(base, { ...filters, saved });
}
function renderCategories() {
  const grid = $('#categories');
  if (!grid.children.length) grid.innerHTML = categories.map(c => `<button type="button" class="cat" data-category="${c.id}" aria-pressed="false"><span class="cat-art" aria-hidden="true">${catArt(c.id, 160, false)}</span><span class="cat-label">${escape(c.label)}</span><span class="cat-count"></span></button>`).join('');
  const base = filters.sharedList ? shown().filter(r => filters.sharedList.includes(r.id)) : shown();
  categories.forEach(c => {
    const button = $(`[data-category="${c.id}"]`, grid);
    const count = filterResources(base, { ...filters, category: c.id, saved }).length;
    button.setAttribute('aria-pressed', String(filters.category === c.id));
    button.classList.toggle('is-empty', count === 0);
    $('.cat-count', button).innerHTML = `${count}<span class="sr-only"> ${count === 1 ? 'resource' : 'resources'}</span>`;
  });
}
function resourceCard(r) {
  const isSaved = saved.includes(r.id);
  const second = r.phone
    ? `<a class="button rcard-call" href="tel:${escape(r.phone)}" aria-label="Call ${escape(r.provider)}, ${escape(r.phone)}">${icon('phone')} Call</a>`
    : `<a class="button" href="${escape(r.source)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(r.provider)} website (opens in a new tab)">Website <span aria-hidden="true">↗</span></a>`;
  return `<article class="rcard" aria-labelledby="rc-${escape(r.id)}"><div class="rcard-top"><span class="rcard-art" aria-hidden="true">${catArt(r.categories[0])}</span><div><p class="rcard-provider">${escape(r.provider)}</p><span class="rcard-area">${escape(r.area)}</span></div><button type="button" class="rcard-save" data-save="${escape(r.id)}" aria-label="${isSaved ? 'Remove' : 'Save'} ${escape(r.provider)}${isSaved ? ' from your saved list' : ' to your saved list'}" aria-pressed="${isSaved}">${icon('bookmark')}</button></div><h3 class="rcard-title" id="rc-${escape(r.id)}">${escape(r.name)}</h3><p class="rcard-desc">${escape(r.description)}</p><dl class="rcard-facts"><div><dt>${icon('pin')}<span>Where</span></dt><dd>${escape(r.address)}</dd></div><div><dt>${icon('clock')}<span>When</span></dt><dd>${escape(r.schedule)}</dd></div></dl>${statusChip(r)}<div class="rcard-actions"><button type="button" class="button primary" data-resource="${escape(r.id)}">View details<span class="sr-only"> for ${escape(r.provider)}</span> <span aria-hidden="true">→</span></button>${second}</div><div class="print-source"><p>${escape(r.address)}</p><p>${escape(r.schedule)}</p>${r.phone ? `<p>Phone: ${escape(r.phone)}</p>` : ''}<p>${escape(r.source)}</p></div></article>`;
}
function renderResources() {
  renderCategories();
  const visible = visibleResources();
  $('#result-count').innerHTML = `<strong>${visible.length} ${visible.length === 1 ? 'resource' : 'resources'}</strong>${filters.sharedList ? ' in a shared list' : filters.savedOnly ? ' in your saved list' : ' to explore'}`;
  $('#saved-count').textContent = saved.length;
  $('#saved-toggle').setAttribute('aria-pressed', String(filters.savedOnly));
  $('#empty-state').hidden = visible.length > 0;
  $('#resource-grid').innerHTML = visible.map(resourceCard).join('');
}
function toggleSaved(id) {
  saved = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
  let persistent = true;
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch { persistent = false; }
  renderResources();
  if (activeResource && $('#resource-dialog').open) renderResourceDetail(activeResource);
  toast(persistent ? 'Saved list updated on this device. Clear it when using a shared device.' : 'Saved for this visit only. This browser is blocking storage.');
}
function renderResourceDetail(id) {
  const r = listings.find(r => r.id === id); if (!r) return;
  const isSaved = saved.includes(r.id);
  const street = streetAddress(r);
  const facts = [['pin', 'Where', r.address], ['clock', 'When', r.schedule], ['door', 'How to start', r.access], ['bag', 'What to bring / eligibility', r.requirements], ['tag', 'Cost', r.cost], ['access', 'Accessibility', r.accessibility]];
  $('#resource-detail').innerHTML = `<div class="rd-head"><span class="rd-art" aria-hidden="true">${catArt(r.categories[0], 160, false)}</span><div><p class="rd-provider">${escape(r.provider)}</p><h2 id="resource-dialog-title">${escape(r.name)}</h2></div></div><p class="rd-desc">${escape(r.description)}</p>${statusChip(r)}<div class="rd-actions">${r.phone ? `<a class="button primary" href="tel:${escape(r.phone)}">${icon('phone')} Call ${escape(r.phone)}</a>` : ''}${street ? `<a class="button" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(street + ', Oregon')}" target="_blank" rel="noopener noreferrer">${icon('route')} Directions <span class="sr-only">(opens in a new tab)</span></a>` : ''}<a class="button ${r.phone ? '' : 'primary'}" href="${escape(r.source)}" target="_blank" rel="noopener noreferrer">${icon('globe')} Provider website <span class="sr-only">(opens in a new tab)</span></a></div><div class="rd-note">${icon(r.conflict ? 'alert' : 'info')}<p><strong>${r.conflict ? 'Schedule conflict to resolve.' : 'Provider confirmation pending.'}</strong> Source reviewed ${longDate(r.reviewedDate)}.${r.endsAt ? ` Ends ${escape(endTime(r.endsAt).replace(/\.$/, ''))}.` : ''} Availability is unknown; confirm before traveling.</p></div><dl class="rd-facts">${facts.map(([ic, key, value]) => `<div><dt>${icon(ic)}<span>${key}</span></dt><dd>${escape(value)}</dd></div>`).join('')}</dl><div class="rd-more"><button type="button" class="button" data-share-resource="${escape(r.id)}">${icon('share')} Share</button><button type="button" class="button" data-save="${escape(r.id)}" aria-pressed="${isSaved}">${icon('bookmark')} ${isSaved ? 'Saved' : 'Save'}</button></div><p class="dialog-source">Source: <a href="${escape(r.source)}" target="_blank" rel="noopener noreferrer">${escape(new URL(r.source).hostname)}</a> · Website review is not provider confirmation.</p><button type="button" class="inline-link" data-correction="${escape(r.id)}">Something looks out of date?</button>`;
}
function openResource(id, updateURL = true) { activeResource = id; renderResourceDetail(id); if (updateURL) setURL({ resource: id }); if (!$('#resource-dialog').open) $('#resource-dialog').showModal(); }
function info(title, body) { $('#info-content').innerHTML = `<h2 id="info-dialog-title">${escape(title)}</h2>${body}`; $('#info-dialog').showModal(); }
async function shareURL(url, title) {
  if (location.protocol === 'file:') return toast('Sharing links will work when the site is hosted. This is a local preview file.');
  if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (error) { if (error.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link copied. You can paste it into a message.'); }
  catch { info('Copy this link', `<p>Copy and paste this link wherever you’d like to share it.</p><label for="share-url" class="sr-only">Link to share</label><input id="share-url" class="share-url" readonly value="${escape(url)}">`); $('#share-url').select(); }
}
function shareList() {
  const url = new URL(location.href); url.search = ''; url.hash = '';
  const selected = visibleResources().map(r => r.id);
  if (filters.savedOnly || filters.sharedList) {
    if (!selected.length) return toast('Add a resource to the list before sharing it.');
    url.searchParams.set('list', selected.join(','));
  } else { if (filters.query) url.searchParams.set('q', filters.query); if (filters.category !== 'all') url.searchParams.set('category', filters.category); if (filters.area !== 'all') url.searchParams.set('area', filters.area); }
  shareURL(url.href, 'Community resources · Ashland & Jackson County');
}
const pulseStates = { 'No scheduled sample event': ['none', 'No event'], 'Awaiting a sample report': ['awaiting', 'Awaiting report'], 'Reported service canceled': ['canceled', 'Canceled'], 'Amount not recorded': ['unrecorded', 'Not recorded'], 'Partial reporting; known amounts only': ['partial', 'Known amounts only'], 'Amount reported': ['reported', ''] };
const pulseUnitWords = { meals: ['meal', 'meals'], sessions: ['session', 'sessions'], encounters: ['encounter', 'encounters'] };
const pulseNum = value => value.toLocaleString('en-US');
const pulseUnitWord = (unit, value) => pulseUnitWords[unit][value === 1 ? 0 : 1];
function pulseDayState(day) { const [key, label] = pulseStates[day.status] || ['unrecorded', day.status]; return key === 'reported' && day.total === 0 ? ['zero', 'Measured zero'] : [key, label]; }
function pulseScale(largest) {
  if (!(largest > 0)) return null;
  const rough = largest / 4, magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= rough));
  return { step, max: Math.ceil(largest / step) * step };
}
function pulseUnitInfo(unit) {
  const events = pulseEvents.filter(e => e.unit === unit);
  const reports = events.map(e => state.reports.find(r => r.eventId === e.id)).filter(Boolean);
  const measured = reports.filter(r => r.value !== null && ['completed', 'partial'].includes(r.outcome));
  const status = !reports.length ? plain('Awaiting a sample report') : measured.length ? '' : reports.every(r => r.outcome === 'canceled') ? 'Reported service canceled; no amount assumed' : 'Reported without an amount; unknown, not zero';
  return { events: events.length, reported: reports.length, measured: measured.length, status };
}
const pulseLantern = lit => `<svg class="pl-lantern${lit ? ' is-lit' : ''}" viewBox="0 0 24 34" aria-hidden="true" focusable="false"><path class="pl-l-frame" d="M9 5a3 3 0 0 1 6 0M6.5 8h11l-1.5 3.5h-8ZM8 11.5h8V26H8ZM6 26h12l1 3.5H5Z"/><rect class="pl-l-light" x="9.6" y="13.4" width="4.8" height="10.8" rx="2.4"/></svg>`;
function renderDashboard() {
  const totals = aggregateReports(state.reports, pulseEvents);
  $('#metric-cards').innerHTML = Object.entries(metricNames).map(([unit, name], index) => {
    const metric = totals[unit], info = pulseUnitInfo(unit), known = metric.total !== null;
    const split = known && metric.total > 0 ? `<span class="pl-metric-split" aria-hidden="true">${metric.counted ? `<span class="is-counted" style="flex-grow:${metric.counted}"></span>` : ''}${metric.estimated ? `<span class="is-estimated" style="flex-grow:${metric.estimated}"></span>` : ''}</span>` : `<span class="pl-metric-split is-empty" aria-hidden="true"></span>`;
    return `<button type="button" class="pl-metric" data-pulse-unit="${unit}" aria-pressed="${pulseUnit === unit}"><span class="pl-metric-top"><span class="pl-metric-index">0${index + 1}</span><span class="pl-metric-name">${name}</span><span class="pl-metric-state" aria-hidden="true"></span></span><span class="pl-metric-figure">${known ? `<span class="pl-metric-value">${pulseNum(metric.total)}</span><span class="pl-metric-unit">${pulseUnitWord(unit, metric.total)}</span>` : `<span class="pl-metric-value is-unknown" aria-hidden="true">—</span><span class="pl-metric-unit">No amount yet</span>`}</span>${split}<span class="pl-metric-detail">${known ? `${pulseNum(metric.counted)} counted · ${pulseNum(metric.estimated)} estimated` : escape(info.status)}</span><span class="pl-metric-events">${plain(`${info.reported} of ${info.events} sample ${info.events === 1 ? 'event' : 'events'} reported`)}</span></button>`;
  }).join('');
  $('#coverage-count').textContent = `${totals.reported} of ${totals.eligible}`;
  $('#coverage-progress').value = totals.reported; $('#coverage-progress').max = totals.eligible;
  $('#coverage-progress').textContent = `${totals.reported} of ${totals.eligible}`;
  $('#coverage-caption').textContent = plain(`Only the ${totals.eligible} fictional participating providers are included. This is not coverage of all providers in the county.`);
  const providers = [...new Set(pulseEvents.map(e => e.provider))].map(provider => ({ provider, services: [...new Set(pulseEvents.filter(e => e.provider === provider).map(e => e.service))].join(', '), reported: pulseEvents.some(e => e.provider === provider && state.reports.some(r => r.eventId === e.id)) }));
  $('#coverage-list').innerHTML = providers.map(p => `<li class="${p.reported ? 'is-reported' : 'is-awaiting'}">${pulseLantern(p.reported)}<span><strong>${escape(p.provider)}</strong><span>${escape(p.services)}</span></span><em>${p.reported ? 'Reported' : 'Awaiting report'}</em></li>`).join('');
  $('#pulse-hero-lanterns').innerHTML = providers.map(p => pulseLantern(p.reported)).join('');
  $('#pulse-hero-coverage').innerHTML = `<strong>${totals.reported} of ${totals.eligible}</strong> ${plain('fictional sample ')}providers have reported this week. Each lit lantern is one provider’s report.`;
  renderDetailedPulse(totals);
  const names = { capacity: 'Capacity', supplies: 'Supplies', transportation: 'Transportation', timing: 'Timing', requirement: 'Requirements', other: 'Other' };
  const current = state.reports.filter(r => pulseEvents.some(e => e.id === r.eventId));
  const assessed = { observed: current.filter(r => r.unmet === 'observed').length, none_observed: current.filter(r => r.unmet === 'none_observed').length, not_assessed: current.filter(r => r.unmet === 'not_assessed').length };
  const barriers = Object.entries(totals.unmet).sort((a, b) => b[1] - a[1]);
  const dots = count => `<span class="pl-dots" aria-hidden="true">${current.map((_, i) => `<i class="${i < count ? 'is-on' : ''}"></i>`).join('')}</span>`;
  $('#barriers').innerHTML = `<ul class="pl-assess" aria-label="${plain(`Unmet need in the ${current.length} current sample reports`)}"><li><strong>${assessed.observed}</strong> observed unmet need</li><li><strong>${assessed.none_observed}</strong> observed none</li><li><strong>${assessed.not_assessed}</strong> did not assess</li></ul>` + (barriers.length ? `<ul class="pl-barrier-list">${barriers.map(([reason, count]) => `<li class="pl-barrier"><span class="pl-barrier-name">${names[reason]}</span>${dots(count)}<span class="pl-barrier-count"><strong>${count}</strong> of ${current.length} reports</span></li>`).join('')}</ul>` : `<p class="pl-empty">${plain('No barriers noted in the sample reports.')} Unassessed need is not evidence of no need.</p>`);
}
function pulsePartlyDelivered(date) {
  const current = new Map(state.reports.map(report => [report.eventId, report]));
  return pulseEvents.some(e => e.date === date && e.unit === pulseUnit && current.get(e.id)?.outcome === 'partial' && current.get(e.id)?.value !== null);
}
function pulseDayText(day) {
  const date = new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return day.total === null ? `${date}: ${plain(day.status).toLowerCase()}.` : `${date}: ${day.total.toLocaleString()} ${pulseUnit}; ${day.counted.toLocaleString()} counted and ${day.estimated.toLocaleString()} estimated.${day.status.startsWith('Partial') ? ' Partial reporting; known amounts only.' : ''}${pulsePartlyDelivered(day.date) ? ' The provider reported the service as only partly delivered.' : ''}`;
}
function renderDetailedPulse(totals) {
  const series = reportSeries(state.reports, pulseEvents, pulseUnit, pulseDates);
  const scale = pulseScale(Math.max(0, ...series.map(day => day.total ?? 0)));
  const hasAmounts = series.some(day => day.total !== null);
  $('#trend-title').textContent = metricNames[pulseUnit] + '.';
  const ticks = scale ? Array.from({ length: scale.max / scale.step + 1 }, (_, i) => i * scale.step) : [0];
  const pos = value => scale ? (value / scale.max).toFixed(4) : 0;
  const days = series.map((day, i) => {
    const date = new Date(day.date + 'T12:00:00Z');
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const [key, label] = pulseDayState(day);
    const amount = day.total !== null;
    const bar = amount && day.total > 0 ? `<span class="pl-bar">${day.counted ? `<span class="pl-seg is-counted" style="flex-grow:${day.counted}"></span>` : ''}${day.estimated ? `<span class="pl-seg is-estimated" style="flex-grow:${day.estimated}"></span>` : ''}</span>` : '';
    const glyph = amount && key === 'reported' ? '' : '<span class="pl-glyph"></span>';
    const top = amount ? `<span class="pl-day-value"><span class="pl-v">${pulseNum(day.total)}</span></span>${label ? `<span class="pl-v-note">${label}</span>` : ''}` : `<span class="pl-status">${label}</span>`;
    return `<button type="button" class="pl-day" data-state="${key}" data-pulse-date="${day.date}" aria-label="${escape(pulseDayText(day))}" aria-pressed="${pulseDate === day.date}" style="--i:${i};--t:${pos(day.total ?? 0)}"><span class="pl-day-plot"><span class="pl-track">${bar}${glyph}${top}</span></span><span class="pl-day-date"><span class="pl-dow">${weekday}</span><span class="pl-dom">${Number(day.date.slice(-2))}</span></span></button>`;
  }).join('');
  $('#daily-chart').innerHTML = `<div class="pl-plot${hasAmounts ? '' : ' is-empty'}" role="group" aria-label="Daily ${escape(metricNames[pulseUnit].toLowerCase())}, ${weekLabel(' to ')}. Select a day for its details."><div class="pl-grid" aria-hidden="true">${ticks.map(t => `<i style="--p:${pos(t)}"><span>${hasAmounts ? pulseNum(t) : ''}</span></i>`).join('')}<span class="pl-axis-unit">${hasAmounts ? pulseUnit : ''}</span></div>${hasAmounts ? '' : `<p class="pl-plot-note">No amount has been reported for ${escape(metricNames[pulseUnit].toLowerCase())} this week. Each day says why.</p>`}<div class="pl-days">${days}</div></div>`;
  const selected = series.find(day => day.date === pulseDate);
  $('#chart-selection').textContent = selected ? pulseDayText(selected) : 'Select a day for its amount or reporting status.';
  $('#chart-table-caption').textContent = `${demo() ? 'Fictional ' + metricNames[pulseUnit].toLowerCase() : metricNames[pulseUnit]}, ${weekLabel()}, ${pulseDates[6].slice(0, 4)}`;
  const cell = value => value === null ? '<span aria-hidden="true">—</span><span class="sr-only">No amount</span>' : pulseNum(value);
  $('#chart-table-body').innerHTML = series.map(day => `<tr data-state="${pulseDayState(day)[0]}"><th scope="row">${day.date}</th><td>${cell(day.total === null ? null : day.counted)}</td><td>${cell(day.total === null ? null : day.estimated)}</td><td>${cell(day.total)}</td><td>${day.scheduled ? `${day.reported} of ${day.scheduled}` : '<span aria-hidden="true">—</span><span class="sr-only">None scheduled</span>'}</td><td>${plain(day.status)}</td></tr>`).join('');
  const n = totals.eligible, gap = n > 1 ? 3 : 0, seg = n ? 100 / n - gap : 0;
  const lit = pulseEvents.length ? [...new Set(pulseEvents.map(e => e.provider))].map(provider => pulseEvents.some(e => e.provider === provider && state.reports.some(r => r.eventId === e.id))) : [];
  $('#coverage-ring').innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="${totals.reported} of ${totals.eligible} ${plain('fictional ')}providers have reported">${lit.map((on, i) => `<circle class="pl-ring-seg${on ? ' is-lit' : ''}" cx="60" cy="60" r="50" pathLength="100" stroke-dasharray="${seg.toFixed(2)} ${(100 - seg).toFixed(2)}" stroke-dashoffset="${(-(i * 100 / n) - gap / 2).toFixed(2)}" transform="rotate(-90 60 60)" style="--i:${i}"/>`).join('')}</svg>`;
  const metric = totals[pulseUnit], info = pulseUnitInfo(pulseUnit);
  const pct = part => metric.total > 0 ? Math.round(part / metric.total * 100) : 0;
  const basis = `<p class="pl-ev-basis">${plain(`From ${info.measured} of ${info.events} scheduled sample ${info.events === 1 ? 'event' : 'events'} with a reported amount.`)}</p>`;
  $('#evidence-chart').innerHTML = metric.total === null ? `<p class="pl-ev-missing"><span class="pl-glyph-inline" aria-hidden="true"></span>No amount yet for ${pulseUnit}.</p><p class="pl-ev-basis">${escape(info.status)}. ${plain(`${info.reported} of ${info.events} sample ${info.events === 1 ? 'event' : 'events'} reported.`)}</p>` : `<p class="pl-ev-total"><span class="pl-ev-num">${pulseNum(metric.total)}</span> <span class="pl-ev-unit">${pulseUnitWord(pulseUnit, metric.total)}</span></p>${metric.total > 0 ? `<div class="pl-ev-bar" role="img" aria-label="${metric.counted} counted and ${metric.estimated} estimated ${pulseUnit}">${metric.counted ? `<span class="is-counted" style="flex-grow:${metric.counted}"></span>` : ''}${metric.estimated ? `<span class="is-estimated" style="flex-grow:${metric.estimated}"></span>` : ''}</div>` : '<div class="pl-ev-bar is-zero" role="img" aria-label="Measured zero"></div>'}<dl class="pl-ev-split"><div><dt><span class="pl-key is-counted" aria-hidden="true"></span>Counted</dt><dd><strong>${pulseNum(metric.counted)}</strong><span>${pct(metric.counted)}%</span></dd></div><div><dt><span class="pl-key is-estimated" aria-hidden="true"></span>Estimated</dt><dd><strong>${pulseNum(metric.estimated)}</strong><span>${pct(metric.estimated)}%</span></dd></div></dl>${basis}`;
}
let pulseRevealed = false;
function pulseReveal() {
  if (pulseRevealed || $('#view-impact').hidden) return; pulseRevealed = true;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); } }), { rootMargin: '0px 0px -6% 0px' });
  // Fail-open: only sections below the fold are armed, and everything is shown after a few seconds regardless.
  const armed = $$('#view-impact [data-pl-reveal]').filter(el => { const top = el.getBoundingClientRect().top; return !$('#view-impact').hidden && top > innerHeight; });
  armed.forEach(el => { el.classList.add('pl-armed'); observer.observe(el); });
  setTimeout(() => armed.forEach(el => el.classList.add('is-in')), 4000);
}
// Reveal once, the first time Community Pulse is shown (direct load or navigation).
new MutationObserver(() => requestAnimationFrame(pulseReveal)).observe($('#view-impact'), { attributes: true, attributeFilter: ['hidden'] });
document.addEventListener('keydown', event => {
  const item = event.target.closest?.('#view-impact [data-pulse-date], #view-impact [data-pulse-unit]');
  if (!item || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const items = $$(item.matches('[data-pulse-date]') ? '#view-impact [data-pulse-date]' : '#view-impact [data-pulse-unit]');
  const i = items.indexOf(item);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (i + (event.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
  event.preventDefault(); items[next].focus();
});
const pgOutcomeNames = { completed: 'As planned', partial: 'Partly', canceled: 'Canceled', unknown: 'Not sure' };
const pgMethodNames = { counted: 'counted', estimated: 'estimated', not_recorded: 'not recorded' };
const pgUnmetNames = { observed: 'Some need unmet', none_observed: 'None observed', not_assessed: 'Not assessed' };
const pgReasonNames = { capacity: 'Capacity', supplies: 'Supplies', transportation: 'Transportation', timing: 'Timing', requirement: 'Requirements', other: 'Other' };
const pgUnitWord = { meals: 'meals', sessions: 'shower sessions', encounters: 'navigation encounters' };
const pgUnitShort = { meals: 'meals', sessions: 'sessions', encounters: 'encounters' };
let pgApproved = null;
let pgLockedFrom = null;
const pgPick = name => $(`#report-form input[name=${name}]:checked`)?.value;
const pgEvent = () => pulseEvents.find(item => item.id === pgPick('eventId')) || pulseEvents[0];
const pgDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const pgReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pgTotal = (reports, unit) => aggregateReports(reports, pulseEvents)[unit].total;
const pgNum = n => n === null ? 'no recorded amount' : n.toLocaleString();
const pgChange = (before, after, word) => plain(before === after ? `sample ${word} stay at ${pgNum(before)}` : `sample ${word}: <strong>${pgNum(before)} → ${pgNum(after)}</strong>`);
const pgAmount = (r, unit) => r.value === null ? 'amount not recorded' : `${r.value.toLocaleString()} ${pgUnitWord[unit]}, ${pgMethodNames[r.method]}`;
const pgRaw = () => $('#report-value').value.trim().replace(/[,\s]/g, '');
function pgValueProblem() {
  if ($('#report-value').disabled) return '';
  const raw = pgRaw(), unit = pgUnitWord[pgEvent().unit];
  if (raw === '') return `Add how many ${unit} were provided, or choose “Not recorded” if no amount was kept.`;
  if (/^-/.test(raw)) return 'Amounts can’t be negative. Enter 0 or more.';
  if (/^\d*\.\d+$/.test(raw)) return `Use a whole number of ${unit}, without decimals.`;
  if (!/^\d+$/.test(raw)) return 'Use numbers only, like 120.';
  if (Number(raw) > 100000) return 'That’s more than 100,000, the most one report can hold. Please check the number.';
  return '';
}
function pgFieldError(message) {
  $('#value-error').textContent = message; $('#value-error').hidden = !message;
  if (message) $('#report-value').setAttribute('aria-invalid', 'true'); else $('#report-value').removeAttribute('aria-invalid');
  $('#pg-amount').classList.toggle('pg-has-error', !!message);
}
function pgClearErrors() { pgFieldError(''); $('#form-error').hidden = true; $('#form-error').textContent = ''; }
function pgSummary() {
  const e = pgEvent(), outcome = pgPick('outcome'), method = pgPick('method'), unmet = pgPick('unmet');
  const problem = pgValueProblem(), missing = method === 'not_recorded', raw = pgRaw();
  const amountReady = missing || !problem;
  const reasons = unmet === 'observed' ? $$('#report-form input[name=reason]:checked').map(el => pgReasonNames[el.value]) : [];
  const amountText = missing ? 'Not recorded — no amount assumed' : !problem ? `${Number(raw).toLocaleString()} ${pgUnitWord[e.unit]}, ${pgMethodNames[method]}` : raw === '' ? 'Waiting for a number' : 'Needs a whole number';
  $('#pg-receipt').innerHTML = [['For', `${e.provider} · ${pgDate(e.date)}`], ['Service', pgOutcomeNames[outcome]], ['Amount', amountText], ['Unmet need', `${pgUnmetNames[unmet]}${reasons.length ? ` · ${reasons.join(', ')}` : ''}`]].map(([k, v]) => `<div${k === 'Amount' && !amountReady ? ' data-todo' : ''}><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('');
  $('#pg-progress [data-q="2"]').dataset.state = amountReady ? 'done' : raw === '' ? 'todo' : 'error';
  $('#pg-progress-text').textContent = amountReady ? 'All three answered — ready to send to review.' : raw === '' ? '2 of 3 answered · add an amount, or choose Not recorded.' : '2 of 3 answered · the amount needs a whole number.';
}
function pgStage() {
  const order = ['report', 'review', 'publish'];
  const stage = state.pending.length ? 'review' : pgApproved && state.reports.includes(pgApproved.report) ? 'publish' : 'report';
  const current = order.indexOf(stage);
  $$('#pg-stages li').forEach(li => {
    const i = order.indexOf(li.dataset.step);
    li.dataset.state = i < current || (stage === 'publish' && i === current) ? 'done' : i === current ? 'current' : 'next';
    if (i === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('#pg-stages').dataset.stage = stage;
}
function renderQueue() {
  const published = pgApproved && state.reports.includes(pgApproved.report) ? pgApproved : null;
  const tickets = state.pending.map(r => {
    const event = pulseEvents.find(e => e.id === r.eventId), word = pgUnitWord[event.unit];
    const prior = state.reports.find(x => x.eventId === r.eventId);
    const before = pgTotal(state.reports, event.unit), after = pgTotal(approveReport(state, r.eventId).reports, event.unit);
    return `<article class="pg-ticket" aria-labelledby="ticket-${escape(r.eventId)}"><p class="pg-badge" data-tone="waiting"><span aria-hidden="true"></span>Waiting for review · not public yet</p><h3 id="ticket-${escape(r.eventId)}">${escape(event.provider)}</h3><p class="pg-ticket-meta">${escape(event.service)} · ${pgDate(event.date)}</p><p class="pg-ticket-amount">${r.value === null ? '<strong class="pg-none">Amount not recorded</strong>' : `<strong>${r.value.toLocaleString()}</strong> ${word} <span>${pgMethodNames[r.method]}</span>`}</p><dl class="pg-ticket-facts"><div><dt>Service</dt><dd>${pgOutcomeNames[r.outcome]}</dd></div><div><dt>Unmet need</dt><dd>${pgUnmetNames[r.unmet]}${r.reasons.length ? ` · ${r.reasons.map(x => pgReasonNames[x]).join(', ')}` : ''}</dd></div></dl><p class="pg-effect">${prior ? `Replaces the approved report for this event (${pgAmount(prior, event.unit)}), so nothing is counted twice. ` : ''}If approved, ${pgChange(before, after, word)}.</p><div class="pg-ticket-actions"><button type="button" class="button pg-approve" data-approve="${escape(r.eventId)}">${demo() ? 'Approve &amp; publish to sample' : 'Approve &amp; publish in this tab'}</button><button type="button" class="text-button pg-discard" data-discard="${escape(r.eventId)}">Discard</button></div></article>`;
  }).join('');
  const done = published && !state.pending.length ? `<div class="pg-published" id="pg-published" tabindex="-1"><p class="pg-badge" data-tone="published"><span aria-hidden="true"></span>${demo() ? 'Approved · published to the sample' : 'Approved · shown in this tab only'}</p>${published.after === null ? `<p class="pg-figure-note">Recorded as “amount not recorded”. Community Pulse shows it as missing, never as zero.</p>` : `<p class="pg-figure"><span class="sr-only">${demo() ? 'Sample ' : ''}${pgUnitWord[published.unit]} ${published.before === published.after ? 'stay at' : `changed from ${pgNum(published.before)} to`} ${pgNum(published.after)}.</span><span aria-hidden="true">${published.before !== null && published.before !== published.after ? `<span class="pg-from">${pgNum(published.before)}</span><span class="pg-arrow">→</span>` : ''}<strong data-count-from="${published.before ?? ''}" data-count-to="${published.after}">${pgNum(published.after)}</strong> <span class="pg-unit-word">${pgUnitWord[published.unit]}</span></span></p>`}<p>${escape(published.provider)}’s report now counts in Community Pulse, in this tab only. Each event keeps one approved report, so approving again can’t inflate the total.</p></div>` : '';
  $('#review-queue').innerHTML = tickets || done ? tickets + done : '<div class="pg-empty"><img src="./art/lantern-160.webp" width="80" height="80" alt="" loading="lazy" decoding="async"><p><strong>Nothing waiting for review.</strong> Send a practice report and it will appear here first — not on the dashboard.</p></div>';
  pgStage(); updateEvent();
}
function pgCount() {
  const el = $('#pg-published [data-count-to]');
  if (!el || el.dataset.countFrom === '' || el.dataset.countTo === '' || pgReduced()) return;
  const from = Number(el.dataset.countFrom), to = Number(el.dataset.countTo), start = performance.now();
  const tick = now => { const t = Math.min(1, (now - start) / 900), eased = 1 - Math.pow(1 - t, 3); el.textContent = Math.round(from + (to - from) * eased).toLocaleString(); if (t < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function updateEvent() {
  const e = pgEvent(), prior = state.reports.find(r => r.eventId === e.id), waiting = state.pending.some(r => r.eventId === e.id);
  $('#event-meta').textContent = waiting ? 'A report for this event is already waiting for review. Sending again replaces it.' : prior ? `Approved report on file: ${pgAmount(prior, e.unit)}. A new report replaces it after approval — it never adds to it.` : 'No report on file for this event yet.';
  $('#unit-label').textContent = metricNames[e.unit];
  $('#value-unit').textContent = pgUnitShort[e.unit];
  $('#value-hint').textContent = `Count ${pgUnitWord[e.unit]} delivered, not unique people.`;
  pgSummary();
}
function updateMeasurement() {
  const locked = ['canceled', 'unknown'].includes(pgPick('outcome'));
  if (locked && pgPick('method') !== 'not_recorded') { pgLockedFrom = pgPick('method'); $('#report-form input[name=method][value=not_recorded]').checked = true; }
  if (!locked && pgLockedFrom) { $(`#report-form input[name=method][value=${pgLockedFrom}]`).checked = true; pgLockedFrom = null; }
  $$('#report-form input[name=method]').forEach(el => el.disabled = locked && el.value !== 'not_recorded');
  $('#pg-amount-locked').hidden = !locked;
  const missing = pgPick('method') === 'not_recorded';
  $('#report-value').disabled = missing;
  if (missing) { $('#report-value').value = ''; pgFieldError(''); }
  $('#pg-amount').classList.toggle('pg-missing', missing);
  pgSummary();
}
function phoneGuide() {
  info('Keep the guide close', `<p>Add a shortcut to your home screen when using the site over HTTPS.</p><ol class="install-list"><li><strong>iPhone or iPad:</strong> Open in Safari, choose Share, then Add to Home Screen.</li><li><strong>Android:</strong> In Chrome, open the menu and choose Install app or Add to Home screen, when offered.</li><li><strong>Offline:</strong> Visit online first, then keep the dated guide handy. Confirm service details directly.</li></ol>${installPrompt ? '<button id="native-install" class="button primary">Install on this device</button>' : ''}<p class="field-hint">Device and browser support varies. Notifications are not enabled in this preview.</p>`);
}
document.addEventListener('click', async event => {
  const unitChoice = event.target.closest('[data-pulse-unit]'); if (unitChoice) { const changed = pulseUnit !== unitChoice.dataset.pulseUnit; pulseUnit = unitChoice.dataset.pulseUnit; pulseDate = null; renderDashboard(); $(`[data-pulse-unit="${pulseUnit}"]`).focus(); if (changed) { const chart = $('#view-impact .pl-chart'); chart.classList.remove('pl-switch'); void chart.offsetWidth; chart.classList.add('pl-switch'); } return; }
  const dayChoice = event.target.closest('[data-pulse-date]'); if (dayChoice) { pulseDate = dayChoice.dataset.pulseDate; const series = reportSeries(state.reports, pulseEvents, pulseUnit, pulseDates); $('#chart-selection').textContent = pulseDayText(series.find(day => day.date === pulseDate)); $$('[data-pulse-date]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.pulseDate === pulseDate))); return; }
  const nav = event.target.closest('[data-view]'); if (nav) { event.preventDefault(); const go = () => navigate(nav.dataset.view); if (document.startViewTransition && motionOK() && nav.dataset.view !== currentView) document.startViewTransition(go); else go(); return; }
  const jump = event.target.closest('[data-jump-category]'); if (jump) { event.preventDefault(); filters.category = jump.dataset.jumpCategory; filters.savedOnly = false; renderResources(); setURL(); goToDirectory($(`[data-category="${filters.category}"]`)); return; }
  const category = event.target.closest('[data-category]'); if (category) { filters.category = category.dataset.category; renderResources(); setURL(); $(`[data-category="${filters.category}"]`).focus(); return; }
  const save = event.target.closest('[data-save]'); if (save) { const id = save.dataset.save; const inDialog = !!save.closest('dialog'); toggleSaved(id); const replacement = $(`[data-save="${id}"]`, inDialog ? $('#resource-dialog') : $('#resource-grid')); replacement?.focus(); return; }
  const resource = event.target.closest('[data-resource]'); if (resource) return openResource(resource.dataset.resource);
  const share = event.target.closest('[data-share-resource]'); if (share) { const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('resource', share.dataset.shareResource); return shareURL(url.href, listings.find(r => r.id === share.dataset.shareResource).provider); }
  if (event.target.closest('[data-close]')) { const dialog = event.target.closest('dialog'); if (dialog.id === 'resource-dialog') setURL(); return dialog.close(); }
  const correction = event.target.closest('[data-correction]'); if (correction) { const r = listings.find(x => x.id === correction.dataset.correction); return info('Help keep details current', `<p>The correction inbox is not connected in this preview. Confirm current information with the provider using the link below. A staffed review inbox will be required before launch.</p><div class="dialog-actions"><a class="button primary" href="${escape(r.source)}" target="_blank" rel="noopener noreferrer">Open provider website ↗</a></div>`); }
  const approve = event.target.closest('[data-approve]'); if (approve) { const id = approve.dataset.approve, report = state.pending.find(r => r.eventId === id); if (!report) return; const ev = pulseEvents.find(e => e.id === id), before = pgTotal(state.reports, ev.unit); state = approveReport(state, id); practice = [...practice.filter(r => r.eventId !== id), report]; pgApproved = { report, unit: ev.unit, provider: ev.provider, before, after: pgTotal(state.reports, ev.unit) }; renderQueue(); renderDashboard(); setUpdated(`${demo() ? 'Sample updated' : 'Practice report shown'} ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`); toast(pgApproved.after === null ? 'Approved. Community Pulse shows this amount as not recorded — this tab only.' : plain(`Approved. Community Pulse now shows ${pgNum(pgApproved.after)} sample ${pgUnitWord[ev.unit]} — this tab only.`)); pgCount(); $('#pg-published')?.focus(); return; }
  const discard = event.target.closest('[data-discard]'); if (discard) { state.pending = state.pending.filter(r => r.eventId !== discard.dataset.discard); renderQueue(); toast(demo() ? 'Sample discarded. Totals were not changed.' : 'Discarded. Totals were not changed.'); $('#review-title').focus(); return; }
  if (event.target.closest('#native-install') && installPrompt) { await installPrompt.prompt(); installPrompt = null; $('#info-dialog').close(); }
});
$('#search-form').addEventListener('submit', event => { event.preventDefault(); filters.query = $('#search').value; filters.area = $('#area').value; renderResources(); setURL(); });
$('#search').addEventListener('input', () => { filters.query = $('#search').value; renderResources(); setURL(); });
$('#area').addEventListener('change', () => { filters.area = $('#area').value; renderResources(); setURL(); });
$('#saved-toggle').addEventListener('click', () => { filters.savedOnly = !filters.savedOnly; filters.sharedList = null; renderResources(); setURL(); });
$('#reset-filters').addEventListener('click', () => { filters = { query: '', area: 'all', category: 'all', savedOnly: false }; $('#search').value = ''; $('#hero-q').value = ''; $('#area').value = 'all'; renderResources(); setURL(); $('#search').focus(); });
$('#clear-saved').addEventListener('click', () => { saved = []; try { localStorage.removeItem(SAVED_KEY); } catch {} renderResources(); setURL(); toast('Your saved list has been cleared from this device.'); });
$('#share-list').addEventListener('click', shareList);
$('#print').addEventListener('click', () => window.print());
$('#resource-dialog').addEventListener('close', () => { if (!$('#resource-dialog').open) activeResource = null; });
$('#resource-dialog').addEventListener('cancel', () => setURL());
const renderEventChoices = (checked = pgPick('eventId')) => $('#event').innerHTML = pulseEvents.map((e, i) => `<label class="pg-choice pg-event"><input type="radio" name="eventId" value="${escape(e.id)}"${(pulseEvents.some(x => x.id === checked) ? e.id === checked : !i) ? ' checked' : ''}><span class="pg-dot" aria-hidden="true"></span><span class="pg-choice-body"><strong>${escape(e.provider)}</strong><small>${escape(e.service)} · ${pgDate(e.date)}</small></span></label>`).join('');
renderEventChoices();
$('#event').addEventListener('change', () => { pgClearErrors(); updateEvent(); });
$$('input[name=outcome]').forEach(el => el.addEventListener('change', updateMeasurement));
$('#method').addEventListener('change', updateMeasurement);
$('#unmet').addEventListener('change', () => { $('#reason-fields').hidden = pgPick('unmet') !== 'observed'; pgSummary(); });
$('#reason-fields').addEventListener('change', pgSummary);
$('#report-value').addEventListener('input', () => { if (!$('#value-error').hidden) pgFieldError(pgValueProblem()); pgSummary(); });
$('#report-value').addEventListener('blur', () => { if (pgRaw() !== '') pgFieldError(pgValueProblem()); });
$('#pg-start').addEventListener('click', () => { $('#report-form').scrollIntoView({ behavior: pgReduced() ? 'auto' : 'smooth', block: 'start' }); $('#report-form input[name=eventId]:checked').focus({ preventScroll: true }); });
$('#report-form').addEventListener('submit', event => {
  event.preventDefault();
  const problem = pgValueProblem();
  if (problem) { pgFieldError(problem); $('#form-error').textContent = `Question 2: ${problem}`; $('#form-error').hidden = false; $('#report-value').focus(); return; }
  try {
    const eventId = pgPick('eventId');
    state = queueReport(state, { eventId, outcome: pgPick('outcome'), value: $('#report-value').disabled ? '' : pgRaw(), method: pgPick('method'), unmet: pgPick('unmet'), reasons: $$('input[name=reason]:checked').map(el => el.value) }, pulseEvents);
    pgClearErrors(); renderQueue(); toast('Sent to review. Nothing is public until it’s approved.');
    $(`[data-approve="${eventId}"]`)?.closest('.pg-ticket')?.classList.add('pg-arrived');
    $(`[data-approve="${eventId}"]`)?.focus();
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; $('#form-error').focus(); }
});
$('#reset-demo').addEventListener('click', () => { state = { reports: structuredClone(baseReports), pending: [] }; practice = []; pgApproved = null; pgLockedFrom = null; $('#report-form').reset(); $('#reason-fields').hidden = true; pgClearErrors(); updateMeasurement(); renderQueue(); renderDashboard(); setUpdated(pulseStatus()); toast(demo() ? 'Demonstration reset to the original fictional reports.' : 'Practice reports cleared.'); });
$('#download-data').addEventListener('click', () => {
  const totals = aggregateReports(state.reports, pulseEvents);
  const sample = demo() ? 'sample_' : '';
  const rows = [`dataset,period_start,period_end,unit,value,counted_amount,estimated_amount,reporting_${sample}providers,eligible_${sample}providers`, ...Object.keys(metricNames).map(unit => `${dataset},${pulseDates[0]},${pulseDates[6]},${unit},${totals[unit].total ?? ''},${totals[unit].counted},${totals[unit].estimated},${totals.reported},${totals.eligible}`)];
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([rows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })); link.download = demo() ? 'fictional-community-pulse.csv' : 'community-pulse.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
$('#install-top').addEventListener('click', phoneGuide); $('#install-about').addEventListener('click', phoneGuide);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
const updateOffline = () => $('#offline-banner').hidden = navigator.onLine;
window.addEventListener('online', () => { updateOffline(); pulseDelay = PULSE_POLL; pollPulse(); });
document.addEventListener('visibilitychange', () => document.hidden ? stopPulse() : pollPulse()); window.addEventListener('offline', updateOffline); window.addEventListener('popstate', readURL);
$('#clear-device').addEventListener('click', async () => {
  dataCleared = true; saved = []; try { localStorage.removeItem(SAVED_KEY); localStorage.removeItem('community-hub:hero-motion'); } catch {}
  state = { reports: structuredClone(baseReports), pending: [] }; practice = []; renderResources(); renderQueue(); renderDashboard();
  try {
    if ('caches' in window) for (const key of await caches.keys()) if (key.startsWith('hub-preview-')) await caches.delete(key);
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === new URL('./', location.href).href) await r.unregister();
    toast('Saved resources and the offline copy cleared. Reloading online will create a new offline copy.');
  } catch { toast('Saved list cleared. Browser settings can also clear this site’s offline data.'); }
});
const registerWorker = () => { if (!dataCleared) navigator.serviceWorker.register('./sw.js').catch(() => toast('Offline saving is unavailable in this browser. Online browsing still works.')); };
// The listings fetch above can finish after the load event, so register straight away if it has already fired.
if ('serviceWorker' in navigator && window.isSecureContext && ['http:', 'https:'].includes(location.protocol)) { if (document.readyState === 'complete') registerWorker(); else window.addEventListener('load', registerWorker, { once: true }); }
function goToDirectory(focusTarget) {
  $('#directory').scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' });
  (focusTarget || $('#directory-title')).focus({ preventScroll: true });
}
$('#hero-search').addEventListener('submit', event => {
  event.preventDefault();
  filters.query = $('#hero-q').value.trim().slice(0, 200); filters.savedOnly = false; filters.sharedList = null;
  $('#search').value = filters.query; renderResources(); setURL(); goToDirectory();
});
['resource-dialog', 'info-dialog'].forEach(id => $('#' + id).addEventListener('click', event => { if (event.target === event.currentTarget) { if (id === 'resource-dialog') setURL(); event.currentTarget.close(); } }));
// Quietly mark the header once the page scrolls under it.
{ let ticking = false; const mark = () => { $('.site-header').classList.toggle('is-scrolled', window.scrollY > 8); ticking = false; }; window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true }); mark(); }
// Small scroll reveals; skipped entirely when motion is reduced or IntersectionObserver is missing.
if ('IntersectionObserver' in window && motionOK()) {
  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  $$('[data-reveal]').forEach(el => io.observe(el));
  window.addEventListener('beforeprint', () => $$('[data-reveal]').forEach(el => el.classList.add('is-in')));
}
// Silent ambient loop over the hero still: progressive enhancement only.
function heroMotion() {
  const frame = $('#hero-art .hh-frame'), still = $('img', frame), button = $('#hero-motion');
  if (!frame || !motionOK() || navigator.connection?.saveData) return;
  const phone = window.matchMedia('(max-width: 760px)');
  const PREF = 'community-hub:hero-motion';
  let userPaused = false, visible = true;
  try { userPaused = localStorage.getItem(PREF) === 'paused'; } catch {}
  const video = document.createElement('video');
  video.className = 'hh-video'; video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
  ['muted', 'playsinline', 'disablepictureinpicture', 'disableremoteplayback'].forEach(a => video.setAttribute(a, ''));
  video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  const source = () => phone.matches ? './art/valley-loop-m-960.mp4' : './art/valley-loop-1600.mp4';
  const label = paused => { button.dataset.state = paused ? 'paused' : 'playing'; $('.hm-text', button).textContent = paused ? 'Play' : 'Pause'; };
  const sync = () => { if (userPaused || !visible || document.hidden || !motionOK()) video.pause(); else video.play().catch(() => label(true)); };
  const fail = () => { video.remove(); button.hidden = true; };
  video.addEventListener('playing', () => { video.classList.add('is-playing'); button.hidden = false; label(false); }, { passive: true });
  video.addEventListener('pause', () => label(true));
  video.addEventListener('error', fail);
  video.poster = still.currentSrc || still.src; video.src = source();
  frame.append(video);
  button.addEventListener('click', () => { userPaused = !video.paused ? true : false; try { localStorage.setItem(PREF, userPaused ? 'paused' : 'playing'); } catch {} sync(); });
  if (userPaused) { button.hidden = false; label(true); video.classList.add('is-playing'); }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(frame);
  document.addEventListener('visibilitychange', sync);
  phone.addEventListener('change', () => { video.classList.remove('is-playing'); video.src = source(); video.poster = still.currentSrc || still.src; sync(); });
  window.matchMedia('(prefers-reduced-motion: no-preference)').addEventListener('change', event => { if (!event.matches) { video.pause(); fail(); } });
  sync();
}
if (document.readyState === 'complete') setTimeout(heroMotion, 400); else window.addEventListener('load', () => setTimeout(heroMotion, 400), { once: true });
updateEvent(); updateMeasurement(); renderQueue(); renderDashboard(); updateOffline(); applyDataset(); pollPulse(true); readURL();
// Hide a time-bound listing when it ends, even if the feed hasn't been refreshed.
(function hideEnded() {
  const next = Math.min(...listings.map(r => r.endsAt ? Date.parse(r.endsAt) - Date.now() : Infinity).filter(ms => ms > 0));
  if (next < 2 ** 31) setTimeout(() => { renderResources(); if (activeResource && listingEnded(listings.find(r => r.id === activeResource))) { $('#resource-dialog').close(); setURL(); } hideEnded(); }, next + 1000);
})();
