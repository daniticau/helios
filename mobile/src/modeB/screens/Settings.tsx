// System specs modal: battery kWh, inverter max kW, utility, tariff plan.
// Also the "Demo: fire peak notif" button for rehearsals (see notifications.ts).

import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { UserProfile, UtilityCode } from '@/shared/types';

import { COLORS } from '../constants';
import { scheduleFakePeakNotif } from '../services/notifications';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (next: UserProfile) => void;
}

const UTILITIES: UtilityCode[] = ['PGE', 'SCE', 'SDGE', 'LADWP', 'OTHER'];

export function Settings({ visible, profile, onClose, onSave }: Props) {
  const [solarKw, setSolarKw] = useState(String(profile.solar_kw ?? 8));
  const [batteryKwh, setBatteryKwh] = useState(String(profile.battery_kwh ?? 13.5));
  const [batteryMaxKw, setBatteryMaxKw] = useState(String(profile.battery_max_kw ?? 5));
  const [utility, setUtility] = useState<UtilityCode>(profile.utility);
  const [tariff, setTariff] = useState(profile.tariff_plan ?? '');

  function save() {
    const next: UserProfile = {
      ...profile,
      solar_kw: parseFloat(solarKw) || profile.solar_kw,
      battery_kwh: parseFloat(batteryKwh) || profile.battery_kwh,
      battery_max_kw: parseFloat(batteryMaxKw) || profile.battery_max_kw,
      utility,
      tariff_plan: tariff || undefined,
    };
    onSave(next);
    onClose();
  }

  async function fireNotif() {
    try {
      await scheduleFakePeakNotif();
      Alert.alert('Notification scheduled', 'Will fire in ~10 seconds.');
    } catch (err) {
      Alert.alert('Could not schedule', (err as Error).message);
    }
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

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Demo tools</Text>
          <Pressable style={styles.demoBtn} onPress={fireNotif}>
            <Text style={styles.demoBtnText}>Fire peak notif (10s delay)</Text>
          </Pressable>
          <Text style={styles.hint}>
            Schedules a local push notif simulating the 5 PM peak window opening.
            Tap the notification to deep-link into the hourly plan.
          </Text>
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
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  demoBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  demoBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
  hint: { color: COLORS.textDim, fontSize: 12, lineHeight: 18 },
});
