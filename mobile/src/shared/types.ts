// Wire contracts between mobile and backend.
// Mirror of backend/schemas.py — keep both sides in sync.
// Canonical spec: HELIOS.md §6.

export type UtilityCode = 'PGE' | 'SCE' | 'SDGE' | 'LADWP' | 'OTHER';

export type LiveAction =
  | 'CHARGE_BATTERY_FROM_SOLAR'
  | 'EXPORT_SOLAR'
  | 'DISCHARGE_BATTERY_TO_HOUSE'
  | 'DISCHARGE_BATTERY_TO_GRID'
  | 'CHARGE_BATTERY_FROM_GRID'
  | 'HOLD';

export type OrthogonalStatus = 'success' | 'cached' | 'error';

export interface UserProfile {
  address: string;
  lat: number;
  lng: number;
  utility: UtilityCode;
  tariff_plan?: string;
  monthly_bill_usd: number;
  monthly_kwh: number;
  has_solar: boolean;
  solar_kw?: number;
  has_battery: boolean;
  battery_kwh?: number;
  battery_max_kw?: number;
}

export interface ProposedSystem {
  solar_kw: number;
  battery_kwh: number;
}

export interface ROIRequest {
  profile: UserProfile;
  proposed_system?: ProposedSystem;
}

export interface OrthogonalCallLog {
  api: string;
  purpose: string;
  latency_ms: number;
  status: OrthogonalStatus;
  error_message?: string;
  source_id?: string;
}

export interface ROIResult {
  recommended_system: ProposedSystem;
  upfront_cost_usd: number;
  federal_itc_usd: number;
  net_upfront_usd: number;
  npv_25yr_usd: number;
  payback_years: number;
  annual_savings_yr1_usd: number;
  co2_avoided_tons_25yr: number;
  installer_quotes_range: [number, number];
  financing_apr_range: [number, number];
  tariff_summary: string;
  orthogonal_calls_made: OrthogonalCallLog[];
  property_value_usd?: number;
  roi_pct_of_home_value?: number;
  zenpower_permits_in_zip?: number;
  zenpower_avg_system_kw?: number;
  social_cost_of_carbon_usd?: number;
  fallbacks_used?: string[];
}

export interface HouseholdState {
  battery_soc_pct: number;
  solar_kw_now: number;
  load_kw_now: number;
  timestamp: string; // ISO
}

export interface LiveStateRequest {
  profile: UserProfile;
  current_state: HouseholdState;
}

export interface ForecastPoint {
  hour_offset: number;
  retail_rate: number;
  export_rate: number;
  solar_kw_forecast: number;
}

export interface PeakWindow {
  start_iso: string;
  expected_rate: number;
}

export interface LiveRecommendation {
  action: LiveAction;
  reasoning: string;
  expected_hourly_gain_usd: number;
  retail_rate_now: number;
  export_rate_now: number;
  next_peak_window?: PeakWindow;
  forecast_24h: ForecastPoint[];
  orthogonal_calls_made: OrthogonalCallLog[];
}

export interface ParseBillResult {
  monthly_kwh: number;
  utility: UtilityCode;
  tariff_guess?: string;
}

export interface ZenPowerSummary {
  zip: string;
  avg_system_kw: number;
  median_permit_days: number | null;
  installs_count: number;
}
