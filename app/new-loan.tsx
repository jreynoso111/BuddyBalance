import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, View as RNView } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { X, Check, ChevronDown, Camera, Image as ImageIcon, Wallet, Box } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { scheduleLoanReminder } from '@/services/notificationService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CURRENCIES, getCurrencySymbol } from '@/constants/Currencies';

export default function NewLoanScreen() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [category, setCategory] = useState<'money' | 'item'>('money');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'lent' | 'borrowed'>('lent');
    const [contactId, setContactId] = useState('');
    const [contacts, setContacts] = useState<any[]>([]);
    const [dueDate, setDueDate] = useState('');
    const [reminderFrequency, setReminderFrequency] = useState<'none' | 'daily' | 'weekly' | 'custom' | 'monthly' | 'yearly'>('none');
    const [reminderInterval, setReminderInterval] = useState('1');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    let base64String: string | null = null;

    useFocusEffect(
        useCallback(() => {
            fetchContacts();
        }, [user])
    );

    const fetchContacts = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('contacts')
            .select('id, name, target_user_id')
            .eq('user_id', user.id)
            .is('deleted_at', null);

        const newContacts = data || [];

        // Auto-select the newly added contact if any
        if (newContacts.length > contacts.length) {
            const addedContact = newContacts.find(nc => !contacts.some(oc => oc.id === nc.id));
            if (addedContact || (contacts.length === 0 && newContacts.length === 1)) {
                setContactId(addedContact ? addedContact.id : newContacts[0].id);
            }
        }

        setContacts(newContacts);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            base64String = result.assets[0].base64 || null;
        }
    };

    const onSave = async () => {
        if (category === 'money' && !amount) {
            Alert.alert('Error', 'Amount is required for money loans');
            return;
        }
        if (category === 'item' && !itemName) {
            Alert.alert('Error', 'Item name is required');
            return;
        }
        if (!contactId) {
            Alert.alert('Error', 'Contact is required');
            return;
        }

        setLoading(true);
        let evidenceUrl = null;

        if (image && base64String) {
            const fileName = `${user?.id}/${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, decode(base64String), {
                    contentType: 'image/jpeg',
                });

            if (uploadError) {
                Alert.alert('Upload Error', uploadError.message);
                setLoading(false);
                return;
            }
            evidenceUrl = fileName;
        }

        const selectedContact = contacts.find(c => c.id === contactId);
        const targetUserId = selectedContact?.target_user_id;

        const { data: newLoan, error } = await supabase.from('loans').insert([
            {
                user_id: user?.id,
                contact_id: contactId,
                target_user_id: targetUserId,
                amount: category === 'money' ? parseFloat(amount) : null,
                currency: category === 'money' ? currency : null,
                category,
                item_name: category === 'item' ? itemName.trim() : null,
                type,
                description: description.trim() || null,
                due_date: dueDate || null,
                status: 'active',
                validation_status: targetUserId ? 'pending' : 'none',
                evidence_url: evidenceUrl,
                reminder_frequency: reminderFrequency,
                reminder_interval: parseInt(reminderInterval) || 1,
            },
        ]).select().single();

        if (!error && targetUserId && newLoan) {
            // Create P2P request
            await supabase.from('p2p_requests').insert([
                {
                    type: 'loan_validation',
                    loan_id: newLoan.id,
                    from_user_id: user?.id,
                    to_user_id: targetUserId,
                    message: `New ${category} ${type === 'lent' ? 'lent' : 'borrowed'} transaction recorded with you.`,
                    status: 'pending',
                },
            ]);
        }

        if (dueDate && !error) {
            const selectedContact = contacts.find(c => c.id === contactId);
            await scheduleLoanReminder(
                newLoan.id,
                selectedContact?.name || 'Someone',
                category === 'money' ? parseFloat(amount) : 0,
                dueDate,
                category,
                reminderFrequency,
                parseInt(reminderInterval) || 1
            );
        }

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.back();
        }
        setLoading(false);
    };

    const colorScheme = useColorScheme() || 'light';

    return (
        <Screen style={styles.container}>
            <Stack.Screen options={{
                title: 'New Transaction',
                headerTransparent: true,
                headerTintColor: '#0F172A',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <X size={24} color="#0F172A" />
                    </TouchableOpacity>
                ),
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <Card style={styles.topCard}>
                        <View style={styles.categoryToggleContainer}>
                            <TouchableOpacity
                                style={[styles.categoryTab, category === 'money' && styles.categoryTabActive]}
                                onPress={() => setCategory('money')}
                            >
                                <Wallet size={18} color={category === 'money' ? '#FFFFFF' : '#64748B'} />
                                <Text style={[styles.categoryTabText, category === 'money' && styles.categoryTabTextActive]}>Money</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.categoryTab, category === 'item' && styles.categoryTabActive]}
                                onPress={() => setCategory('item')}
                            >
                                <Box size={18} color={category === 'item' ? '#FFFFFF' : '#64748B'} />
                                <Text style={[styles.categoryTabText, category === 'item' && styles.categoryTabTextActive]}>Item</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.typeToggleContainer}>
                            <TouchableOpacity
                                style={[styles.typeButton, type === 'lent' && { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                                onPress={() => setType('lent')}
                            >
                                <RNView style={[styles.typeCircle, type === 'lent' && { backgroundColor: '#10B981' }]} />
                                <Text style={[styles.typeText, type === 'lent' && { color: '#10B981', fontWeight: '700' }]}>
                                    {category === 'money' ? 'I Lent' : 'I Gave'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, type === 'borrowed' && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                onPress={() => setType('borrowed')}
                            >
                                <RNView style={[styles.typeCircle, type === 'borrowed' && { backgroundColor: '#EF4444' }]} />
                                <Text style={[styles.typeText, type === 'borrowed' && { color: '#EF4444', fontWeight: '700' }]}>
                                    {category === 'money' ? 'I Borrowed' : 'I Received'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Card>

                    <Card style={styles.formCard}>
                        {category === 'money' ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Amount</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
                                    <TextInput
                                        placeholder="0.00"
                                        placeholderTextColor="#CBD5E1"
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="decimal-pad"
                                        style={styles.amountInput}
                                    />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                                    {CURRENCIES.map(c => (
                                        <TouchableOpacity
                                            key={c.code}
                                            onPress={() => setCurrency(c.code)}
                                            style={[styles.currencyChip, currency === c.code && styles.currencyChipActive]}
                                        >
                                            <Text style={[styles.currencyChipText, currency === c.code && styles.currencyChipTextActive]}>
                                                {c.code}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Item Name</Text>
                                <TextInput
                                    placeholder="What are you lending?"
                                    placeholderTextColor="#94A3B8"
                                    value={itemName}
                                    onChangeText={setItemName}
                                    style={styles.input}
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Who is it with?</Text>
                                <TouchableOpacity onPress={() => router.push('/new-contact')}>
                                    <Text style={styles.linkText}>+ New Contact</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.pickerContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactChips}>
                                    {contacts.map(c => (
                                        <TouchableOpacity
                                            key={c.id}
                                            onPress={() => setContactId(c.id)}
                                            style={[styles.contactChip, contactId === c.id && styles.contactChipActive]}
                                        >
                                            <Text style={[styles.contactChipText, contactId === c.id && styles.contactChipTextActive]}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Notes</Text>
                            <TextInput
                                placeholder="Add a quick note..."
                                placeholderTextColor="#94A3B8"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                style={[styles.input, styles.textArea]}
                            />
                        </View>

                        <RNView style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                <Text style={styles.label}>Due Date</Text>
                                <TextInput
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#94A3B8"
                                    value={dueDate}
                                    onChangeText={setDueDate}
                                    style={styles.input}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Evidence</Text>
                                <TouchableOpacity style={styles.attachmentMini} onPress={pickImage}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.previewImageMini} />
                                    ) : (
                                        <RNView style={styles.attachmentContentMini}>
                                            <Camera size={20} color="#94A3B8" />
                                            <Text style={styles.attachmentTextMini}>Photo</Text>
                                        </RNView>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </RNView>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Reminder Frequency</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                                {['none', 'daily', 'weekly', 'custom', 'monthly', 'yearly'].map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        onPress={() => setReminderFrequency(f as any)}
                                        style={[styles.currencyChip, reminderFrequency === f && styles.currencyChipActive]}
                                    >
                                        <Text style={[styles.currencyChipText, reminderFrequency === f && styles.currencyChipTextActive]}>
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {reminderFrequency === 'custom' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Remind every X days</Text>
                                <TextInput
                                    placeholder="e.g. 3"
                                    placeholderTextColor="#94A3B8"
                                    value={reminderInterval}
                                    onChangeText={setReminderInterval}
                                    keyboardType="number-pad"
                                    style={styles.input}
                                />
                            </View>
                        )}
                    </Card>

                    <TouchableOpacity
                        onPress={onSave}
                        disabled={loading}
                        style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    >
                        <Text style={styles.saveButtonText}>{loading ? 'STAYING SECURE...' : 'Add Transaction'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.copyright}>© 2026 jreynoso — I GOT YOU</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 20,
        paddingTop: 120, // Account for transparent header
        paddingBottom: 40,
    },
    topCard: {
        marginBottom: 16,
        padding: 8,
    },
    categoryToggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 8,
    },
    categoryTab: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        gap: 8,
    },
    categoryTabActive: {
        backgroundColor: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    categoryTabTextActive: {
        color: '#FFFFFF',
    },
    typeToggleContainer: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: 'transparent',
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
    },
    typeCircle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#94A3B8',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    formCard: {
        marginBottom: 24,
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    currencySymbol: {
        fontSize: 40,
        fontWeight: '800',
        color: '#0F172A',
        marginRight: 10,
    },
    amountInput: {
        fontSize: 40,
        fontWeight: '800',
        flex: 1,
        color: '#0F172A',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 14,
        fontSize: 16,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: 'transparent',
    },
    contactChips: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },
    contactChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        marginRight: 8,
    },
    contactChipActive: {
        backgroundColor: '#6366F1',
    },
    contactChipText: {
        color: '#64748B',
        fontWeight: '600',
        fontSize: 14,
    },
    contactChipTextActive: {
        color: '#fff',
    },
    linkText: {
        color: '#6366F1',
        fontWeight: '700',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
    },
    attachmentMini: {
        height: 54,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    attachmentContentMini: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    attachmentTextMini: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },
    previewImageMini: {
        width: '100%',
        height: '100%',
    },
    saveButton: {
        backgroundColor: '#6366F1',
        padding: 20,
        borderRadius: 18,
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    copyright: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 32,
    },
    currencySelector: {
        marginTop: 12,
        flexDirection: 'row',
    },
    currencyChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    currencyChipActive: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    currencyChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    currencyChipTextActive: {
        color: '#FFFFFF',
    },
});
