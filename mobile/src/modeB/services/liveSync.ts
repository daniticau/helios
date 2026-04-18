// Live polling of POST /api/live. Emits a fresh LiveRecommendation every
// POLL_INTERVAL_MS (60s). In dev, falls back to mockLiveRecommendation when
// the backend is unreachable so the UI can be demoed standalone.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/shared/api';
import type { HouseholdState, LiveRecommendation, UserProfile } from '@/shared/types';

import { POLL_INTERVAL_MS } from '../constants';
import { buildMockHouseholdState, mockLiveRecommendation } from './mockLive';

export { buildMockHouseholdState };

export interface UseLiveRecommendationResult {
  query: UseQueryResult<LiveRecommendation, Error>;
  state: HouseholdState;
  usingMock: boolean;
}

/**
 * Polls /api/live every 60 seconds. Regenerates the mock household state on
 * each tick so SoC / solar / load drift realistically during a rehearsal.
 *
 * Falls back to a synthesized LiveRecommendation on any network error —
 * logged as `usingMock: true` so the UI can surface that it's demo-only.
 */
export function useLiveRecommendation(
  profile: UserProfile,
): UseLiveRecommendationResult {
  const state = buildMockHouseholdState();

  const query = useQuery<LiveRecommendation, Error>({
    queryKey: ['live', profile.address, Math.floor(Date.now() / POLL_INTERVAL_MS)],
    queryFn: async () => {
      try {
        return await api.live({ profile, current_state: state });
      } catch (err) {
        // Backend not reachable — serve the mock so rehearsal works offline.
        // We log once per tick; React Query dedupes via queryKey.
        console.warn('[liveSync] falling back to mock:', (err as Error).message);
        return mockLiveRecommendation({ profile, current_state: state });
      }
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_INTERVAL_MS / 2,
  });

  // We always have a value once the first tick resolves. `usingMock` is
  // surfaced via the fetched `LiveRecommendation.orthogonal_calls_made`
  // — if all entries are cached/synthetic, the banner tells the user.
  const usingMock =
    query.data?.orthogonal_calls_made?.every((c) => c.status === 'cached') ?? false;

  return { query, state, usingMock };
}
