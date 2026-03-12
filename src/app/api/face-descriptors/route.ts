import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Auto-fix vector column dimension if needed
async function ensureVectorDimension() {
  try {
    const colInfo = await prisma.$queryRaw<{ col_type: string }[]>`
      SELECT format_type(atttypid, atttypmod) as col_type
      FROM pg_attribute 
      WHERE attrelid = '"FaceDescriptor"'::regclass 
      AND attname = 'descriptor'
    `;
    const currentType = colInfo[0]?.col_type || '';
    if (currentType !== 'vector(1024)') {
      console.log('[FACE-DESCRIPTORS] Auto-fixing vector column:', currentType, '-> vector(1024)');
      await prisma.$executeRawUnsafe('DELETE FROM "FaceDescriptor"');
      await prisma.$executeRawUnsafe('ALTER TABLE "FaceDescriptor" ALTER COLUMN descriptor TYPE vector(1024)');
      await prisma.$executeRawUnsafe('UPDATE "User" SET "hasFaceRegistered" = false');
      console.log('[FACE-DESCRIPTORS] Vector column fixed to 1024!');
      return true;
    }
  } catch (e) {
    console.error('[FACE-DESCRIPTORS] Error checking vector dimension:', e);
  }
  return false;
}

// POST /api/face-descriptors — save face descriptors for a user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, descriptors, photoData } = body;

    if (!userId || !descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      return NextResponse.json({ error: 'userId y descriptors[] son requeridos' }, { status: 400 });
    }

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validate descriptor dimensions (Human.js faceres = 1024)
    for (let i = 0; i < descriptors.length; i++) {
      if (!Array.isArray(descriptors[i]) || descriptors[i].length !== 1024) {
        return NextResponse.json({
          error: `Descriptor ${i + 1} tiene dimension invalida: ${descriptors[i]?.length || 0} (esperado: 1024)`,
        }, { status: 400 });
      }
    }

    // Delete existing descriptors for this user (re-enrollment)
    await prisma.faceDescriptor.deleteMany({ where: { userId } });

    // Try to insert descriptors
    const insertDescriptors = async () => {
      const results = [];
      for (let i = 0; i < descriptors.length; i++) {
        const descriptor = descriptors[i];
        const vectorStr = `[${descriptor.join(',')}]`;
        const photo = photoData?.[i] || null;

        const result = await prisma.$executeRaw`
          INSERT INTO "FaceDescriptor" (id, "userId", descriptor, "photoUrl", "createdAt")
          VALUES (
            gen_random_uuid(),
            ${userId},
            ${vectorStr}::vector,
            ${photo},
            NOW()
          )
        `;
        results.push(result);
      }
      return results;
    };

    try {
      await insertDescriptors();
    } catch (insertError: unknown) {
      // Self-healing: if dimension mismatch, auto-fix and retry
      const errMsg = insertError instanceof Error ? insertError.message : '';
      if (errMsg.includes('expected 128 dimensions') || errMsg.includes('expected') && errMsg.includes('dimensions')) {
        console.log('[FACE-DESCRIPTORS] Dimension mismatch detected, auto-fixing...');
        await ensureVectorDimension();
        // Retry after fix
        await prisma.faceDescriptor.deleteMany({ where: { userId } });
        await insertDescriptors();
      } else {
        throw insertError; // Re-throw if it's a different error
      }
    }

    // Update user's hasFaceRegistered flag
    await prisma.user.update({
      where: { id: userId },
      data: { hasFaceRegistered: true },
    });

    return NextResponse.json({
      success: true,
      count: descriptors.length,
      message: `${descriptors.length} descriptores faciales registrados`,
    });
  } catch (error: unknown) {
    console.error('[FACE-DESCRIPTORS] Error saving:', error);
    const msg = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: `Error al guardar: ${msg}` }, { status: 500 });
  }
}

// GET /api/face-descriptors?userId=xxx — get descriptors for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
  }

  const descriptors = await prisma.faceDescriptor.findMany({
    where: { userId },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ count: descriptors.length, descriptors });
}
