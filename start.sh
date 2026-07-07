#!/bin/sh

echo "Waiting for Postgres..."
until pg_isready -h postgres-db -p 5432 -U postgres; do
  sleep 2
done

echo "Pulling latest database schema..."
npx prisma db pull

echo "Generating Prisma client..."
npx prisma generate

echo "Starting the application..."
# exec node dist/main.js
exec node dist/src/main.js
