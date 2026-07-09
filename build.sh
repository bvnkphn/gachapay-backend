#!/usr/bin/env bash
# exit on error
set -o errexit

npm install --production=false
npx prisma generate
npm run build
