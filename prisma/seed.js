// Compiled seed for Docker runtime (no ts-node needed)
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding database...');

  // Create default admin
  const adminPassword = await hash('admin123', 12);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Administrador Principal',
      level: 'SUPER_ADMIN',
    },
  });
  console.log('[OK] Admin created (admin / admin123)');

  // Create academic period
  const existing = await prisma.academicPeriod.findFirst({ where: { isCurrent: true } });
  let periodId;
  if (existing) {
    periodId = existing.id;
    console.log('[OK] Academic period already exists');
  } else {
    const period = await prisma.academicPeriod.create({
      data: {
        name: 'Ene-Jun 2026',
        startDate: new Date('2026-01-13'),
        endDate: new Date('2026-06-30'),
        isCurrent: true,
      },
    });
    periodId = period.id;
    console.log('[OK] Academic period created');
  }

  // Create schedule config
  const scheduleExists = await prisma.scheduleConfig.findFirst({ where: { isActive: true } });
  if (!scheduleExists) {
    await prisma.scheduleConfig.create({
      data: {
        name: 'Turno Matutino',
        officialEntry: '07:00',
        lateEntry: '07:15',
        cutoffEntry: '07:30',
        officialExit: '14:00',
        daysActive: 'L,M,Mi,J,V',
        periodId: periodId,
        isActive: true,
      },
    });
    console.log('[OK] Schedule config created');
  } else {
    console.log('[OK] Schedule config already exists');
  }

  // Create careers
  const careers = [
    { name: 'Ingenieria en Sistemas Computacionales', code: 'ISC' },
    { name: 'Ingenieria Industrial', code: 'II' },
    { name: 'Ingenieria en Gestion Empresarial', code: 'IGE' },
    { name: 'Licenciatura en Administracion', code: 'LA' },
    { name: 'Contador Publico', code: 'CP' },
  ];
  for (const career of careers) {
    await prisma.career.upsert({
      where: { code: career.code },
      update: {},
      create: career,
    });
  }
  console.log('[OK] Careers created');

  // Create exit reasons
  const reasonCount = await prisma.exitReason.count();
  if (reasonCount === 0) {
    const exitReasons = [
      { name: 'Fin de jornada / Salida definitiva', category: 'DEFINITIVE', icon: 'home', sortOrder: 1, isDefault: true },
      { name: 'Salida temporal (Mandado / Comida)', category: 'TEMPORARY', icon: 'refresh-cw', sortOrder: 2 },
      { name: 'Cita medica', category: 'MEDICAL', icon: 'hospital', sortOrder: 3 },
      { name: 'Permiso administrativo', category: 'ADMINISTRATIVE', icon: 'clipboard', sortOrder: 4 },
      { name: 'Evento institucional', category: 'ADMINISTRATIVE', icon: 'graduation-cap', sortOrder: 5 },
      { name: 'Emergencia personal', category: 'TEMPORARY', icon: 'siren', sortOrder: 6 },
    ];
    for (const reason of exitReasons) {
      await prisma.exitReason.create({ data: reason });
    }
    console.log('[OK] Exit reasons created');
  } else {
    console.log('[OK] Exit reasons already exist');
  }

  console.log('[SEED] Seed completed!');
}

main()
  .catch((e) => {
    console.error('[ERROR] Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
