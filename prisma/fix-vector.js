const { PrismaClient } = require('@prisma/client');

async function fixVectorDimension() {
  const prisma = new PrismaClient();
  try {
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'FaceDescriptor'
      ) as exists
    `;
    
    if (!tableExists[0]?.exists) {
      console.log('[FIX-VECTOR] FaceDescriptor table not found, skipping');
      return;
    }

    // Get current column type info
    const colInfo = await prisma.$queryRaw`
      SELECT format_type(atttypid, atttypmod) as col_type
      FROM pg_attribute 
      WHERE attrelid = '"FaceDescriptor"'::regclass 
      AND attname = 'descriptor'
    `;
    
    const currentType = colInfo[0]?.col_type || 'unknown';
    console.log('[FIX-VECTOR] Current descriptor column type:', currentType);

    if (currentType === 'vector(1024)') {
      console.log('[FIX-VECTOR] Already vector(1024), no change needed');
      return;
    }

    // Delete existing descriptors (they have wrong dimensions anyway)
    console.log('[FIX-VECTOR] Deleting existing descriptors with old dimensions...');
    await prisma.$executeRawUnsafe('DELETE FROM "FaceDescriptor"');
    
    // Alter column
    console.log('[FIX-VECTOR] Altering column to vector(1024)...');
    await prisma.$executeRawUnsafe('ALTER TABLE "FaceDescriptor" ALTER COLUMN descriptor TYPE vector(1024)');
    console.log('[FIX-VECTOR] Column updated to vector(1024) successfully!');
    
    // Reset hasFaceRegistered since descriptors were deleted
    await prisma.$executeRawUnsafe('UPDATE "User" SET "hasFaceRegistered" = false');
    console.log('[FIX-VECTOR] Reset hasFaceRegistered flags');
    
  } catch (err) {
    console.error('[FIX-VECTOR] Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixVectorDimension();
