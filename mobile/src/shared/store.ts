// Client-side profile store. Server state belongs in TanStack Query.

import { create } from 'zustand';
import type { UserProfile } from './types';

interface ProfileState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  patch: (p: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  patch: (patch) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...patch } : null,
    })),
}));

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
