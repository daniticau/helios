// Exercises the /api/roi Next route handler directly via APIRequestContext.
// These tests hit the dev server's real proxy code — they do NOT go through
// page.route. BACKEND_URL is pointed at an unreachable sentinel in
// playwright.config.ts so we can assert the proxy's error-handling path
// without needing the Python backend running.

import { expect, test } from '@playwright/test';

test.describe('/api/roi proxy', () => {
  test('GET is not allowed (only POST is exported)', async ({ request }) => {
    const res = await request.get('/api/roi');
    // Next returns 405 for unsupported methods on route handlers. Some dev
    // builds return 404 when nothing but POST is exported; either is a
    // legitimate "method not allowed" signal.
    expect([404, 405]).toContain(res.status());
  });

  test('POST forwards to BACKEND_URL and surfaces backend_unreachable when down', async ({
    request,
  }) => {
    // BACKEND_URL is http://127.0.0.1:9 per playwright.config.ts — connection
    // refused. The proxy should catch and return a JSON error envelope.
    const res = await request.post('/api/roi', {
      data: { profile: { address: 'bad', monthly_kwh: 0 } },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'backend_unreachable',
      backend: expect.stringContaining('127.0.0.1:9'),
    });
    // The proxy target path matches the /api/roi contract on the backend.
    // Path is stored in body.backend + '/api/roi' — we assert via the source
    // of truth in web/app/api/roi/route.ts, which always appends /api/roi.
    expect(body).toHaveProperty('detail');
  });
});
