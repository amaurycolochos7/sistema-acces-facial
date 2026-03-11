import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const periods = await prisma.academicPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { schedules: true } } },
  });
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, startDate, endDate, isCurrent } = body;

  if (isCurrent) {
    await prisma.academicPeriod.updateMany({ data: { isCurrent: false } });
  }

  const period = await prisma.academicPeriod.create({
    data: { name, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent: isCurrent || false },
  });
  return NextResponse.json(period, { status: 201 });
}
