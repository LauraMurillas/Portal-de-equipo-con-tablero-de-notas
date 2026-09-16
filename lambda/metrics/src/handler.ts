/*
Funcion AWS LAMBDA para obtener métricas de la base de datos PostgreSQL. 
Devuelve el total de notas y el conteo por estado (BACKLOG, IN_PROGRESS, DONE).
*/

import type { APIGatewayProxyHandler } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const handler: APIGatewayProxyHandler = async () => {
  const result = await pool.query<{ status: string; count: string }>('SELECT status, COUNT(*)::int AS count FROM "Note" GROUP BY status');
  const total = result.rows.reduce((sum, row) => sum + Number(row.count), 0);
  const byStatus = { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const row of result.rows) if (row.status in byStatus) byStatus[row.status as keyof typeof byStatus] = Number(row.count);
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ total, byStatus, generatedAt: new Date().toISOString() }) };
};
