import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/access-logs/register — create an access log (entry or exit) from the kiosk
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, type, confidence, exitReasonId, exitNote, isOfflineSync } = body;

  if (!userId || !type || !['ENTRY', 'EXIT'].includes(type)) {
    return NextResponse.json({ error: 'userId y type (ENTRY|EXIT) requeridos' }, { status: 400 });
  }

  // Validate user exists
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { career: true } });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  // Determine punctuality for entries
  let punctuality: string | null = null;
  if (type === 'ENTRY') {
    // Get current schedule config
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const schedule = await prisma.scheduleConfig.findFirst({
      where: { isActive: true, period: { isCurrent: true } },
      orderBy: { officialEntry: 'asc' },
    });

    if (schedule) {
      if (timeStr <= schedule.officialEntry) {
        punctuality = 'ON_TIME';
      } else if (timeStr <= schedule.lateEntry) {
        punctuality = 'ON_TIME';
      } else if (timeStr <= schedule.cutoffEntry) {
        punctuality = 'LATE';
      } else {
        punctuality = 'ABSENT';
      }
    }
  }

  // Create the access log
  const log = await prisma.accessLog.create({
    data: {
      userId,
      type,
      confidence: confidence || null,
      punctuality,
      exitReasonId: type === 'EXIT' ? (exitReasonId || null) : null,
      exitNote: type === 'EXIT' ? (exitNote || null) : null,
      isOfflineSync: isOfflineSync || false,
    },
    include: {
      user: { include: { career: true } },
      exitReason: true,
    },
  });

  return NextResponse.json({
    success: true,
    log: {
      id: log.id,
      type: log.type,
      timestamp: log.timestamp,
      punctuality: log.punctuality,
      user: {
        fullName: log.user.fullName,
        controlNumber: log.user.controlNumber,
        career: log.user.career?.name || null,
      },
    },
    message: type === 'ENTRY'
      ? `Entrada registrada: ${user.fullName}${punctuality === 'LATE' ? ' (RETARDO)' : ''}`
      : `Salida registrada: ${user.fullName}`,
  });
}
