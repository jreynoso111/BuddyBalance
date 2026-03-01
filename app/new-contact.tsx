import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { X, Check, Trash2 } from 'lucide-react-native';

export default function NewContactScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchContact();
        }
    }, [id, user]);

    const fetchContact = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setName(data.name);
            setEmail(data.email || '');
            setPhone(data.phone || '');
        }
        setLoading(false);
    };

    const onSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setLoading(true);

        // 1. Discover target_user_id via RPC (avoids exposing full profiles table)
        let targetUserId = null;
        if (email.trim() || phone.trim()) {
            const { data, error: lookupError } = await supabase.rpc('find_profile_match', {
                p_email: email.trim() || null,
                p_phone: phone.trim() || null,
            });
            if (!lookupError && data) {
                targetUserId = data;
            }
        }

        if (id) {
            const { error } = await supabase
                .from('contacts')
                .update({
                    name: name.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    target_user_id: targetUserId,
                })
                .eq('id', id);

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Success', 'Contact updated successfully');
                router.back();
            }
        } else {
            const { error } = await supabase.from('contacts').insert([
                {
                    user_id: user?.id,
                    name: name.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    target_user_id: targetUserId,
                },
            ]);

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Success', 'Contact created successfully');
                router.back();
            }
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Contact',
            'Are you sure you want to delete this contact? This will not affect existing loans.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('contacts')
                            .update({ deleted_at: new Date().toISOString() })
                            .eq('id', id);

                        if (error) {
                            Alert.alert('Error', error.message);
                        } else {
                            router.back();
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Stack.Screen options={{
                title: id ? 'Edit Contact' : 'New Contact',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={onSave} disabled={loading}>
                        {loading ? <Text>...</Text> : <Check size={24} color="#059669" />}
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        placeholder="e.g. John Doe"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email (Optional)</Text>
                    <TextInput
                        placeholder="john@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone (Optional)</Text>
                    <TextInput
                        placeholder="+1 234 567 890"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                </View>

                <TouchableOpacity
                    onPress={onSave}
                    disabled={loading}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>{loading ? 'Saving...' : (id ? 'Update Contact' : 'Save Contact')}</Text>
                </TouchableOpacity>

                {id && (
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={loading}
                        style={styles.deleteButton}
                    >
                        <Trash2 size={20} color="#EF4444" />
                        <Text style={styles.deleteButtonText}>Delete Contact</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.copyright}>© 2026 jreynoso — I GOT YOU</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    form: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#eee',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    saveButton: {
        backgroundColor: '#000',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 14,
        marginTop: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        gap: 8,
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
    copyright: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 32,
    },
});
