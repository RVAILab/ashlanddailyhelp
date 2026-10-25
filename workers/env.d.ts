// Optional until production has a database: a Hyperdrive binding, or a DATABASE_URL secret (.dev.vars locally).
interface Env {
  DATABASE_URL?: string
  HYPERDRIVE?: Hyperdrive
}
