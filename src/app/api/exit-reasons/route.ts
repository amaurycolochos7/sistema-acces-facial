import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const reasons = await prisma.exitReason.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(reasons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, icon, sortOrder, isDefault } = body;

  if (!name || !category) {
    return NextResponse.json({ error: 'Nombre y categoría requeridos' }, { status: 400 });
  }

  const reason = await prisma.exitReason.create({
    data: { name, category, icon: icon || '📋', sortOrder: sortOrder || 0, isDefault: isDefault || false },
  });
  return NextResponse.json(reason, { status: 201 });
}
