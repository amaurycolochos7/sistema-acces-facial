import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/stats — get biometric registration stats
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get('role') || '';

  const where: Record<string, unknown> = { isActive: true };
  if (role) where.role = role;

  const total = await prisma.user.count({ where });
  const withFace = await prisma.user.count({ where: { ...where, hasFaceRegistered: true } });
  const withoutFace = total - withFace;

  return NextResponse.json({ total, withFace, withoutFace });
}
