#!/usr/bin/env bash
# Prepare a plain Postgres for local development and CI (never the hosted project):
# Supabase role shim, then the runtime/worker roles with local passwords.
#
# Works in two places:
# * docker-compose: mounted into /docker-entrypoint-initdb.d (uses POSTGRES_USER/DB).
# * CI: run with PGHOST/PGUSER/PGPASSWORD/PGDATABASE set.
set -euo pipefail

here="${DB_SCRIPTS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
export PGUSER="${PGUSER:-${POSTGRES_USER:-postgres}}"
export PGDATABASE="${PGDATABASE:-${POSTGRES_DB:-postgres}}"
runtime_password="${APP_RUNTIME_PASSWORD:-app_runtime_password}"
worker_password="${APP_WORKER_PASSWORD:-app_worker_password}"

psql -v ON_ERROR_STOP=1 -f "$here/local_supabase_shim.sql"
sed -e "s/REPLACE_WITH_A_STRONG_PASSWORD/$runtime_password/" \
    -e "s/REPLACE_WITH_A_STRONG_WORKER_PASSWORD/$worker_password/" \
    "$here/bootstrap_runtime_role.sql" | psql -v ON_ERROR_STOP=1
