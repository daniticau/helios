// Phase 0 smoke test: one button fires POST /api/roi and renders the
// ROIResult. Workstreams 3 and 4 replace this with their proper flows.

import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/shared/api';
import { DEMO_PROFILE } from '@/shared/store';
import type { ROIResult } from '@/shared/types';

const qc = new QueryClient();

function Home() {
  const [result, setResult] = useState<ROIResult | null>(null);
  const mut = useMutation({
    mutationFn: () => api.roi({ profile: DEMO_PROFILE }),
    onSuccess: setResult,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Helios</Text>
        <Text style={styles.subtitle}>home solar economics, in 20 seconds</Text>

        <Pressable
          style={[styles.button, mut.isPending && styles.buttonDisabled]}
          disabled={mut.isPending}
          onPress={() => mut.mutate()}
        >
          {mut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Compute ROI (demo)</Text>
          )}
        </Pressable>

        {mut.isError && <Text style={styles.error}>{(mut.error as Error).message}</Text>}

        {result && (
          <View style={styles.card}>
            <Text style={styles.hero}>Payback: {result.payback_years} years</Text>
            <Text style={styles.big}>25-yr NPV: ${result.npv_25yr_usd.toLocaleString()}</Text>
            <Text style={styles.line}>
              System: {result.recommended_system.solar_kw} kW + {result.recommended_system.battery_kwh} kWh battery
            </Text>
            <Text style={styles.line}>Upfront (net of ITC): ${result.net_upfront_usd.toLocaleString()}</Text>
            <Text style={styles.line}>CO₂ avoided (25 yr): {result.co2_avoided_tons_25yr} tons</Text>
            <Text style={styles.line}>Tariff: {result.tariff_summary}</Text>
            <Text style={styles.sectionHeader}>Orthogonal calls</Text>
            {result.orthogonal_calls_made.map((c, i) => (
              <Text key={i} style={styles.call}>
                {c.status === 'success' ? '✓' : c.status === 'cached' ? '•' : '✗'}  {c.api} — {c.purpose} ({c.latency_ms}ms)
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <Home />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  scroll: { padding: 20, gap: 16 },
  title: { color: '#f5d76e', fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: '#888', fontSize: 16 },
  button: {
    backgroundColor: '#f5d76e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#1a1a1a', fontSize: 18, fontWeight: '600' },
  error: { color: '#ff6b6b', marginTop: 12 },
  card: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 20,
    gap: 6,
    marginTop: 24,
  },
  hero: { color: '#f5d76e', fontSize: 32, fontWeight: '700' },
  big: { color: '#fff', fontSize: 24, fontWeight: '600', marginBottom: 8 },
  line: { color: '#ccc', fontSize: 14 },
  sectionHeader: { color: '#888', marginTop: 12, marginBottom: 4, fontSize: 12, textTransform: 'uppercase' },
  call: { color: '#9ec1ff', fontSize: 12, fontFamily: 'Menlo' },
});
