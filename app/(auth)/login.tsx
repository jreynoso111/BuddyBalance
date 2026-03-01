import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, View as RNView } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { Stack } from 'expo-router';
import { ShieldCheck, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const onSignIn = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) Alert.alert('Error', error.message);
        setLoading(false);
    };

    const onSignUp = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) Alert.alert('Error', 'Check your email for confirmation!');
        setLoading(false);
    };

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <RNView style={styles.content}>
                    <RNView style={styles.header}>
                        <RNView style={styles.logoBox}>
                            <ShieldCheck size={40} color="#6366F1" />
                        </RNView>
                        <Text style={styles.title}>I GOT YOU</Text>
                        <Text style={styles.subtitle}>Securely manage what's yours.</Text>
                    </RNView>

                    <Card style={styles.authCard}>
                        <RNView style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <RNView style={styles.inputWrapper}>
                                <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Enter your email"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    style={styles.input}
                                />
                            </RNView>
                        </RNView>

                        <RNView style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <RNView style={styles.inputWrapper}>
                                <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor="#94A3B8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    style={styles.input}
                                />
                            </RNView>
                        </RNView>

                        <TouchableOpacity
                            onPress={onSignIn}
                            disabled={loading}
                            style={styles.primaryButton}
                        >
                            <Text style={styles.buttonText}>{loading ? 'VERIFYING...' : 'Sign In'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onSignUp}
                            disabled={loading}
                            style={styles.secondaryButton}
                        >
                            <Text style={styles.secondaryButtonText}>Create New Account</Text>
                        </TouchableOpacity>
                    </Card>

                    <Text style={styles.copyright}>© 2026 jreynoso — I GOT YOU</Text>
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
    header: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: 'transparent',
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    authCard: {
        padding: 24,
        marginBottom: 32,
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
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'transparent',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    secondaryButtonText: {
        color: '#6366F1',
        fontSize: 15,
        fontWeight: '700',
    },
    copyright: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
});
