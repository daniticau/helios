// Thin GET proxy to the Python backend /api/geocode/autocomplete. Forwards
// the `q` and `limit` query params untouched.

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
  const limit = searchParams.get('limit') ?? '5';
  const url = `${BACKEND_URL}/api/geocode/autocomplete?q=${encodeURIComponent(
    q
  )}&limit=${encodeURIComponent(limit)}`;
  try {
    const upstream = await fetch(url, { cache: 'no-store' });
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
