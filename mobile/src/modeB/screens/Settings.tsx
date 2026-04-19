// System specs modal: battery kWh, inverter max kW, utility, tariff plan.

import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useProfileStore } from '@/shared/store';
import type { UserProfile, UtilityCode } from '@/shared/types';

import { COLORS } from '../constants';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
}

const UTILITIES: UtilityCode[] = ['PGE', 'SCE', 'SDGE', 'LADWP', 'OTHER'];

export function Settings({ visible, profile, onClose }: Props) {
  const patch = useProfileStore((s) => s.patch);

  const [solarKw, setSolarKw] = useState(String(profile.solar_kw ?? 8));
  const [batteryKwh, setBatteryKwh] = useState(String(profile.battery_kwh ?? 13.5));
  const [batteryMaxKw, setBatteryMaxKw] = useState(String(profile.battery_max_kw ?? 5));
  const [utility, setUtility] = useState<UtilityCode>(profile.utility);
  const [tariff, setTariff] = useState(profile.tariff_plan ?? '');

  // Re-sync form state when a newly-hydrated profile arrives, otherwise the
  // modal shows the pre-hydration defaults until the user edits a field.
  useEffect(() => {
    if (!visible) return;
    setSolarKw(String(profile.solar_kw ?? 8));
    setBatteryKwh(String(profile.battery_kwh ?? 13.5));
    setBatteryMaxKw(String(profile.battery_max_kw ?? 5));
    setUtility(profile.utility);
    setTariff(profile.tariff_plan ?? '');
  }, [visible, profile]);

  function save() {
    const next: Partial<UserProfile> = {
      solar_kw: parseFloat(solarKw) || profile.solar_kw,
      battery_kwh: parseFloat(batteryKwh) || profile.battery_kwh,
      battery_max_kw: parseFloat(batteryMaxKw) || profile.battery_max_kw,
      utility,
      tariff_plan: tariff || undefined,
    };
    patch(next);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>System specs</Text>
          <Pressable onPress={onClose} hitSlop={16}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Field
            label="Solar system size (kW)"
            value={solarKw}
            onChangeText={setSolarKw}
            keyboardType="decimal-pad"
          />
          <Field
            label="Battery capacity (kWh)"
            value={batteryKwh}
            onChangeText={setBatteryKwh}
            keyboardType="decimal-pad"
          />
          <Field
            label="Inverter max power (kW)"
            value={batteryMaxKw}
            onChangeText={setBatteryMaxKw}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Utility</Text>
          <View style={styles.chipRow}>
            {UTILITIES.map((u) => (
              <Pressable
                key={u}
                style={[styles.chip, utility === u && styles.chipActive]}
                onPress={() => setUtility(u)}
              >
                <Text style={[styles.chipText, utility === u && styles.chipTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Tariff plan"
            value={tariff}
            onChangeText={setTariff}
            placeholder="EV-TOU-5"
          />

          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDim}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  close: { color: COLORS.accent, fontSize: 16 },
  body: { padding: 24, gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: COLORS.bg, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },
});
