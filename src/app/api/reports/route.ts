import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const dateFrom = params.get('dateFrom') || '';
  const dateTo = params.get('dateTo') || '';
  const userId = params.get('userId') || '';
  const careerId = params.get('careerId') || '';
  const format = params.get('format') || 'json'; // json or csv

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom y dateTo requeridos' }, { status: 400 });
  }

  const start = new Date(dateFrom);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);

  // Build user filter
  const userWhere: Record<string, unknown> = { isActive: true };
  if (userId) userWhere.id = userId;
  if (careerId) userWhere.careerId = careerId;

  const users = await prisma.user.findMany({
    where: userWhere,
    include: { career: true },
    orderBy: { fullName: 'asc' },
  });

  // Get schedule config
  const schedule = await prisma.scheduleConfig.findFirst({
    where: { isActive: true, period: { isCurrent: true } },
  });

  const report = [];

  for (const user of users) {
    // Get all logs for this user in date range
    const logs = await prisma.accessLog.findMany({
      where: {
        userId: user.id,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
      include: { exitReason: true },
    });

    // Group logs by date
    const logsByDate = new Map<string, typeof logs>();
    for (const log of logs) {
      const dateKey = log.timestamp.toISOString().slice(0, 10);
      if (!logsByDate.has(dateKey)) logsByDate.set(dateKey, []);
      logsByDate.get(dateKey)!.push(log);
    }

    let totalMinutes = 0;
    let daysPresent = 0;
    let daysLate = 0;
    let daysAbsent = 0;
    let daysOnTime = 0;
    const dailyDetails = [];

    // Iterate each day
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().slice(0, 10);
      const dayLogs = logsByDate.get(dateKey) || [];

      if (dayLogs.length > 0) {
        daysPresent++;

        // Calculate effective hours by pairing entries and exits
        let dayMinutes = 0;
        const entries = dayLogs.filter((l: typeof logs[0]) => l.type === 'ENTRY');
        const exits = dayLogs.filter((l: typeof logs[0]) => l.type === 'EXIT');

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          // Find the next exit after this entry
          const matchingExit = exits.find((e: typeof logs[0]) => e.timestamp > entry.timestamp);
          if (matchingExit) {
            const diff = (matchingExit.timestamp.getTime() - entry.timestamp.getTime()) / 60000;
            dayMinutes += diff;
          } else if (schedule) {
            // No exit found — assume they stayed until official exit time
            const [exitH, exitM] = schedule.officialExit.split(':').map(Number);
            const exitTime = new Date(entry.timestamp);
            exitTime.setHours(exitH, exitM, 0, 0);
            if (exitTime > entry.timestamp) {
              dayMinutes += (exitTime.getTime() - entry.timestamp.getTime()) / 60000;
            }
          }
        }

        totalMinutes += dayMinutes;

        // Punctuality for this day
        const firstEntry = entries[0];
        const punct = firstEntry?.punctuality || null;
        if (punct === 'ON_TIME') daysOnTime++;
        else if (punct === 'LATE') daysLate++;
        else if (punct === 'ABSENT') daysAbsent++;

        dailyDetails.push({
          date: dateKey,
          firstEntry: firstEntry?.timestamp.toISOString() || null,
          lastExit: exits.length > 0 ? exits[exits.length - 1].timestamp.toISOString() : null,
          minutes: Math.round(dayMinutes),
          hours: (dayMinutes / 60).toFixed(1),
          punctuality: punct,
          entries: entries.length,
          exits: exits.length,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    report.push({
      userId: user.id,
      controlNumber: user.controlNumber,
      fullName: user.fullName,
      role: user.role,
      career: user.career?.name || '—',
      careerCode: user.career?.code || '—',
      summary: {
        daysPresent,
        daysOnTime,
        daysLate,
        daysAbsent,
        totalMinutes: Math.round(totalMinutes),
        totalHours: (totalMinutes / 60).toFixed(1),
        avgDailyMinutes: daysPresent > 0 ? Math.round(totalMinutes / daysPresent) : 0,
        punctualityRate: daysPresent > 0 ? Math.round((daysOnTime / daysPresent) * 100) : 0,
      },
      dailyDetails,
    });
  }

  // CSV export
  if (format === 'csv') {
    const header = 'Control,Nombre,Rol,Carrera,Días Presente,A Tiempo,Retardos,Faltas,Horas Totales,Horas Prom/Día,% Puntualidad';
    const rows = report.map(r =>
      `${r.controlNumber},"${r.fullName}",${r.role},${r.careerCode},${r.summary.daysPresent},${r.summary.daysOnTime},${r.summary.daysLate},${r.summary.daysAbsent},${r.summary.totalHours},${(r.summary.avgDailyMinutes / 60).toFixed(1)},${r.summary.punctualityRate}%`
    );
    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_${dateFrom}_${dateTo}.csv"`,
      },
    });
  }

  return NextResponse.json({ dateRange: { from: dateFrom, to: dateTo }, totalUsers: report.length, report });
}
