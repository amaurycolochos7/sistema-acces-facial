import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const reason = await prisma.exitReason.update({ where: { id }, data: body });
  return NextResponse.json(reason);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.exitReason.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
