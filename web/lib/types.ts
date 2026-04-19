// Wire contracts — mirror of mobile/src/shared/types.ts and backend/schemas.py.
// Duplicated rather than imported so the web app has no cross-project import
// paths and builds independently. Canonical spec: HELIOS.md §6.

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
  // Sources whose live Orthogonal parse failed and fell back to a
  // documented default. Possible values: 'installer_pricing',
  // 'financing', 'property_value', 'carbon_price'.
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

export const DEMO_PROFILE: UserProfile = {
  address: '9500 Gilman Dr, La Jolla, CA, 92093, US',
  lat: 32.8801,
  lng: -117.234,
  utility: 'SDGE',
  tariff_plan: 'EV-TOU-5',
  monthly_bill_usd: 240,
  monthly_kwh: 650,
  has_solar: false,
  has_battery: false,
};

export const UTILITIES: Array<{ code: UtilityCode; label: string }> = [
  { code: 'PGE', label: 'PG&E (Northern California)' },
  { code: 'SCE', label: 'SCE (Southern California Edison)' },
  { code: 'SDGE', label: 'SDG&E (San Diego)' },
  { code: 'LADWP', label: 'LADWP (Los Angeles)' },
  { code: 'OTHER', label: 'Other / not listed' },
];
