// Client-side profile store. Server state belongs in TanStack Query.
//
// Persisted to expo-secure-store so system-spec edits survive app kills.
// Storage key is versioned (`helios.profile.v1`) so a future schema bump
// can ship a migration without wiping the demo profile silently.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from './types';

interface ProfileState {
  profile: UserProfile | null;
  hydrated: boolean;
  setProfile: (p: UserProfile | null) => void;
  patch: (p: Partial<UserProfile>) => void;
}

// Zustand's persist middleware expects a StateStorage shape; expo-secure-store
// is async and returns null-on-miss, which matches the contract.
const secureStorage = {
  getItem: async (name: string) => {
    const v = await SecureStore.getItemAsync(name);
    return v ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      hydrated: false,
      setProfile: (profile) => set({ profile }),
      patch: (patch) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...patch } : null,
        })),
    }),
    {
      name: 'helios.profile.v1',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

export const DEMO_PROFILE: UserProfile = {
  address: '9500 Gilman Dr, La Jolla, CA, 92093, US',
  lat: 32.8801,
  lng: -117.2340,
  utility: 'SDGE',
  tariff_plan: 'EV-TOU-5',
  monthly_bill_usd: 240,
  monthly_kwh: 650,
  has_solar: false,
  has_battery: false,
};
