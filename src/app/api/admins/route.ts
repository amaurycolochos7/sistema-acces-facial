import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

export async function GET() {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, fullName: true, level: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password, fullName, level } = body;

  if (!username || !password || !fullName) {
    return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
  }

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const admin = await prisma.admin.create({
    data: { username, passwordHash, fullName, level: level || 'ADMIN' },
    select: { id: true, username: true, fullName: true, level: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(admin, { status: 201 });
}
