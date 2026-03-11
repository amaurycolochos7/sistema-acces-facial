import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
  console.log('✅ Admin created (admin / admin123)');

  // Create academic period
  const period = await prisma.academicPeriod.create({
    data: {
      name: 'Ene-Jun 2026',
      startDate: new Date('2026-01-13'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
    },
  });
  console.log('✅ Academic period created');

  // Create schedule config
  await prisma.scheduleConfig.create({
    data: {
      name: 'Turno Matutino',
      officialEntry: '07:00',
      lateEntry: '07:15',
      cutoffEntry: '07:30',
      officialExit: '14:00',
      daysActive: 'L,M,Mi,J,V',
      periodId: period.id,
      isActive: true,
    },
  });
  console.log('✅ Schedule config created');

  // Create careers
  const careers = [
    { name: 'Ingeniería en Sistemas Computacionales', code: 'ISC' },
    { name: 'Ingeniería Industrial', code: 'II' },
    { name: 'Ingeniería en Gestión Empresarial', code: 'IGE' },
    { name: 'Licenciatura en Administración', code: 'LA' },
    { name: 'Contador Público', code: 'CP' },
  ];
  for (const career of careers) {
    await prisma.career.upsert({
      where: { code: career.code },
      update: {},
      create: career,
    });
  }
  console.log('✅ Careers created');

  // Create exit reasons
  const exitReasons = [
    { name: 'Fin de jornada / Salida definitiva', category: 'DEFINITIVE' as const, icon: '🏠', sortOrder: 1, isDefault: true },
    { name: 'Salida temporal (Mandado / Comida)', category: 'TEMPORARY' as const, icon: '🔄', sortOrder: 2 },
    { name: 'Cita médica', category: 'MEDICAL' as const, icon: '🏥', sortOrder: 3 },
    { name: 'Permiso administrativo', category: 'ADMINISTRATIVE' as const, icon: '📋', sortOrder: 4 },
    { name: 'Evento institucional', category: 'ADMINISTRATIVE' as const, icon: '🎓', sortOrder: 5 },
    { name: 'Emergencia personal', category: 'TEMPORARY' as const, icon: '🚨', sortOrder: 6 },
  ];
  for (const reason of exitReasons) {
    await prisma.exitReason.create({ data: reason });
  }
  console.log('✅ Exit reasons created');

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
