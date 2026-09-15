import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const password = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({ where: { email: 'admin@equipo.local' }, update: {}, create: { name: 'Ana Admin', email: 'admin@equipo.local', password, role: 'ADMIN' } });
  const member = await prisma.user.upsert({ where: { email: 'maria@equipo.local' }, update: {}, create: { name: 'Maria Garcia', email: 'maria@equipo.local', password: await bcrypt.hash('User123!', 12), role: 'USER' } });
  if (await prisma.note.count() === 0) await prisma.note.createMany({ data: [{ title: 'Preparar reunión semanal', content: 'Revisar avances y bloqueos del equipo.', status: 'IN_PROGRESS', x: 48, y: 48, ownerId: admin.id }, { title: 'Documentar API', content: 'Añadir ejemplos de autenticación.', status: 'BACKLOG', x: 360, y: 120, ownerId: member.id }, { title: 'Configurar entorno local', content: 'La base ya está lista.', status: 'DONE', x: 700, y: 64, ownerId: admin.id }] });
}
main().finally(() => prisma.$disconnect());
