#!/bin/bash
# Local dev launcher.
# Copy .env.example -> .env and fill in real values before running.
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example -> .env and fill in values." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. ./.env
set +a

: "${DATABASE_URL:?DATABASE_URL must be set in .env}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set in .env}"
: "${NEXTAUTH_URL:=http://localhost:3000}"

exec ./node_modules/.bin/next dev -p 3000 2>&1 | tee dev.log
