// Streaming proxy for SSE. Pipes the upstream ReadableStream straight
// through — never call upstream.text(), or buffering kills liveness.
//
// Headers (esp. X-Accel-Buffering: no) are repeated here so the browser
// sees them even if the App Runner edge strips upstream headers.

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Mode A worst case: slowest of 10 sources at 18s timeout, plus headroom.
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;
  try {
    const upstream = await fetch(
      `${BACKEND_URL}/api/roi/stream/${encodeURIComponent(job_id)}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new NextResponse(text || `${upstream.status} from backend`, {
        status: upstream.status || 502,
      });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'backend_unreachable', detail: msg, backend: BACKEND_URL },
      { status: 502 }
    );
  }
}
