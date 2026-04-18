// Thin proxy to the Python backend /api/roi. Exists so the browser always
// hits a same-origin URL — dodges CORS and keeps BACKEND_URL private.

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const runtime = 'nodejs';
// 25s cap — backend target is <20s, give some slack for cold starts.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) headers['Authorization'] = auth;

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/roi`, {
      method: 'POST',
      headers,
      body,
      // Never cache — ROI responses are request-specific.
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
