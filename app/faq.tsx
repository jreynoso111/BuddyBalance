import React from 'react';
import { ScrollView, StyleSheet, View as RNView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Card, Text } from '@/components/Themed';

const FAQ_ITEMS = [
  {
    question: 'How do I create a new record?',
    answer:
      'Add or pick a contact first, then use the "+" button from Home. You can choose a money record or an item record and save who shared what, how much, and when it should come back.',
  },
  {
    question: 'How do I add a payment or mark something as returned?',
    answer:
      'Open the record details screen and use "Add payment" for money or "Mark as Returned" for items. Payments are logged manually so the history stays clear even if the real transfer happened outside the app.',
  },
  {
    question: 'What does "Adjust total" do?',
    answer:
      'Adjust total changes the original amount of the record without deleting the payments already logged below. If the record is shared with the other person, the action becomes "Suggest new total" so they can confirm it.',
  },
  {
    question: 'Where can I see the history with one contact?',
    answer:
      'Go to Contacts and tap the contact row to expand it. You will see a compact snapshot, recent activity, open records, and a "View history" button for the full timeline with that person.',
  },
  {
    question: 'Does the app move real money?',
    answer:
      'No. I GOT YOU is only a shared memory and tracking app for people who lend money or items between friends and family. Real transfers still happen outside the app and are recorded here afterward.',
  },
  {
    question: 'Why do I still need confirmations?',
    answer:
      'Confirmations help when a record or payment is shared with the other person. They are there to avoid misunderstandings, not to act like a bank workflow.',
  },
  {
    question: 'Can I export my records?',
    answer:
      'Yes. Go to Settings and use "Export Data (CSV)" to export your records, payments, and contacts.',
  },
] as const;

export default function FAQScreen() {
  return (
    <Screen style={styles.container}>
      <Stack.Screen options={{ title: 'Frequently Asked Questions' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>Current guide</Text>
          <Text style={styles.introText}>
            This help section is kept aligned with the current app behavior, especially around contacts, payments, shared confirmations, and record adjustments.
          </Text>
        </Card>

        {FAQ_ITEMS.map((item) => (
          <Card key={item.question} style={styles.faqCard}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 120,
    paddingBottom: 40,
  },
  introCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#312E81',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4338CA',
  },
  faqCard: {
    padding: 18,
    marginBottom: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
});
