#!/usr/bin/env bash
# exit on error
set -o errexit

npm install --production=false --ignore-scripts
npx --no-install prisma generate
npm run build
