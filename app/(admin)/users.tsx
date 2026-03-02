import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { Search, User as UserIcon, AlertCircle, RefreshCcw } from 'lucide-react-native';

interface AdminUserProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    updated_at: string;
}

export default function AdminUsersList() {
    const [users, setUsers] = useState<AdminUserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setUsers(data as AdminUserProfile[]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const filteredUsers = users.filter((u) => {
        const query = search.toLowerCase();
        return (
            (u.full_name || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.phone || '').includes(query)
        );
    });

    const renderItem = ({ item }: { item: AdminUserProfile }) => (
        <Card style={styles.userCard}>
            <View style={styles.userLeft}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.full_name ? item.full_name[0].toUpperCase() : item.email ? item.email[0].toUpperCase() : '?'}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.full_name || 'No Name'}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
                </View>
            </View>
            <View style={styles.userRight}>
                <Text style={[styles.roleBadge, item.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                    {item.role.toUpperCase()}
                </Text>
            </View>
        </Card>
    );

    if (loading && !refreshing) {
        return (
            <Screen style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </Screen>
        );
    }

    if (error) {
        return (
            <Screen style={[styles.container, styles.center]}>
                <AlertCircle size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchUsers} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </Screen>
        );
    }

    return (
        <Screen style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search users by name, email, or phone..."
                        placeholderTextColor="#94A3B8"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                    <RefreshCcw size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <UserIcon size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No users found.</Text>
                    </View>
                }
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0F172A',
    },
    refreshBtn: {
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
    },
    userLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#6366F1',
        fontWeight: '700',
        fontSize: 18,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    userEmail: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    userPhone: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    userRight: {
        paddingLeft: 12,
    },
    roleBadge: {
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    roleAdmin: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
    },
    roleUser: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        color: '#6366F1',
    },
    errorText: {
        marginTop: 16,
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 24,
        backgroundColor: '#6366F1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        color: '#94A3B8',
        fontSize: 15,
    },
});
