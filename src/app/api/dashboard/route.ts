import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Today's entries and exits
  const [todayEntries, todayExits, todayLate, offlineSync] = await Promise.all([
    prisma.accessLog.count({ where: { type: 'ENTRY', timestamp: { gte: startOfDay, lte: endOfDay } } }),
    prisma.accessLog.count({ where: { type: 'EXIT', timestamp: { gte: startOfDay, lte: endOfDay } } }),
    prisma.accessLog.count({ where: { type: 'ENTRY', punctuality: 'LATE', timestamp: { gte: startOfDay, lte: endOfDay } } }),
    prisma.accessLog.count({ where: { isOfflineSync: true, timestamp: { gte: startOfDay, lte: endOfDay } } }),
  ]);

  // People currently inside (entries without matching exit)
  const insideCount = Math.max(0, todayEntries - todayExits);

  // Yesterday's stats for comparison
  const yesterday = new Date(startOfDay);
  yesterday.setDate(yesterday.getDate() - 1);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59);

  const [yesterdayEntries, yesterdayExits] = await Promise.all([
    prisma.accessLog.count({ where: { type: 'ENTRY', timestamp: { gte: yesterday, lte: endOfYesterday } } }),
    prisma.accessLog.count({ where: { type: 'EXIT', timestamp: { gte: yesterday, lte: endOfYesterday } } }),
  ]);

  // Entries/Exits by hour (today)
  const hourlyLogs = await prisma.accessLog.findMany({
    where: { timestamp: { gte: startOfDay, lte: endOfDay } },
    select: { type: true, timestamp: true },
    orderBy: { timestamp: 'asc' },
  });

  const hourlyData: { hour: string; entries: number; exits: number }[] = [];
  for (let h = 6; h <= 22; h++) {
    const hourStr = `${String(h).padStart(2, '0')}:00`;
    const entries = hourlyLogs.filter(l => l.type === 'ENTRY' && l.timestamp.getHours() === h).length;
    const exits = hourlyLogs.filter(l => l.type === 'EXIT' && l.timestamp.getHours() === h).length;
    hourlyData.push({ hour: hourStr, entries, exits });
  }

  // Punctuality distribution (today)
  const [onTime, late, absent] = await Promise.all([
    prisma.accessLog.count({ where: { type: 'ENTRY', punctuality: 'ON_TIME', timestamp: { gte: startOfDay, lte: endOfDay } } }),
    prisma.accessLog.count({ where: { type: 'ENTRY', punctuality: 'LATE', timestamp: { gte: startOfDay, lte: endOfDay } } }),
    prisma.accessLog.count({ where: { type: 'ENTRY', punctuality: 'ABSENT', timestamp: { gte: startOfDay, lte: endOfDay } } }),
  ]);

  // Top temporary exits today
  const topExits: Array<{ userId: string; _count: { id: number } }> = await prisma.accessLog.groupBy({
    by: ['userId'],
    where: { type: 'EXIT', timestamp: { gte: startOfDay, lte: endOfDay } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const topExitUsers = await Promise.all(
    topExits.map(async (e) => {
      const user = await prisma.user.findUnique({ where: { id: e.userId }, include: { career: true } });
      return {
        name: user?.fullName || 'Desconocido',
        career: user?.career?.code || '—',
        exits: e._count.id,
      };
    })
  );

  // Recent 10 logs
  const recentLogs = await prisma.accessLog.findMany({
    where: { timestamp: { gte: startOfDay, lte: endOfDay } },
    include: { user: { include: { career: true } }, exitReason: true },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  const entryTrend = yesterdayEntries > 0
    ? `${todayEntries > yesterdayEntries ? '+' : ''}${todayEntries - yesterdayEntries} vs. ayer`
    : 'Sin datos ayer';
  const exitTrend = yesterdayExits > 0
    ? `${todayExits > yesterdayExits ? '+' : ''}${todayExits - yesterdayExits} vs. ayer`
    : 'Sin datos ayer';

  return NextResponse.json({
    metrics: {
      todayEntries,
      todayExits,
      todayLate,
      insideCount,
      offlineSync,
      entryTrend,
      exitTrend,
      entryTrendUp: todayEntries >= yesterdayEntries,
      exitTrendUp: todayExits >= yesterdayExits,
    },
    hourlyData,
    punctuality: { onTime, late, absent },
    topExitUsers,
    recentLogs: recentLogs.map(l => ({
      id: l.id,
      type: l.type,
      timestamp: l.timestamp,
      punctuality: l.punctuality,
      confidence: l.confidence,
      userName: l.user.fullName,
      controlNumber: l.user.controlNumber,
      career: l.user.career?.code || '—',
      exitReason: l.exitReason ? `${l.exitReason.icon} ${l.exitReason.name}` : null,
    })),
  });
}
