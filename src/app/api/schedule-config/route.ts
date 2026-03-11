import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const configs = await prisma.scheduleConfig.findMany({
    include: { period: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const config = await prisma.scheduleConfig.create({ data: body, include: { period: true } });
  return NextResponse.json(config, { status: 201 });
}
