#!/bin/sh

echo "Waiting for Postgres..."
until pg_isready -h postgres-db -p 5432 -U postgres; do
  sleep 2
done

# Copy DATABASE_URL to DIRECT_URL if DIRECT_URL is not set
if [ -z "$DIRECT_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

echo "Pulling latest database schema..."
npx --no-install prisma db pull

echo "Generating Prisma client..."
npx --no-install prisma generate

echo "Starting the application..."
# exec node dist/main.js
exec node dist/src/main.js
