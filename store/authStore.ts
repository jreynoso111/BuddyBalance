import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    role: string | null;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setRole: (role: string | null) => void;
    setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    role: null,
    initialized: false,
    setSession: (session) => set({ session }),
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setInitialized: (initialized) => set({ initialized }),
}));
