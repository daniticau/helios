// Thin proxy to the Python backend /api/roi/start. Same shape as the
// existing /api/roi proxy — we forward the bearer token, return JSON
// with the new {job_id}, and never cache.

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = auth;

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/roi/start`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'backend_unreachable', detail: msg, backend: BACKEND_URL },
      { status: 502 }
    );
  }
}
