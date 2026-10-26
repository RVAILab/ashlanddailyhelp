// Optional until production has a database (a Hyperdrive binding, or a DATABASE_URL secret) and a feed host.
interface Env {
  DATABASE_URL?: string
  HYPERDRIVE?: Hyperdrive
  FEED_BASE_URL?: string
  // Machine translation of listing text into Spanish and chat answers; without it, Spanish pages show listings in
  // English and asking says it isn't available.
  ANTHROPIC_API_KEY?: string
  // Only the end-to-end journeys set this, to a closed local port, so they never call Anthropic.
  ANTHROPIC_BASE_URL?: string
  // How often one connection may ask a chat question (wrangler.jsonc ratelimits).
  ASK_LIMIT?: RateLimit
  // Twilio's auth token, for the text-message webhook (/sms); unset, texting is closed.
  TWILIO_AUTH_TOKEN?: string
  // The steward's intake address for listing corrections.
  CORRECTIONS_EMAIL?: string
}
