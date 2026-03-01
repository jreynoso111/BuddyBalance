import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
    const { setSession, setUser, setInitialized, session, initialized } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // 1. Initial session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setInitialized(true);
        };

        checkSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = (segments as any)[0] === '(auth)';
        const isLandingPage = (segments as any).length === 0 || (segments as any)[0] === '' || (segments as any)[0] === undefined;

        if (!session && !inAuthGroup && !isLandingPage) {
            // User is not signed in and not in the auth group or landing page, redirect to login
            router.replace('/(auth)/login');
        } else if (session && inAuthGroup) {
            // User is signed in and in the auth group, redirect to home
            router.replace('/(tabs)');
        }
    }, [session, segments, initialized]);
};
