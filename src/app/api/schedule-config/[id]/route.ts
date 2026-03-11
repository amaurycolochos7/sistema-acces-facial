import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const config = await prisma.scheduleConfig.update({ where: { id }, data: body, include: { period: true } });
  return NextResponse.json(config);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.scheduleConfig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
