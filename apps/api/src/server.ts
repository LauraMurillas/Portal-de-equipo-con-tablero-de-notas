import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-development-secret';
app.use(cors());
app.use(express.json());

type AuthRequest = Request & { user?: { id: string; role: string } };
function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Autenticación requerida' });
  try { req.user = jwt.verify(token, JWT_SECRET) as { id: string; role: string }; next(); }
  catch { return res.status(401).json({ error: 'Sesión inválida' }); }
}
function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Permisos insuficientes' });
  next();
}
const noteInput = z.object({ title: z.string().trim().min(1).max(120), content: z.string().max(5000).default(''), status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).default('BACKLOG'), x: z.number().finite().min(0).max(10000).optional(), y: z.number().finite().min(0).max(10000).optional() });
const userInput = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), role: z.enum(['ADMIN', 'USER']), active: z.boolean() });

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos de acceso inválidos' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.password))) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
});
app.get('/api/auth/me', auth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user || !user.active) return res.status(401).json({ error: 'Usuario inactivo' });
  res.json(user);
});

app.get('/api/notes', auth, async (req: AuthRequest, res) => {
  const notes = await prisma.note.findMany({ include: { owner: { select: { id: true, name: true, email: true, role: true, active: true } } }, orderBy: [{ updatedAt: 'desc' }] });
  res.json(notes);
});
app.post('/api/notes', auth, async (req: AuthRequest, res) => {
  const parsed = noteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Título y contenido inválidos' });
  const data = parsed.data;
  const note = await prisma.note.create({ data: { title: data.title, content: data.content, status: data.status, x: data.x ?? 40, y: data.y ?? 40, ownerId: req.user!.id } });
  res.status(201).json(note);
});
app.patch('/api/notes/:id', auth, async (req: AuthRequest, res) => {
  const existing = await prisma.note.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: 'Nota no encontrada' });
  const parsed = noteInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos de nota inválidos' });
  const data = parsed.data;
  const note = await prisma.note.update({ where: { id: existing.id }, data: { ...data } });
  res.json(note);
});
app.delete('/api/notes/:id', auth, async (req: AuthRequest, res) => {
  const existing = await prisma.note.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) return res.status(404).json({ error: 'Nota no encontrada' });
  await prisma.note.delete({ where: { id: existing.id } }); res.status(204).send();
});
app.get('/api/metrics', auth, async (_req, res) => {
  const [total, members, grouped, completedThisWeek] = await Promise.all([prisma.note.count(), prisma.user.count({ where: { active: true } }), prisma.note.groupBy({ by: ['status'], _count: true }), prisma.note.count({ where: { status: 'DONE', updatedAt: { gte: new Date(Date.now() - 7 * 86400000) } } })]);
  const byStatus = { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 } as Record<string, number>;
  grouped.forEach((item: { status: string; _count: number }) => { byStatus[item.status] = item._count; });
  res.json({ total, members, byStatus, completedThisWeek });
});
app.get('/api/users', auth, adminOnly, async (_req, res) => res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { name: 'asc' } })));
app.post('/api/users', auth, adminOnly, async (req, res) => {
  const parsed = userInput.extend({ password: z.string().min(8).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos de usuario inválidos' });
  const data = parsed.data;
  try {
    const user = await prisma.user.create({ data: { name: data.name, email: data.email.toLowerCase(), password: await bcrypt.hash(data.password, 12), role: data.role, active: data.active }, select: { id: true, name: true, email: true, role: true, active: true } });
    res.status(201).json(user);
  } catch { res.status(409).json({ error: 'El correo ya está en uso' }); }
});
app.patch('/api/users/:id', auth, adminOnly, async (req: AuthRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  const parsed = userInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos de usuario inválidos' });
  const data = parsed.data;
  const becomesInactiveAdmin = target.role === 'ADMIN' && data.active === false;
  const losesAdminRole = target.role === 'ADMIN' && data.role === 'USER';
  if ((becomesInactiveAdmin || losesAdminRole) && await prisma.user.count({ where: { role: 'ADMIN', active: true, id: { not: target.id } } }) < 1) return res.status(400).json({ error: 'Debe existir al menos un administrador activo' });
  try { res.json(await prisma.user.update({ where: { id: target.id }, data: { ...data, email: data.email?.toLowerCase() }, select: { id: true, name: true, email: true, role: true, active: true } })); }
  catch { res.status(409).json({ error: 'El correo ya está en uso' }); }
});
app.delete('/api/users/:id', auth, adminOnly, async (req: AuthRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.role === 'ADMIN' && await prisma.user.count({ where: { role: 'ADMIN', active: true, id: { not: target.id } } }) < 1) return res.status(400).json({ error: 'Debe existir al menos un administrador activo' });
  await prisma.user.delete({ where: { id: target.id } });
  res.status(204).send();
});
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { console.error(error); res.status(500).json({ error: 'Error interno' }); });

const port = Number(process.env.PORT ?? 4000);
if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
export { app, prisma };
