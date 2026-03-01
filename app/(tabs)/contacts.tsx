import React, { useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View as RNView, TextInput } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Search } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';

export default function ContactsScreen() {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      fetchContacts();
    }, [user])
  );

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true });
    setContacts(data || []);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.phone && contact.phone.includes(searchQuery)) ||
    (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Screen style={styles.container}>
      <RNView style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            placeholder="Search contacts..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </RNView>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No contacts found.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItemWrapper}
            onPress={() => router.push({ pathname: '/new-contact', params: { id: item.id } })}
          >
            <Card style={styles.contactItem}>
              <RNView style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
              </RNView>
              <RNView style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactDetail}>{item.phone || item.email || 'No details'}</Text>
              </RNView>
            </Card>
          </TouchableOpacity>
        )}
        ListFooterComponent={<Text style={styles.copyright}>© 2026 jreynoso — I GOT YOU</Text>}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/new-contact')}
      >
        <UserPlus color="#fff" size={28} />
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  contactItemWrapper: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },
  contactInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  contactDetail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  copyright: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 32,
    marginBottom: 100,
  },
});
