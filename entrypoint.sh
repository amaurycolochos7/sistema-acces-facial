#!/bin/sh
echo "[INIT] Running Prisma db push..."
if node_modules/.bin/prisma db push --accept-data-loss --skip-generate; then
  echo "[OK] DB schema pushed!"

  # Fix vector dimension (Prisma can't alter Unsupported types)
  echo "[INIT] Fixing vector column dimension..."
  node prisma/fix-vector.js

  echo "[INIT] Running seed..."
  if node prisma/seed.js; then
    echo "[OK] Seed completed!"
  else
    echo "[WARN] Seed had issues (may already be seeded)"
  fi
else
  echo "[WARN] DB push failed - starting server anyway"
fi

echo "[START] Starting Next.js server..."
exec node server.js
