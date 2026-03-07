if (__DEV__) {
  try {
    require('expo-dev-client');
  } catch {
    // Ignore when the dev launcher is not present in the current native build.
  }
}
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import 'react-native-reanimated';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import {
  configureBillingForUser,
  getPlanTierFromCustomerInfo,
  isBillingAvailable,
  subscribeToBillingCustomerInfo,
  syncPlanTierFromBillingServer,
} from '@/services/billing';
import { disablePushNotifications, registerForPushNotificationsAsync, showSharedUpdateNotification } from '@/services/notificationService';
import { useColorScheme } from '@/components/useColorScheme';
import { GreetingRotator } from '@/components/GreetingRotator';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/authStore';
import { getOrCreateUserPreferences } from '@/services/userPreferences';
import { supabase } from '@/services/supabase';

const isAndroidExpoGo = Constants.appOwnership === 'expo' && Platform.OS === 'android';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const setPlanTier = useAuthStore((state) => state.setPlanTier);
  useAuth(); // Handle redirects based on auth state

  useEffect(() => {
    if (isAndroidExpoGo) return;
    if (typeof Notifications.setNotificationHandler !== 'function') {
      console.warn('expo-notifications unavailable in layout: setNotificationHandler is missing');
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const syncNotificationSetup = async () => {
      const { data, error } = await getOrCreateUserPreferences(user.id);
      if (cancelled || error || !data) return;

      if (data.push_enabled) {
        await registerForPushNotificationsAsync({ requestPermission: false, userId: user.id });
        return;
      }

      await disablePushNotifications(user.id);
    };

    void syncNotificationSetup();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isBillingAvailable()) return;

    let cancelled = false;

    const syncBilling = async () => {
      const customerInfo = await configureBillingForUser({
        userId: user?.id || null,
        email: user?.email || null,
        phone: (user?.phone as string | null | undefined) || null,
        displayName: (user?.user_metadata?.full_name as string | undefined) || null,
      });

      if (!cancelled && customerInfo) {
        setPlanTier(getPlanTierFromCustomerInfo(customerInfo));
      }

      if (!cancelled && user?.id) {
        const serverSync = await syncPlanTierFromBillingServer();
        setPlanTier(serverSync.planTier);
      }
    };

    void syncBilling();

    return () => {
      cancelled = true;
    };
  }, [setPlanTier, user?.email, user?.id, user?.phone, user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!isBillingAvailable()) return;

    const unsubscribe = subscribeToBillingCustomerInfo((customerInfo) => {
      setPlanTier(getPlanTierFromCustomerInfo(customerInfo));

      if (user?.id) {
        void syncPlanTierFromBillingServer().then((serverSync) => {
          setPlanTier(serverSync.planTier);
        });
      }
    });

    return unsubscribe;
  }, [setPlanTier, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`incoming-requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'p2p_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record?.status !== 'pending') return;

          void showSharedUpdateNotification({
            type: String(record?.type || ''),
            fromName: String(record?.request_payload?.sender_name || ''),
            message: record?.message,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const originalAlert = Alert.alert;
    const originalPrompt = Alert.prompt;

    Alert.alert = ((title, message, buttons, options) => {
      const translatedButtons = buttons?.map((button) => ({
        ...button,
        text: button.text ? t(button.text) : button.text,
      }));
      return originalAlert(
        typeof title === 'string' ? t(title) : title,
        typeof message === 'string' ? t(message) : message,
        translatedButtons,
        options
      );
    }) as typeof Alert.alert;

    if (typeof originalPrompt === 'function') {
      Alert.prompt = ((title, message, callbackOrButtons, type, defaultValue, keyboardType) =>
        originalPrompt(
          typeof title === 'string' ? t(title) : title,
          typeof message === 'string' ? t(message) : message,
          callbackOrButtons,
          type,
          defaultValue,
          keyboardType
        )) as typeof Alert.prompt;
    }

    return () => {
      Alert.alert = originalAlert;
      Alert.prompt = originalPrompt;
    };
  }, [t]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GreetingRotator />
        <Stack
          screenOptions={{
            headerTransparent: true,
            headerTintColor: colorScheme === 'dark' ? '#F1F5F9' : '#0F172A',
            headerBackButtonDisplayMode: 'minimal',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
            },
            headerTitleAlign: 'center',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ title: t('Recover Password') }} />
          <Stack.Screen name="(auth)/reset-password" options={{ title: t('Reset Password') }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="loan/[id]" options={{ title: t('Lend/Borrow Details') }} />
          <Stack.Screen name="new-loan" options={{ title: t('New Lend/Borrow') }} />
          <Stack.Screen
            name="new-contact"
            options={{
              title: t('New Contact'),
              headerTransparent: false,
              headerStyle: {
                backgroundColor: '#fff',
              },
            }}
          />
          <Stack.Screen name="payment" options={{ headerShown: false }} />
          <Stack.Screen name="register-payment" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: t('Profile') }} />
          <Stack.Screen name="subscription" options={{ title: t('Premium') }} />
          <Stack.Screen name="notifications" options={{ title: t('Notifications') }} />
          <Stack.Screen name="security" options={{ title: t('Security') }} />
          <Stack.Screen name="help-support" options={{ title: t('Help & Support') }} />
          <Stack.Screen name="terms" options={{ title: t('Terms of Service') }} />
          <Stack.Screen name="privacy" options={{ title: t('Privacy Policy') }} />
          <Stack.Screen name="faq" options={{ title: t('FAQ') }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
