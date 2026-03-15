import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { getDeviceLanguage } from '@/constants/i18n';
import { fetchProfileMeta } from '@/services/profileService';
import { clearPersistedAuthState, supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

const LAST_PROTECTED_PATH_KEY = 'last_protected_path';

export async function hydrateAuthStoreFromSession(session: Session | null) {
  const { setSession, setUser, setRole, setPlanTier, setLanguage } = useAuthStore.getState();

  setSession(session);
  setUser(session?.user ?? null);

  if (!session?.user?.id) {
    setRole(null);
    setPlanTier('free');
    setLanguage(getDeviceLanguage());
    return;
  }

  try {
    const { normalizedRole, planTier, language } = await fetchProfileMeta(session.user.id);
    setRole(normalizedRole);
    setPlanTier(planTier);
    setLanguage(language);
  } catch (error: any) {
    console.error('profile sync failed:', error?.message || error);
    setRole(null);
    setPlanTier('free');
    setLanguage(getDeviceLanguage());
  }
}

export async function signOutAndResetAuthState() {
  try {
    await AsyncStorage.removeItem(LAST_PROTECTED_PATH_KEY);

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('remote sign out failed:', error.message);
    }
  } finally {
    await clearPersistedAuthState().catch(() => null);
    await hydrateAuthStoreFromSession(null);
  }
}

export function redirectAfterSignOut(path = '/') {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.replace(path);
  }
}
