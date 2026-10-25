// Optional until production has a database (a Hyperdrive binding, or a DATABASE_URL secret) and a feed host.
interface Env {
  DATABASE_URL?: string
  HYPERDRIVE?: Hyperdrive
  FEED_BASE_URL?: string
  // Machine translation of listing text into Spanish; without it, Spanish pages show listings in English.
  ANTHROPIC_API_KEY?: string
}
