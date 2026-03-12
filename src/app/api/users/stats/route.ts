import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/users/stats — get biometric registration stats
export async function GET() {
  const total = await prisma.user.count({ where: { isActive: true } });
  const withFace = await prisma.user.count({ where: { isActive: true, hasFaceRegistered: true } });
  const withoutFace = total - withFace;

  return NextResponse.json({ total, withFace, withoutFace });
}
