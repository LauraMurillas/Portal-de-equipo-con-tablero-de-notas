import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Archive, CheckCircle2, ChevronDown, CirclePlus, LayoutDashboard, LogOut, MoreHorizontal, Pencil, Trash2, Users, X } from 'lucide-react';
import type { Metrics, Note, NoteStatus, UserSummary } from '@portal/shared';
import './styles.css';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const columns: NoteStatus[] = ['BACKLOG', 'IN_PROGRESS', 'DONE'];
const labels: Record<NoteStatus, string> = { BACKLOG: 'Pendiente', IN_PROGRESS: 'En curso', DONE: 'Completado' };
const colors: Record<NoteStatus, string> = { BACKLOG: 'coral', IN_PROGRESS: 'gold', DONE: 'mint' };
type PositionedNote = Note & { x: number; y: number };
function request<T>(path: string, options: RequestInit = {}) { return fetch(`${API}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}), Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } }).then(async response => { if (!response.ok) throw new Error((await response.json()).error ?? 'Error'); return response.status === 204 ? undefined as T : response.json() as T; }); }

function Login({ onLogin }: { onLogin: (user: UserSummary, token: string) => void }) {
  const [email, setEmail] = useState('admin@equipo.local'); const [password, setPassword] = useState('Admin123!'); const [error, setError] = useState('');
  async function submit(event: React.FormEvent) { event.preventDefault(); try { const result = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await result.json(); if (!result.ok) throw new Error(data.error); localStorage.setItem('token', data.token); onLogin(data.user, data.token); } catch (e) { setError((e as Error).message); } }
  return <main className="login-shell"><div className="login-art"><div className="brand-mark">Fixlat</div><div><p className="eyebrow">PORTAL DE EQUIPO</p><h1>Ideas en movimiento.</h1><p>Un espacio vivo para compartir y trabajar en equipo</p></div><span className="art-note">Tablero y registro de actividades</span></div><form className="login-form" onSubmit={submit}><p className="eyebrow">ACCESO DEL EQUIPO</p><h2>Bienvenido de vuelta.</h2><p className="muted">Entra para continuar donde lo dejaste.</p><label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className="error">{error}</p>}<button className="primary-button" type="submit">Entrar al espacio <span>→</span></button><p className="login-hint">Demo: admin@equipo.local / Admin123!</p></form></main>;
}

function UsersPanel({ users, onUpdate }: { users: UserSummary[]; onUpdate: (user: UserSummary) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER', active: true });
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [error, setError] = useState('');

  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const user = await request<UserSummary>('/api/users', { method: 'POST', body: JSON.stringify(form) });
      onUpdate(user);
      setForm({ name: '', email: '', password: '', role: 'USER', active: true });
      setError('');
    } catch (cause) { setError((cause as Error).message); }
  }

  async function toggle(user: UserSummary) {
    try { onUpdate(await request<UserSummary>(`/api/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) })); }
    catch (cause) { setError((cause as Error).message); }
  }

  async function edit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await request<UserSummary>(`/api/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify({ name: editingUser.name, email: editingUser.email, role: editingUser.role }) });
      onUpdate(updated);
      setEditingUser(null);
      setError('');
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="users-view">
    <form className="user-create" onSubmit={create}>
      <h3>Nuevo miembro</h3>
      <input placeholder="Nombre" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required />
      <input placeholder="Correo" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
      <input placeholder="Contraseña" type="password" minLength={8} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required />
      <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select>
      <button className="primary-button" type="submit">Crear usuario</button>
      {error && <p className="error">{error}</p>}
    </form>
    <div>  
        <h3>Listado de miembros</h3>
    </div>
    <div className="user-list">{users.map(user => <div className="user-row" key={user.id}>
      <div><strong>{user.name}</strong><span>{user.email} · {user.role}</span></div>
      <div className="user-actions"><button className="quiet-button" onClick={() => setEditingUser({ ...user })}><Pencil size={14} /> Editar</button><button className="quiet-button" onClick={() => toggle(user)}>{user.active ? 'Desactivar' : 'Activar'}</button></div>
    </div>)}</div>
    {editingUser && <div className="modal-backdrop"><form className="note-form user-edit-form" onSubmit={edit}>
      <button type="button" className="close-button" onClick={() => setEditingUser(null)}><X /></button>
      <p className="eyebrow">EDITAR MIEMBRO</p><h2>Actualizar datos.</h2>
      <label>Nombre<input value={editingUser.name} onChange={event => setEditingUser({ ...editingUser, name: event.target.value })} required /></label>
      <label>Correo electrónico<input type="email" value={editingUser.email} onChange={event => setEditingUser({ ...editingUser, email: event.target.value })} required /></label>
      <label>Rol<select value={editingUser.role} onChange={event => setEditingUser({ ...editingUser, role: event.target.value as UserSummary['role'] })}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label>
      <button className="primary-button" type="submit">Guardar cambios <span>→</span></button>
    </form></div>}
  </div>;
}

function App() {
  const [user, setUser] = useState<UserSummary | null>(null); const [notes, setNotes] = useState<Note[]>([]); const [metrics, setMetrics] = useState<Metrics | null>(null); const [filter, setFilter] = useState<NoteStatus | 'ALL'>('ALL'); const [editing, setEditing] = useState<Note | null>(null); const [showForm, setShowForm] = useState(false); const [dragged, setDragged] = useState<Note | null>(null); const [view, setView] = useState<'board' | 'metrics' | 'users'>('board'); const [users, setUsers] = useState<UserSummary[]>([]);
  useEffect(() => { const token = localStorage.getItem('token'); if (token) request<UserSummary>('/api/auth/me').then(setUser).catch(() => localStorage.removeItem('token')); }, []);
  useEffect(() => { if (!user) return; Promise.all([request<Note[]>('/api/notes'), request<Metrics>('/api/metrics')]).then(([n, m]) => { setNotes(n); setMetrics(m); }); if (user.role === 'ADMIN') request<UserSummary[]>('/api/users').then(setUsers); }, [user]);
  if (!user) return <Login onLogin={setUser} />;
  const columns: NoteStatus[] = ['BACKLOG', 'IN_PROGRESS', 'DONE'];
  async function move(note: Note, status: NoteStatus) { const updated = await request<Note>(`/api/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify({ status, x: 0, y: 0 }) }); setNotes(current => current.map(item => item.id === note.id ? { ...item, ...updated } : item)); }
  async function remove(id: string) { if (!confirm('¿Eliminar esta nota?')) return; await request(`/api/notes/${id}`, { method: 'DELETE' }); setNotes(current => current.filter(note => note.id !== id)); }
  function logout() { localStorage.removeItem('token'); setUser(null); }
  return <div className="app-shell"><aside><div className="brand-mark small">Fixlat</div><div className="side-nav"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><LayoutDashboard size={18} /> Tablero</button><button className={view === 'metrics' ? 'active' : ''} onClick={() => setView('metrics')}><Archive size={18} /> Resumen</button>{user.role === 'ADMIN' && <button><Users size={18} /> Equipo</button>}</div><div className="side-bottom"><div className="avatar">{user.name[0]}</div><div><strong>{user.name}</strong><span>{user.role === 'ADMIN' ? 'Administrador' : 'Miembro'}</span></div><button className="icon-button" title="Cerrar sesión" onClick={logout}><LogOut size={16} /></button></div></aside><section className="content"><header><div><p className="eyebrow">ESPACIO DE TRABAJO / 2026</p><h1>{view === 'board' ? 'Tablero de notas' : 'Ritmo del equipo'}</h1></div><button className="primary-button compact" onClick={() => { setEditing(null); setShowForm(true); }}><CirclePlus size={17} /> Nueva nota</button></header>{view === 'metrics' ? <MetricsView metrics={metrics} /> : <><div className="toolbar"><div className="filters"><button className={filter === 'ALL' ? 'selected' : ''} onClick={() => setFilter('ALL')}>Todas <b>{notes.length}</b></button>{columns.map(status => <button key={status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>{labels[status]} <b>{metrics?.byStatus[status] ?? 0}</b></button>)}</div><button className="quiet-button"><ChevronDown size={15} /> Última actualización</button></div><div className="board">{columns.map(status => <div className="column" key={status} onDragOver={e => e.preventDefault()} onDrop={() => dragged && move(dragged, status)}><div className="column-title"><span className={`status-dot ${colors[status]}`} /> <h3>{labels[status]}</h3><span className="count">{notes.filter(n => n.status === status).length}</span><MoreHorizontal size={17} /></div>{notes.filter(note => (filter === 'ALL' || note.status === filter) && note.status === status).map(note => <article className="note-card" key={note.id} draggable onDragStart={() => setDragged(note)}><div className="note-head"><span className="note-tag">{note.owner?.name ?? user.name}</span><button className="card-menu" title="Editar" onClick={() => { setEditing(note); setShowForm(true); }}><Pencil size={14} /></button></div><h4>{note.title}</h4><p>{note.content}</p><div className="note-foot"><span>{new Date(note.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span><button className="delete-button" title="Eliminar" onClick={() => remove(note.id)}><Trash2 size={14} /></button></div></article>)}</div>)}</div></>}</section>{showForm && <NoteForm note={editing} onClose={() => setShowForm(false)} onSaved={note => { setNotes(current => editing ? current.map(item => item.id === note.id ? { ...item, ...note } : item) : [...current, note]); setShowForm(false); }} />}</div>;
}
function MetricsView({ metrics }: { metrics: Metrics | null }) { if (!metrics) return <div className="empty-state">Cargando métricas...</div>; return <div className="metrics-grid"><div className="metric-feature"><span>NOTAS TOTALES</span><strong>{metrics.total}</strong><p>en todo el espacio</p></div><div className="metric-card"><span>COMPLETADAS ESTA SEMANA</span><strong>{metrics.completedThisWeek}</strong><CheckCircle2 /></div><div className="metric-card"><span>MIEMBROS ACTIVOS</span><strong>{metrics.members}</strong><Users /></div><div className="breakdown"><div className="breakdown-head"><h3>Distribución del trabajo</h3><span>Ahora</span></div>{(['BACKLOG', 'IN_PROGRESS', 'DONE'] as NoteStatus[]).map(status => <div className="bar-row" key={status}><span>{labels[status]}</span><div><i className={colors[status]} style={{ width: `${metrics.total ? (metrics.byStatus[status] / metrics.total) * 100 : 0}%` }} /></div><b>{metrics.byStatus[status]}</b></div>)}</div></div> }

function FreeNote({ note, onEdit, onDelete }: { note: PositionedNote; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: note.id });
  const style = { left: note.x, top: note.y, transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, zIndex: isDragging ? 2 : 1 };
  return <article ref={setNodeRef} className={`free-note ${colors[note.status]}${isDragging ? ' dragging' : ''}`} style={style} {...listeners} {...attributes}><div className="note-meta"><span>{labels[note.status]}</span><button type="button" className="note-action" title="Editar nota" onPointerDown={event => event.stopPropagation()} onClick={onEdit}><Pencil size={14} /></button></div><h3>{note.title}</h3><p>{note.content || 'Sin detalle'}</p><button type="button" className="note-delete" title="Eliminar nota" onPointerDown={event => event.stopPropagation()} onClick={onDelete}><Trash2 size={14} /></button></article>;
}

function FreeNoteForm({ note, onClose, onSaved, onDeleted }: { note: PositionedNote | null; onClose: () => void; onSaved: (note: PositionedNote) => void; onDeleted: () => void }) {
  const [title, setTitle] = useState(note?.title ?? ''); const [content, setContent] = useState(note?.content ?? ''); const [status, setStatus] = useState<NoteStatus>(note?.status ?? 'BACKLOG');
  async function save(event: React.FormEvent) { event.preventDefault(); const result = note ? await request<PositionedNote>(`/api/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify({ title, content, status, x: note.x, y: note.y }) }) : await request<PositionedNote>('/api/notes', { method: 'POST', body: JSON.stringify({ title, content, status, x: 40, y: 40 }) }); onSaved({ ...result, owner: note?.owner }); }
  async function remove() { if (!note || !confirm('¿Eliminar esta nota?')) return; await request(`/api/notes/${note.id}`, { method: 'DELETE' }); onDeleted(); }
  return <div className="modal-backdrop"><form className="note-form" onSubmit={save}><button type="button" className="close-button" onClick={onClose}><X /></button><p className="eyebrow">{note ? 'EDITAR NOTA' : 'NUEVA NOTA'}</p><h2>{note ? 'Afinar la idea.' : '¿Cúal es tu siguiente idea?'}</h2><label>Título<input autoFocus value={title} onChange={event => setTitle(event.target.value)} required /></label><label>Detalle<textarea value={content} onChange={event => setContent(event.target.value)} rows={5} /></label><label>Estado<select value={status} onChange={event => setStatus(event.target.value as NoteStatus)}>{columns.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label><div className="form-actions">{note && <button type="button" className="danger-button" onClick={remove}><Trash2 size={15} /> Borrar</button>}<button className="primary-button" type="submit">Guardar <span>→</span></button></div></form></div>;
}

function FreeApp() {
  const [user, setUser] = useState<UserSummary | null>(null); const [notes, setNotes] = useState<PositionedNote[]>([]); const [metrics, setMetrics] = useState<Metrics | null>(null); const [filter, setFilter] = useState<NoteStatus | 'ALL'>('ALL'); const [editing, setEditing] = useState<PositionedNote | null>(null); const [showForm, setShowForm] = useState(false); const [view, setView] = useState<'board' | 'metrics' | 'users'>('board'); const [users, setUsers] = useState<UserSummary[]>([]);
  useEffect(() => { const token = localStorage.getItem('token'); if (token) request<UserSummary>('/api/auth/me').then(setUser).catch(() => localStorage.removeItem('token')); }, []);
  useEffect(() => { if (!user) return; Promise.all([request<PositionedNote[]>('/api/notes'), request<Metrics>('/api/metrics')]).then(([loadedNotes, loadedMetrics]) => { setNotes(loadedNotes); setMetrics(loadedMetrics); }); if (user.role === 'ADMIN') request<UserSummary[]>('/api/users').then(setUsers); }, [user]);
  if (!user) return <Login onLogin={(loggedUser) => setUser(loggedUser)} />;
  async function move(note: PositionedNote, x: number, y: number) { const updated = await request<PositionedNote>(`/api/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify({ x, y }) }); setNotes(current => current.map(item => item.id === note.id ? { ...item, ...updated } : item)); }
  function updateNote(updated: PositionedNote) { setNotes(current => current.some(note => note.id === updated.id) ? current.map(note => note.id === updated.id ? updated : note) : [...current, updated]); setShowForm(false); setEditing(null); }
  function logout() { localStorage.removeItem('token'); setUser(null); }
  const board = view === 'board';
  return <div className="app-shell"><aside><div className="brand-mark small">Fixlat</div><div className="side-nav"><button className={board ? 'active' : ''} onClick={() => setView('board')}><LayoutDashboard size={18} /> Tablero</button><button className={view === 'metrics' ? 'active' : ''} onClick={() => setView('metrics')}><Archive size={18} /> Resumen</button>{user.role === 'ADMIN' && <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}><Users size={18} /> Equipo</button>}</div><div className="side-bottom"><div className="avatar">{user.name[0]}</div><div><strong>{user.name}</strong><span>{user.role === 'ADMIN' ? 'Administrador' : 'Miembro'}</span></div><button className="icon-button" title="Cerrar sesión" onClick={logout}><LogOut size={16} /></button></div></aside><section className="content"><header><div><p className="eyebrow">ESPACIO DE TRABAJO / 2026</p><h1>{board ? 'Tablero de notas' : view === 'users' ? 'Equipo' : 'Ritmo del equipo'}</h1></div>{board && <button className="primary-button compact" onClick={() => { setEditing(null); setShowForm(true); }}><CirclePlus size={17} /> Nueva nota</button>}</header>{view === 'metrics' && <MetricsView metrics={metrics} />}{view === 'users' && user.role === 'ADMIN' && <UsersPanel users={users} onUpdate={member => setUsers(current => current.some(item => item.id === member.id) ? current.map(item => item.id === member.id ? member : item) : [...current, member])} />}{board && <><div className="toolbar"><div className="filters"><button className={filter === 'ALL' ? 'selected' : ''} onClick={() => setFilter('ALL')}>Todas <b>{notes.length}</b></button>{columns.map(status => <button key={status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>{labels[status]} <b>{metrics?.byStatus[status] ?? 0}</b></button>)}</div></div><DndContext onDragEnd={event => { const note = notes.find(item => item.id === event.active.id); if (note && event.delta) move(note, Math.max(0, note.x + event.delta.x), Math.max(0, note.y + event.delta.y)); }}><div className="free-board">{notes.filter(note => filter === 'ALL' || note.status === filter).map(note => <FreeNote key={note.id} note={note} onEdit={() => { setEditing(note); setShowForm(true); }} onDelete={async () => { await request(`/api/notes/${note.id}`, { method: 'DELETE' }); setNotes(current => current.filter(item => item.id !== note.id)); }} />)}</div></DndContext></>}</section>{showForm && <FreeNoteForm note={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={updateNote} onDeleted={() => { if (editing) setNotes(current => current.filter(note => note.id !== editing.id)); setShowForm(false); setEditing(null); }} />}</div>;
}
function NoteForm({ note, onClose, onSaved }: { note: Note | null; onClose: () => void; onSaved: (note: Note) => void }) { const [title, setTitle] = useState(note?.title ?? ''); const [content, setContent] = useState(note?.content ?? ''); const [status, setStatus] = useState<NoteStatus>(note?.status ?? 'BACKLOG'); async function save(e: React.FormEvent) { e.preventDefault(); const result = note ? await request<Note>(`/api/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify({ title, content, status }) }) : await request<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ title, content, status }) }); onSaved({ ...result, owner: note?.owner }); } return <div className="modal-backdrop"><form className="note-form" onSubmit={save}><button type="button" className="close-button" onClick={onClose}><X /></button><p className="eyebrow">{note ? 'EDITAR NOTA' : 'NUEVA NOTA'}</p><h2>{note ? 'Afinar la idea.' : 'Pon aquí el siguiente paso...'}</h2><label>Título<input autoFocus value={title} onChange={e => setTitle(e.target.value)} required /></label><label>Detalle<textarea value={content} onChange={e => setContent(e.target.value)} rows={5} /></label><label>Estado<select value={status} onChange={e => setStatus(e.target.value as NoteStatus)}>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><button className="primary-button" type="submit">Guardar nota <span>→</span></button></form></div> }

createRoot(document.getElementById('root')!).render(<StrictMode><FreeApp /></StrictMode>);
