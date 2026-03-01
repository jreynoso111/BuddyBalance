import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, View as RNView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Lock, ArrowLeft } from 'lucide-react-native';

import { Text, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';

type RecoveryTokens = {
    accessToken: string | null;
    refreshToken: string | null;
};

const parseRecoveryTokens = (url: string): RecoveryTokens => {
    try {
        const parsed = new URL(url);
        const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
        const hashParams = new URLSearchParams(hash);

        return {
            accessToken: parsed.searchParams.get('access_token') || hashParams.get('access_token'),
            refreshToken: parsed.searchParams.get('refresh_token') || hashParams.get('refresh_token'),
        };
    } catch {
        return { accessToken: null, refreshToken: null };
    }
};

export default function ResetPasswordScreen() {
    const router = useRouter();
    const urlFromLinking = Linking.useURL();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const initializeRecoverySession = useCallback(async () => {
        try {
            let sourceUrl = urlFromLinking || await Linking.getInitialURL();
            if (!sourceUrl && Platform.OS === 'web' && typeof window !== 'undefined') {
                sourceUrl = window.location.href;
            }

            if (!sourceUrl) {
                setInitializing(false);
                return;
            }

            const { accessToken, refreshToken } = parseRecoveryTokens(sourceUrl);
            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) throw error;
            }
        } catch {
            Alert.alert('Error', 'El enlace de recuperacion es invalido o expiro.');
        } finally {
            setInitializing(false);
        }
    }, [urlFromLinking]);

    useEffect(() => {
        initializeRecoverySession();
    }, [initializeRecoverySession]);

    const onUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Completa ambos campos.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Las contrasenas no coinciden.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            Alert.alert('Error', 'No se pudo actualizar la contrasena. Solicita otro enlace.');
            return;
        }

        await supabase.auth.signOut();
        Alert.alert('Listo', 'Contrasena actualizada. Inicia sesion con la nueva contrasena.');
        router.replace('/(auth)/login');
    };

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <RNView style={styles.content}>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backButton}>
                        <ArrowLeft size={20} color="#0F172A" />
                        <Text style={styles.backText}>Back to login</Text>
                    </TouchableOpacity>

                    <Card style={styles.card}>
                        <Text style={styles.title}>Nueva contrasena</Text>
                        <Text style={styles.subtitle}>Define una nueva contrasena para tu cuenta.</Text>

                        {initializing ? (
                            <RNView style={styles.loadingBox}>
                                <ActivityIndicator size="small" color="#6366F1" />
                                <Text style={styles.loadingText}>Validando enlace...</Text>
                            </RNView>
                        ) : (
                            <>
                                <RNView style={styles.inputGroup}>
                                    <Text style={styles.label}>Nueva contrasena</Text>
                                    <RNView style={styles.inputWrapper}>
                                        <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Minimo 6 caracteres"
                                            placeholderTextColor="#94A3B8"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            style={styles.input}
                                        />
                                    </RNView>
                                </RNView>

                                <RNView style={styles.inputGroup}>
                                    <Text style={styles.label}>Confirmar contrasena</Text>
                                    <RNView style={styles.inputWrapper}>
                                        <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Repite la contrasena"
                                            placeholderTextColor="#94A3B8"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry
                                            style={styles.input}
                                        />
                                    </RNView>
                                </RNView>

                                <TouchableOpacity
                                    onPress={onUpdatePassword}
                                    disabled={loading}
                                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                                >
                                    <Text style={styles.buttonText}>{loading ? 'ACTUALIZANDO...' : 'Actualizar contrasena'}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Card>
                </RNView>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    backText: {
        color: '#0F172A',
        fontWeight: '700',
        fontSize: 14,
    },
    card: {
        padding: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        lineHeight: 20,
    },
    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    loadingText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#0F172A',
    },
    primaryButton: {
        backgroundColor: '#0F172A',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
