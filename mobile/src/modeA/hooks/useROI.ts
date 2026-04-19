// Streaming ROI hook — replaces the old single-shot useMutation flow.
// Calls POST /api/roi/start, then subscribes to /api/roi/stream/{id}
// over SSE so the OrthogonalTicker can render rows as each source
// resolves rather than waiting for the slowest call to finish.

import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-sse';

import { getCurrentAccessToken } from '@/auth/tokenStore';
import { api } from '@/shared/api';
import { API_BASE_URL } from '@/shared/config';
import type { OrthogonalCallLog, ROIRequest, ROIResult } from '@/shared/types';

type Status = 'idle' | 'streaming' | 'success' | 'error';

export interface UseROIStream {
  start: (req: ROIRequest) => void;
  reset: () => void;
  retrySource: (sourceId: string) => Promise<void>;
  calls: OrthogonalCallLog[];
  retryingSources: ReadonlySet<string>;
  result: ROIResult | null;
  status: Status;
  error: string | null;
}

type StreamEvent = 'call' | 'result';

export function useROIStream(): UseROIStream {
  const [calls, setCalls] = useState<OrthogonalCallLog[]>([]);
  const [retryingSources, setRetryingSources] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [result, setResult] = useState<ROIResult | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource<StreamEvent> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  // Read current status from inside EventSource callbacks (which otherwise
  // close over stale state). Kept in sync after every setStatus.
  const statusRef = useRef<Status>('idle');

  const setStatusTracked = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const unmarkRetrying = useCallback((sourceId: string) => {
    setRetryingSources((prev) => {
      if (!prev.has(sourceId)) return prev;
      const next = new Set(prev);
      next.delete(sourceId);
      return next;
    });
  }, []);

  const closeStream = useCallback(() => {
    esRef.current?.removeAllEventListeners();
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const reset = useCallback(() => {
    closeStream();
    jobIdRef.current = null;
    setCalls([]);
    setRetryingSources(new Set());
    setResult(null);
    setStatusTracked('idle');
    setError(null);
  }, [closeStream, setStatusTracked]);

  const start = useCallback(
    async (req: ROIRequest) => {
      closeStream();
      jobIdRef.current = null;
      setCalls([]);
      setRetryingSources(new Set());
      setResult(null);
      setError(null);
      setStatusTracked('streaming');

      let jobId: string;
      try {
        const startResp = await api.roiStart(req);
        jobId = startResp.job_id;
        jobIdRef.current = jobId;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatusTracked('error');
        return;
      }

      const token = getCurrentAccessToken();
      const url = `${API_BASE_URL}/api/roi/stream/${encodeURIComponent(jobId)}`;
      const es = new EventSource<StreamEvent>(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        // Long enough to outlast the slowest source's 18s server-side timeout.
        timeout: 60_000,
      });
      esRef.current = es;

      es.addEventListener('call', (ev) => {
        if (!ev.data) return;
        try {
          const log = JSON.parse(ev.data) as OrthogonalCallLog;
          // Dedupe by source_id: a retry re-emits a source, overwriting
          // the previous (error) log in place so the ticker row swaps
          // rather than appending a duplicate.
          setCalls((prev) => {
            if (!log.source_id) return [...prev, log];
            const existing = prev.findIndex((c) => c.source_id === log.source_id);
            if (existing < 0) return [...prev, log];
            const next = prev.slice();
            next[existing] = log;
            return next;
          });
          if (log.source_id) unmarkRetrying(log.source_id);
        } catch {
          // Skip malformed event silently — losing one row beats killing the stream.
        }
      });

      es.addEventListener('result', (ev) => {
        if (ev.data) {
          try {
            const r = JSON.parse(ev.data) as ROIResult;
            setResult(r);
            setStatusTracked('success');
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatusTracked('error');
          }
        }
        // Don't close the stream here — the server holds the job open
        // for a short grace window so retries can still ride the same
        // stream. It'll close naturally when the server tears down.
      });

      es.addEventListener('error', (ev) => {
        // Natural close after the grace window lands here with the same
        // event type as a genuine failure. Treat it as expected if we
        // already received the result.
        if (statusRef.current === 'success') {
          closeStream();
          return;
        }
        const msg =
          ev.type === 'error'
            ? (ev as { message?: string }).message ?? 'stream error'
            : ev.type === 'timeout'
              ? 'stream timed out'
              : 'stream exception';
        setError(msg);
        setStatusTracked('error');
        closeStream();
      });
    },
    [closeStream, setStatusTracked, unmarkRetrying]
  );

  const retrySource = useCallback(
    async (sourceId: string) => {
      const jobId = jobIdRef.current;
      if (!jobId) return;
      // Mark the source as in-flight so the ticker can show pending dots
      // instead of the stale ERR row while the server re-fetches.
      setRetryingSources((prev) => {
        if (prev.has(sourceId)) return prev;
        const next = new Set(prev);
        next.add(sourceId);
        return next;
      });
      try {
        await api.roiRetry(jobId, sourceId);
      } catch (e) {
        // 410 = grace window closed, any other = network hiccup. Clear the
        // in-flight marker so the row reverts to its last-known state.
        unmarkRetrying(sourceId);
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [unmarkRetrying]
  );

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  return {
    start,
    reset,
    retrySource,
    calls,
    retryingSources,
    result,
    status,
    error,
  };
}
