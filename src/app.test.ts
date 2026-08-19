import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { app, errorHandler } from './app.js';
import { pool } from './config/database.js';

const testSource = `httptest-${randomUUID()}`;

type ServerHandle = {
  server: ReturnType<typeof app.listen>;
  baseUrl: string;
};

async function startServer(targetApp: express.Express): Promise<ServerHandle> {
  const server = targetApp.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

const harness = express();
harness.get('/boom', () => {
  throw new Error('boom');
});
harness.use(errorHandler);

describe('HTTP integration', () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    handle = await startServer(app);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      handle.server.close((error) => (error ? reject(error) : resolve())),
    );
    await pool.query('DELETE FROM mentions WHERE source LIKE $1', [`httptest-%`]);
    await pool.end();
  });

  it('bulk: returns a summary for a valid batch', async () => {
    const res = await fetch(`${handle.baseUrl}/internal/mentions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { source: testSource, title: 'Bulk Title', content: 'bulk content', published_at: '2026-08-10T08:15:00Z' },
      ]),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { received: 1, inserted: 1, duplicates: 0, rejected: 0 } });
  });

  it('bulk: rejects an empty array', async () => {
    const res = await fetch(`${handle.baseUrl}/internal/mentions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('bulk: rejects a non-array body', async () => {
    const res = await fetch(`${handle.baseUrl}/internal/mentions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'x' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('malformed JSON body returns a 400 JSON response', async () => {
    const res = await fetch(`${handle.baseUrl}/internal/mentions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"source":',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, message: 'Invalid JSON body' });
  });

  it('search: returns data and pagination', async () => {
    const res = await fetch(`${handle.baseUrl}/mentions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, totalPages: expect.any(Number) });
  });

  it('search: rejects invalid pagination', async () => {
    const res = await fetch(`${handle.baseUrl}/mentions?page=0`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('search: returns empty data for an unmatched keyword', async () => {
    const res = await fetch(`${handle.baseUrl}/mentions?q=zzz-no-match-${testSource}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('stats: groups by source and day', async () => {
    const source = await fetch(`${handle.baseUrl}/mentions/stats?group_by=source`);
    expect(source.status).toBe(200);
    const sourceBody = await source.json();
    expect(sourceBody.success).toBe(true);
    expect(sourceBody.group_by).toBe('source');
    expect(Array.isArray(sourceBody.data)).toBe(true);

    const day = await fetch(`${handle.baseUrl}/mentions/stats?group_by=day`);
    expect(day.status).toBe(200);
    const dayBody = await day.json();
    expect(dayBody.success).toBe(true);
    expect(dayBody.group_by).toBe('day');
    expect(Array.isArray(dayBody.data)).toBe(true);
  });

  it('stats: rejects an invalid group_by', async () => {
    const res = await fetch(`${handle.baseUrl}/mentions/stats?group_by=week`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('unknown route returns a 404 JSON response', async () => {
    const res = await fetch(`${handle.baseUrl}/definitely-not-a-route`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, message: 'Route not found' });
  });

  it('an unexpected error returns a 500 JSON response', async () => {
    const harnessHandle = await startServer(harness);
    try {
      const res = await fetch(`${harnessHandle.baseUrl}/boom`);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ success: false, message: 'Internal server error' });
    } finally {
      await new Promise<void>((resolve, reject) =>
        harnessHandle.server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});