// ROIResult — the payoff screen. Hero is the payback-years + 25yr NPV card.
// Below the fold: system size, line-item breakdown, ZenPower credibility line,
// tariff summary, and a collapsed orthogonal ticker recap (kept on-screen so
// judges can see the fan-out actually happened).

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import type { ROIResult as ROIResultT } from '@/shared/types';

import { AlertBanner } from '../components/AlertBanner';
import { CostsCard } from '../components/CostsCard';
import { ImpactCard } from '../components/ImpactCard';
import { NPVHeroCard } from '../components/NPVHeroCard';
import { OrthogonalTicker } from '../components/OrthogonalTicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { SystemSizeCard } from '../components/SystemSizeCard';
import { ZenPowerCredibilityLine } from '../components/ZenPowerCredibilityLine';
import type { ModeAScreenProps } from '../navigation';
import { colors, mono, radius, spacing } from '../theme';

export function ROIResult({ route, navigation }: ModeAScreenProps<'ROIResult'>) {
  const result: ROIResultT = route.params.result;
  const failedSources = result.orthogonal_calls_made.filter(
    (c) => c.status === 'error'
  );
  const failedNames = failedSources.map((c) => c.api);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(420)}>
          <NPVHeroCard
            paybackYears={result.payback_years}
            npv25yrUsd={result.npv_25yr_usd}
            annualSavingsYr1={result.annual_savings_yr1_usd}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(420)}>
          <SystemSizeCard
            system={result.recommended_system}
            tariffSummary={result.tariff_summary}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).duration(420)}>
          <ZenPowerCredibilityLine
            permitsInZip={result.zenpower_permits_in_zip}
            avgSystemKw={result.zenpower_avg_system_kw}
          />
        </Animated.View>

        {failedSources.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(200).duration(420)}>
            <AlertBanner
              variant="warning"
              title={`Using fallback data for ${failedSources.length} source${
                failedSources.length === 1 ? '' : 's'
              }`}
              detail={`${failedNames.join(', ')} · Numbers below use regional averages where APIs failed.`}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(220).duration(420)}>
          <CostsCard
            upfrontCostUsd={result.upfront_cost_usd}
            federalItcUsd={result.federal_itc_usd}
            netUpfrontUsd={result.net_upfront_usd}
            installerQuotesRange={result.installer_quotes_range}
            financingAprRange={result.financing_apr_range}
            fallbacksUsed={result.fallbacks_used}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(260).duration(420)}>
          <ImpactCard
            annualSavingsYr1Usd={result.annual_savings_yr1_usd}
            co2AvoidedTons25yr={result.co2_avoided_tons_25yr}
            socialCostOfCarbonUsd={result.social_cost_of_carbon_usd}
            roiPctOfHomeValue={result.roi_pct_of_home_value}
            fallbacksUsed={result.fallbacks_used}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(420)} style={styles.recapBlock}>
          <Text style={styles.recapHeader}>what we looked up</Text>
          <View style={styles.recapTicker}>
            <OrthogonalTicker
              calls={result.orthogonal_calls_made}
              isRunning={false}
              compact
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(340).duration(420)} style={styles.actionRow}>
          <PrimaryButton
            label="run again with different inputs"
            variant="secondary"
            onPress={() => navigation.popToTop()}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  recapBlock: {
    gap: 4,
    marginTop: spacing.sm,
  },
  recapHeader: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: mono,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  recapTicker: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
  },
  actionRow: {
    marginTop: spacing.md,
  },
});
