import React from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppLegalFooter } from '@/components/AppLegalFooter';
import { BrandLogo } from '@/components/BrandLogo';
import { Text } from '@/components/Themed';

type AuthAction = {
  href: Href;
  label: string;
};

export function WebAuthLayout({
  eyebrow,
  title,
  description,
  highlights,
  children,
  altAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  children: React.ReactNode;
  altAction?: AuthAction;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 960;
  const mobile = width < 720;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, mobile && styles.pageContentMobile]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={[styles.leftColumn, compact && styles.columnCompact]}>
          <View style={[styles.heroCard, mobile && styles.surfaceMobile]}>
            <Link href="/" asChild>
              <Pressable style={styles.brandWrap}>
                <BrandLogo size="lg" showWordmark />
              </Pressable>
            </Link>

            <Text style={[styles.eyebrow, mobile && styles.eyebrowMobile]}>{eyebrow}</Text>
            <Text style={[styles.title, compact && styles.titleCompact, mobile && styles.titleMobile]}>{title}</Text>
            <Text style={[styles.description, compact && styles.descriptionCompact]}>{description}</Text>

            <View style={styles.highlightList}>
              {highlights.map((item) => (
                <View key={item} style={styles.highlightPill}>
                  <Text style={styles.highlightText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Same account, same data.</Text>
              <Text style={styles.noteText}>
                The web account center uses the same Buddy Balance credentials, plan state, profile data, and support
                preferences as the mobile app.
              </Text>
            </View>

            <AppLegalFooter style={styles.footer} />
          </View>
        </View>

        <View style={[styles.rightColumn, compact && styles.columnCompact]}>
          <View style={[styles.panel, mobile && styles.surfaceMobile]}>
            {altAction ? (
              <Link href={altAction.href} asChild>
                <Pressable style={styles.altAction}>
                  <Text style={styles.altActionText}>{altAction.label}</Text>
                </Pressable>
              </Link>
            ) : null}

            {children}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#EEF3FF',
  },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  pageContentMobile: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  shell: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  shellCompact: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1.08,
    minWidth: 320,
  },
  rightColumn: {
    flex: 0.92,
    minWidth: 320,
  },
  columnCompact: {
    width: '100%',
    minWidth: 0,
    flex: 0,
  },
  heroCard: {
    borderRadius: 36,
    padding: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: '#D8E2FF',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 34,
    elevation: 10,
  },
  surfaceMobile: {
    borderRadius: 24,
    padding: 18,
  },
  brandWrap: {
    alignSelf: 'flex-start',
  },
  eyebrow: {
    marginTop: 28,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  eyebrowMobile: {
    marginTop: 20,
  },
  title: {
    marginTop: 14,
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '900',
    color: '#0F172A',
    maxWidth: 580,
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 38,
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 32,
  },
  description: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 29,
    color: '#475569',
    maxWidth: 580,
  },
  descriptionCompact: {
    fontSize: 16,
    lineHeight: 25,
  },
  highlightList: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E2FF',
    backgroundColor: '#F8FAFF',
  },
  highlightText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: '#334155',
  },
  noteCard: {
    marginTop: 28,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#151E52',
  },
  noteTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  noteText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#CBD5FF',
  },
  footer: {
    marginTop: 28,
    color: '#64748B',
    fontSize: 12,
  },
  panel: {
    borderRadius: 36,
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E2FF',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 34,
    elevation: 10,
  },
  altAction: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E2FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFF',
  },
  altActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
});
