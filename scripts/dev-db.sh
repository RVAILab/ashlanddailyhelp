#!/bin/sh
# A private Postgres cluster in .postgres/ on port 5433, for development and end-to-end tests.
# Any Postgres 15 or newer works instead; point DATABASE_URL in .dev.vars at it.
set -eu
cd "$(dirname "$0")/.."
bin=$(dirname "$(readlink -f "$(command -v postgres)")")
data=.postgres
port=5433
case "${1:-start}" in
  start)
    [ -d "$data" ] || "$bin/initdb" -D "$data" -U postgres -A trust >/dev/null
    "$bin/pg_ctl" -D "$data" -o "-p $port -k /tmp" -l "$data/log" -w status >/dev/null 2>&1 \
      || "$bin/pg_ctl" -D "$data" -o "-p $port -k /tmp" -l "$data/log" -w start >/dev/null
    "$bin/psql" -h 127.0.0.1 -p $port -U postgres -tAc "select 1 from pg_database where datname = 'ashlanddailyhelp'" | grep -q 1 \
      || "$bin/createdb" -h 127.0.0.1 -p $port -U postgres ashlanddailyhelp
    echo "Postgres on postgres://postgres@127.0.0.1:$port/ashlanddailyhelp"
    ;;
  stop) "$bin/pg_ctl" -D "$data" -w stop ;;
  *) echo "usage: $0 [start|stop]" >&2; exit 2 ;;
esac
