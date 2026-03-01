import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://skxasszsdwtlsqlkukri.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duYeP1gDdUvn1ripTTL3Qw__qb7FPBH';

// Custom storage adapter to handle different platforms and avoid crashes in Node.js
const customStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(key);
            }
            return null;
        }
        return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return;
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
            return;
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: customStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
