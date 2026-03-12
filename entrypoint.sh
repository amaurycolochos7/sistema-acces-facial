#!/bin/sh
echo "[INIT] Running Prisma db push..."
if node_modules/.bin/prisma db push --accept-data-loss --skip-generate; then
  echo "[OK] DB schema pushed!"

  # Fix vector dimension: Prisma can't alter Unsupported types, so we do it manually
  echo "[INIT] Checking vector column dimension..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    (async () => {
      try {
        // Check current dimension
        const info = await p.\$queryRaw\`
          SELECT atttypmod FROM pg_attribute
          WHERE attrelid = '\"FaceDescriptor\"'::regclass
          AND attname = 'descriptor'
        \`;
        const currentDim = info[0]?.atttypmod || 0;
        console.log('[INFO] Current vector dimension:', currentDim);
        if (currentDim !== 1024) {
          console.log('[INIT] Altering vector column to 1024 dimensions...');
          await p.\$executeRawUnsafe('ALTER TABLE \"FaceDescriptor\" ALTER COLUMN descriptor TYPE vector(1024)');
          console.log('[OK] Vector column updated to 1024!');
        } else {
          console.log('[OK] Vector column already 1024 dimensions');
        }
      } catch(e) {
        console.log('[WARN] Vector alter:', e.message);
      } finally {
        await p.\$disconnect();
      }
    })();
  "

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
