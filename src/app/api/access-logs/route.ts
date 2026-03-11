import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const userId = searchParams.get('userId') || '';
  const type = searchParams.get('type') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) (where.timestamp as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.timestamp as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59');
  }

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      include: { user: { include: { career: true } }, exitReason: true },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accessLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
}
