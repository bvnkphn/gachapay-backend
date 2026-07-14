#!/bin/sh

set -e

DB_USER=${POSTGRES_USER:-gachapay}
DB_NAME=${POSTGRES_DB:-game_topup_db}

echo "Waiting for Postgres..."
until pg_isready -h postgres-db -p 5432 -U "$DB_USER" -d "$DB_NAME"; do
  sleep 2
done

# Copy DATABASE_URL to DIRECT_URL if DIRECT_URL is not set
if [[ -z "$DIRECT_URL" ]]; then
  export DIRECT_URL="$DATABASE_URL"
fi

echo "Applying Prisma schema to database..."
npx prisma db push

echo "Generating Prisma client..."
npx --no-install prisma generate

echo "Starting the application..."
exec node dist/src/main.js
