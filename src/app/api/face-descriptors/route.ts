import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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

    // Validate descriptor dimensions
    for (let i = 0; i < descriptors.length; i++) {
      if (!Array.isArray(descriptors[i]) || descriptors[i].length !== 128) {
        return NextResponse.json({
          error: `Descriptor ${i + 1} tiene dimension invalida: ${descriptors[i]?.length || 0} (esperado: 128)`,
        }, { status: 400 });
      }
    }

    // Delete existing descriptors for this user (re-enrollment)
    await prisma.faceDescriptor.deleteMany({ where: { userId } });

    // Insert each descriptor using raw SQL for pgvector support
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
