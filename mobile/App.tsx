// Helios root. Two tabs: Install (Mode A stack) and Live (Mode B dashboard).
// The Install tab owns the address → onboarding → ticker → result flow.

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/AuthProvider';
import { LoginScreen } from '@/auth/LoginScreen';
import { LiveDashboard } from '@/modeB/screens/LiveDashboard';
import type { ModeAStackParamList } from '@/modeA/navigation';
import { AgentRunning } from '@/modeA/screens/AgentRunning';
import { OnboardAddress } from '@/modeA/screens/OnboardAddress';
import { OnboardUtility } from '@/modeA/screens/OnboardUtility';
import { ROIResult } from '@/modeA/screens/ROIResult';
import { colors } from '@/modeA/theme';
import { AnimatedTabBar } from '@/shared/components/AnimatedTabBar';

// Keep the native splash visible while @expo-google-fonts resolves — no
// font-swap flash when the JS bundle first paints. `preventAutoHideAsync`
// must fire at module load so it wins the race against React rendering.
SplashScreen.preventAutoHideAsync().catch(() => {});

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

// Tiny "Account" tab. Hosts login/signed-in state. Anonymous use
// continues to work — this is purely additive.
function AccountTab() {
  return <LoginScreen />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Render nothing until fonts resolve — the native splash covers the gap
  // and the whole UI paints once in its final typography.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <AuthProvider>
            <NavigationContainer theme={navTheme}>
              <Tabs.Navigator
                screenOptions={{ headerShown: false }}
                tabBar={(props) => <AnimatedTabBar {...props} />}
              >
                <Tabs.Screen name="Install" component={ModeAStack} />
                <Tabs.Screen name="Live" component={LiveDashboard} />
                <Tabs.Screen name="Account" component={AccountTab} />
              </Tabs.Navigator>
            </NavigationContainer>
            <StatusBar style="light" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
