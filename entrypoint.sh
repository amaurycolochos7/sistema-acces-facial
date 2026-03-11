#!/bin/sh
set -e

echo "🔄 Running Prisma db push..."
node_modules/.bin/prisma db push --skip-generate 2>/dev/null || echo "⚠️  DB push skipped (may already be in sync)"

echo "🌱 Running seed (if needed)..."
node_modules/.bin/prisma db seed 2>/dev/null || echo "⚠️  Seed skipped"

echo "🚀 Starting Next.js server..."
exec node server.js
