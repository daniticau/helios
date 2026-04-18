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

export type NarrateBody = { script: string } | { roi_result: ROIResult };

export class NarrateUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NarrateUnavailableError';
  }
}

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

  // Fetch narrated audio for either a raw script or an ROIResult.
  // Returns a data URI suitable for expo-av Audio.Sound.createAsync({ uri }),
  // which needs either a remote URL or a `data:` URI on React Native.
  narrate: async (body: NarrateBody): Promise<{ uri: string; cached: boolean }> => {
    const res = await fetch(`${API_BASE_URL}/api/narrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 503) {
      // Surface the missing-key case as a typed error so the button can
      // show a helpful one-liner instead of crashing.
      const text = await res.text();
      throw new NarrateUnavailableError(
        `narration unavailable: ${text || 'elevenlabs key missing'}`,
      );
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    }
    const cached = res.headers.get('x-helios-cache') === 'hit';
    const blob = await res.blob();
    // FileReader -> data URI is the only reliable cross-platform path in
    // Expo Go. We can't write to disk without expo-file-system, and the
    // mp3 for a 45-word narration is ~50-80KB — well under data-URI limits.
    const uri: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
      reader.readAsDataURL(blob);
    });
    return { uri, cached };
  },
};
