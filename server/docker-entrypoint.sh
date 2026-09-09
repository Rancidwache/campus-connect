#!/bin/sh
set -e

# Apply any pending database migrations before the API starts.
# Uses DIRECT_URL (unpooled) if set, otherwise DATABASE_URL.
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "› prisma migrate deploy"
  npx prisma migrate deploy
fi

exec "$@"
