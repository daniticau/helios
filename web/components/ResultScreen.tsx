// The /install result view, extracted so /live can reuse most of the same
// composition. Hierarchy: hero → system + tariff → ZenPower → costs →
// impact → data-source ticker recap → run-again CTA.

'use client';

import { motion } from 'framer-motion';

import { CostsCard } from '@/components/CostsCard';
import { ImpactCard } from '@/components/ImpactCard';
import { NPVHeroCard } from '@/components/NPVHeroCard';
import { OrthogonalTicker } from '@/components/OrthogonalTicker';
import { SystemCard } from '@/components/SystemCard';
import { ZenPowerLine } from '@/components/ZenPowerLine';
import type { ROIResult, UserProfile } from '@/lib/types';

interface Props {
  result: ROIResult;
  profile: UserProfile;
  onRunAgain: () => void;
}

export function ResultScreen({ result, profile, onRunAgain }: Props) {
  return (
    <motion.section
      key="result"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <NPVHeroCard
        paybackYears={result.payback_years}
        npv25yrUsd={result.npv_25yr_usd}
        annualSavingsYr1={result.annual_savings_yr1_usd}
      />

      <SystemCard
        system={result.recommended_system}
        tariffSummary={result.tariff_summary}
        monthlyKwh={profile.monthly_kwh}
      />

      <ZenPowerLine
        permitsInZip={result.zenpower_permits_in_zip}
        avgSystemKw={result.zenpower_avg_system_kw}
      />

      <CostsCard
        upfrontCostUsd={result.upfront_cost_usd}
        federalItcUsd={result.federal_itc_usd}
        netUpfrontUsd={result.net_upfront_usd}
        installerQuotesRange={result.installer_quotes_range}
        financingAprRange={result.financing_apr_range}
        fallbacksUsed={result.fallbacks_used}
      />

      <ImpactCard
        annualSavingsYr1Usd={result.annual_savings_yr1_usd}
        co2AvoidedTons25yr={result.co2_avoided_tons_25yr}
        socialCostOfCarbonUsd={result.social_cost_of_carbon_usd}
        roiPctOfHomeValue={result.roi_pct_of_home_value}
        fallbacksUsed={result.fallbacks_used}
      />

      {/* Ticker recap */}
      <div className="space-y-3">
        <div className="type-eyebrow">data sources</div>
        <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 p-3">
          <OrthogonalTicker
            calls={result.orthogonal_calls_made}
            isRunning={false}
            compact
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRunAgain}
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)]/80 px-6 py-4 text-[12.5px] text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span>run again</span>
        <span className="text-[color:var(--color-accent)]">→</span>
      </button>
    </motion.section>
  );
}
