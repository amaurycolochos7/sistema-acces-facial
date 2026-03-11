import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { FACE_MATCH_THRESHOLD } from '@/lib/human-config';

// POST /api/face-verify — match a face descriptor against all stored descriptors using pgvector
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { descriptor, liveness, antispoof } = body;

  if (!descriptor || !Array.isArray(descriptor)) {
    return NextResponse.json({ error: 'descriptor[] requerido' }, { status: 400 });
  }

  // Validate liveness and antispoof scores
  if (liveness !== undefined && liveness < 0.3) {
    return NextResponse.json({
      match: false,
      error: 'Liveness check failed',
      message: 'No se detectó un rostro real. Por favor, intenta de nuevo.',
    }, { status: 400 });
  }

  if (antispoof !== undefined && antispoof < 0.3) {
    return NextResponse.json({
      match: false,
      error: 'Anti-spoof check failed',
      message: 'Se detectó una imagen o pantalla. Usa tu rostro real.',
    }, { status: 400 });
  }

  const vectorStr = `[${descriptor.join(',')}]`;

  // Use pgvector cosine distance operator (<=>)  to find the closest match
  // Lower distance = better match. Cosine distance of 0 = identical.
  const results: Array<{
    id: string;
    userId: string;
    distance: number;
  }> = await prisma.$queryRaw`
    SELECT
      fd.id,
      fd."userId",
      (fd.descriptor <=> ${vectorStr}::vector) as distance
    FROM "FaceDescriptor" fd
    JOIN "User" u ON u.id = fd."userId"
    WHERE u."isActive" = true AND u."hasFaceRegistered" = true
    ORDER BY fd.descriptor <=> ${vectorStr}::vector
    LIMIT 5
  `;

  if (results.length === 0) {
    return NextResponse.json({
      match: false,
      message: 'No hay usuarios registrados con rostro.',
    });
  }

  const best = results[0];
  // Cosine distance: 0 = identical, 2 = opposite
  // Convert to similarity: 1 - (distance / 2) gives 0-1 range
  const similarity = 1 - (best.distance / 2);
  const isMatch = similarity >= FACE_MATCH_THRESHOLD;

  if (!isMatch) {
    return NextResponse.json({
      match: false,
      confidence: similarity,
      message: 'No se encontró coincidencia.',
    });
  }

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: best.userId },
    include: { career: true },
  });

  return NextResponse.json({
    match: true,
    confidence: similarity,
    user: {
      id: user!.id,
      controlNumber: user!.controlNumber,
      fullName: user!.fullName,
      role: user!.role,
      career: user!.career?.name || null,
      careerCode: user!.career?.code || null,
    },
  });
}
