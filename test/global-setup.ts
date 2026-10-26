import { LIVE_FEED_DIR, type LiveFeedOutcome, refreshLiveFeed } from './live-feed.ts'

// Runs once before the suite, the only time a test run may reach the network. CI never does: it tests the committed
// snapshot, so a build never depends on the steward being up.
export async function refreshFixtures(
  env: Record<string, string | undefined> = process.env,
): Promise<LiveFeedOutcome | { result: 'cached' }> {
  if (env.CI) return { result: 'cached' }
  const outcome = await refreshLiveFeed()
  if (outcome.result === 'refreshed') console.log(`live feed: ${LIVE_FEED_DIR} refreshed`)
  if (outcome.result === 'kept') console.warn(`live feed: kept the old ${LIVE_FEED_DIR} (${outcome.error})`)
  return outcome
}

// Vitest passes its project to a global setup and treats what it returns as a teardown, so neither is used here.
export default async () => {
  await refreshFixtures()
}
