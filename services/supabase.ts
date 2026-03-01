import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
}

if (!SUPABASE_ANON_KEY.startsWith('sb_publishable_')) {
    throw new Error('Invalid Supabase key for frontend. Use only EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

// Custom storage adapter to handle different platforms and avoid crashes in Node.js
const customStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(key);
            }
            return null;
        }
        try {
            return await SecureStore.getItemAsync(key);
        } catch {
            return AsyncStorage.getItem(key);
        }
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return;
        }
        try {
            await SecureStore.setItemAsync(key, value);
        } catch {
            await AsyncStorage.setItem(key, value);
        }
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
            return;
        }
        try {
            await SecureStore.deleteItemAsync(key);
        } catch {
            await AsyncStorage.removeItem(key);
        }
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
