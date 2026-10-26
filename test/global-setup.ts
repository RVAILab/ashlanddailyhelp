import { LIVE_FEED_DIR, refreshLiveFeed } from './live-feed.ts'

// Runs once before the suite, the only time a test run may reach the network.
export default async function refreshFixtures() {
  const outcome = await refreshLiveFeed()
  if (outcome.result === 'refreshed') console.log(`live feed: ${LIVE_FEED_DIR} refreshed`)
  if (outcome.result === 'kept') console.warn(`live feed: kept the old ${LIVE_FEED_DIR} (${outcome.error})`)
}
