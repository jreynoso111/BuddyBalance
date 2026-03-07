import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { AppLanguage } from '@/constants/i18n';
import { PlanTier } from '@/services/subscriptionPlan';

interface AuthState {
    session: Session | null;
    user: User | null;
    role: string | null;
    planTier: PlanTier;
    language: AppLanguage;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setRole: (role: string | null) => void;
    setPlanTier: (planTier: PlanTier) => void;
    setLanguage: (language: AppLanguage) => void;
    setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    role: null,
    planTier: 'free',
    language: 'en',
    initialized: false,
    setSession: (session) => set({ session }),
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setPlanTier: (planTier) => set({ planTier }),
    setLanguage: (language) => set({ language }),
    setInitialized: (initialized) => set({ initialized }),
}));
