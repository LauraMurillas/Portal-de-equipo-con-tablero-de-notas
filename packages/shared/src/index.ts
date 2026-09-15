export type Role = 'ADMIN' | 'USER';
export type NoteStatus = 'BACKLOG' | 'IN_PROGRESS' | 'DONE';

export interface UserSummary { id: string; name: string; email: string; role: Role; active: boolean; }
export interface Note { id: string; title: string; content: string; status: NoteStatus; x: number; y: number; ownerId: string; owner?: UserSummary; createdAt: string; updatedAt: string; }
export interface Metrics { total: number; byStatus: Record<NoteStatus, number>; members: number; completedThisWeek: number; }
