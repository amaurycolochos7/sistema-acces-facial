#!/bin/sh
set -e

echo "🔄 Running Prisma db push..."
node_modules/.bin/prisma db push --accept-data-loss --skip-generate
echo "✅ DB schema pushed!"

echo "🌱 Running seed..."
node prisma/seed.js
echo "✅ Seed completed!"

echo "🚀 Starting Next.js server..."
exec node server.js
