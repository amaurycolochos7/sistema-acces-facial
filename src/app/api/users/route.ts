import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const careerId = searchParams.get('careerId') || '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { controlNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (careerId) where.careerId = careerId;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { career: true },
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { controlNumber, fullName, email, phone, tutorPhone, role, careerId } = body;

  if (!controlNumber || !fullName || !email || !phone || !role) {
    return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { controlNumber } });
  if (existing) {
    return NextResponse.json({ error: 'El número de control ya existe' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      controlNumber,
      fullName,
      email,
      phone,
      tutorPhone: tutorPhone || null,
      role,
      careerId: careerId || null,
    },
    include: { career: true },
  });

  return NextResponse.json(user, { status: 201 });
}
