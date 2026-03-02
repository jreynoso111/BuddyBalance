import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout() {
    const { role, initialized } = useAuthStore();

    if (!initialized) {
        return null; // Wait for auth store to load
    }

    if (role !== 'admin') {
        // Redirect standard users back to home
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                },
                headerTitleStyle: {
                    fontWeight: '800',
                },
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="users" options={{ title: 'Platform Users' }} />
            <Stack.Screen name="loans" options={{ title: 'Platform Loans' }} />
        </Stack>
    );
}
