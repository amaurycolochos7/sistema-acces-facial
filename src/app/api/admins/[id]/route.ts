import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.fullName) updateData.fullName = body.fullName;
  if (body.level) updateData.level = body.level;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.password) updateData.passwordHash = await hash(body.password, 12);

  const admin = await prisma.admin.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, fullName: true, level: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(admin);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.admin.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
