// Persist the last-run UserProfile in localStorage so /live can pick up the
// real address + system config set during /install, instead of the
// existing-owner demo constant. Key is versioned to match the mobile store
// (`helios.profile.v1`) — not cross-shared, just aligned.

import type { UserProfile } from '@/lib/types';

const STORAGE_KEY = 'helios.profile.v1';

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Quota exceeded or storage disabled — silently ignore; /live will
    // just fall back to the demo profile next time.
  }
}

export function loadSavedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile> | null;
    if (
      !parsed ||
      typeof parsed.address !== 'string' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.utility !== 'string'
    ) {
      return null;
    }
    return parsed as UserProfile;
  } catch {
    return null;
  }
}

export function clearSavedProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
