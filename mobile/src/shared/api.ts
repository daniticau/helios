// Typed HTTP client for the Helios backend.
// Keep fetch signatures 1:1 with backend routes in backend/routes/*.py.

import { API_BASE_URL } from './config';
import type {
  LiveRecommendation,
  LiveStateRequest,
  ParseBillResult,
  ROIRequest,
  ROIResult,
  ZenPowerSummary,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  roi: (body: ROIRequest) =>
    request<ROIResult>('/api/roi', { method: 'POST', body: JSON.stringify(body) }),

  live: (body: LiveStateRequest) =>
    request<LiveRecommendation>('/api/live', { method: 'POST', body: JSON.stringify(body) }),

  zenpowerSummary: (zip: string) =>
    request<ZenPowerSummary>(`/api/zenpower/summary?zip=${encodeURIComponent(zip)}`),

  parseBill: async (file: { uri: string; name: string; type: string }): Promise<ParseBillResult> => {
    const form = new FormData();
    // RN form data accepts this shape; cast to satisfy TS.
    form.append('file', file as unknown as Blob);
    const res = await fetch(`${API_BASE_URL}/api/parse-bill`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ParseBillResult;
  },

  health: () => request<{ status: string; permits_count: number }>('/api/health'),
};
