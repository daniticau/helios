// Thin proxy to the Python backend /api/geocode. Same shape as the
// /api/roi/start proxy — keeps the browser same-origin.

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
