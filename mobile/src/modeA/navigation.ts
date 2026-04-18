// Navigation param types for Mode A. Keep ROIResult nav param shape in sync
// with the ROIResult interface — we pass the result object through.

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ROIResult } from '@/shared/types';

export type ModeAStackParamList = {
  OnboardAddress: undefined;
  OnboardUtility: undefined;
  AgentRunning: undefined;
  ROIResult: { result: ROIResult };
};

export type ModeAScreenProps<T extends keyof ModeAStackParamList> =
  NativeStackScreenProps<ModeAStackParamList, T>;
