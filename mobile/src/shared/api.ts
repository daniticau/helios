// Typed HTTP client for the Helios backend.
// Keep fetch signatures 1:1 with backend routes in backend/routes/*.py.
//
// Auth: when a Supabase session exists, the cached access_token is
// automatically attached as `Authorization: Bearer <jwt>`. Anonymous
// calls (no token) continue to work — backend treats auth as optional.

import { getCurrentAccessToken } from '@/auth/tokenStore';
import { API_BASE_URL } from './config';
import type {
  LiveRecommendation,
  LiveStateRequest,
  ParseBillResult,
  ROIRequest,
  ROIResult,
  ZenPowerSummary,
} from './types';

function authHeaders(): Record<string, string> {
  const token = getCurrentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  zip?: string | null;
  state?: string | null;
}

export const api = {
  geocode: (q: string) =>
    request<GeocodeResult>('/api/geocode', {
      method: 'POST',
      body: JSON.stringify({ q }),
    }),

  roi: (body: ROIRequest) =>
    request<ROIResult>('/api/roi', { method: 'POST', body: JSON.stringify(body) }),

  // Streaming variant: kicks off a job and returns its id. Subscribe to
  // /api/roi/stream/{id} via SSE to receive per-source events live.
  roiStart: (body: ROIRequest) =>
    request<{ job_id: string }>('/api/roi/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Re-fire one source on an existing job. The fresh log is pushed
  // onto the same SSE stream; a 410 means the grace window closed and
  // the caller should restart via roiStart.
  roiRetry: (jobId: string, sourceId: string) =>
    request<{ status: string; source_id: string }>(
      `/api/roi/retry/${encodeURIComponent(jobId)}`,
      { method: 'POST', body: JSON.stringify({ source_id: sourceId }) }
    ),

  live: (body: LiveStateRequest) =>
    request<LiveRecommendation>('/api/live', { method: 'POST', body: JSON.stringify(body) }),

  zenpowerSummary: (zip: string) =>
    request<ZenPowerSummary>(`/api/zenpower/summary?zip=${encodeURIComponent(zip)}`),

  parseBill: async (file: { uri: string; name: string; type: string }): Promise<ParseBillResult> => {
    const form = new FormData();
    // RN form data accepts this shape; cast to satisfy TS.
    form.append('file', file as unknown as Blob);
    const res = await fetch(`${API_BASE_URL}/api/parse-bill`, {
      method: 'POST',
      body: form,
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ParseBillResult;
  },

  health: () => request<{ status: string; permits_count: number }>('/api/health'),
};
