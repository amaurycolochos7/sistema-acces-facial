import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json(careers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, code } = body;

  if (!name || !code) {
    return NextResponse.json({ error: 'Nombre y código son requeridos' }, { status: 400 });
  }

  const career = await prisma.career.create({ data: { name, code } });
  return NextResponse.json(career, { status: 201 });
}
