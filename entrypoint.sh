#!/bin/sh
echo "🔄 Running Prisma db push..."
if node_modules/.bin/prisma db push --accept-data-loss --skip-generate; then
  echo "✅ DB schema pushed!"
  echo "🌱 Running seed..."
  if node prisma/seed.js; then
    echo "✅ Seed completed!"
  else
    echo "⚠️ Seed had issues (may already be seeded)"
  fi
else
  echo "⚠️ DB push failed - starting server anyway"
fi

echo "🚀 Starting Next.js server..."
exec node server.js
