// Helios root. Two tabs: Install (Mode A stack) and Live (Mode B dashboard).
// The Install tab owns the address → onboarding → ticker → result flow.

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LiveDashboard } from '@/modeB/screens/LiveDashboard';
import type { ModeAStackParamList } from '@/modeA/navigation';
import { AgentRunning } from '@/modeA/screens/AgentRunning';
import { OnboardAddress } from '@/modeA/screens/OnboardAddress';
import { OnboardUtility } from '@/modeA/screens/OnboardUtility';
import { ROIResult } from '@/modeA/screens/ROIResult';
import { colors, fontSizes, mono, spacing } from '@/modeA/theme';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 0, staleTime: 1000 * 30 },
    mutations: { retry: 0 },
  },
});

const Stack = createNativeStackNavigator<ModeAStackParamList>();
const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.accent,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

function ModeAStack() {
  return (
    <Stack.Navigator
      initialRouteName="OnboardAddress"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="OnboardAddress" component={OnboardAddress} />
      <Stack.Screen name="OnboardUtility" component={OnboardUtility} />
      <Stack.Screen
        name="AgentRunning"
        component={AgentRunning}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="ROIResult"
        component={ROIResult}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}

function TabIconDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={[
        styles.tabDot,
        { backgroundColor: focused ? colors.accent : colors.textDim },
      ]}
    />
  );
}

function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <Text
      style={[
        styles.tabLabel,
        { color: focused ? colors.accent : colors.textMuted },
      ]}
    >
      {label}
    </Text>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <NavigationContainer theme={navTheme}>
            <Tabs.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  backgroundColor: colors.bg,
                  borderTopColor: colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  height: 72,
                  paddingTop: 8,
                },
                tabBarLabelStyle: {
                  marginTop: 2,
                },
              }}
            >
              <Tabs.Screen
                name="Install"
                component={ModeAStack}
                options={{
                  tabBarIcon: ({ focused }) => <TabIconDot focused={focused} />,
                  tabBarLabel: ({ focused }) => (
                    <TabLabel focused={focused} label="install" />
                  ),
                }}
              />
              <Tabs.Screen
                name="Live"
                component={LiveDashboard}
                options={{
                  tabBarIcon: ({ focused }) => <TabIconDot focused={focused} />,
                  tabBarLabel: ({ focused }) => (
                    <TabLabel focused={focused} label="live" />
                  ),
                }}
              />
            </Tabs.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabLabel: {
    fontSize: fontSizes.xs,
    fontFamily: mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
});
