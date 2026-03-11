import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemePreference, useThemeStore } from '@/store/themeStore';

const THEME_OPTIONS: Array<{
  label: string;
  value: ThemePreference;
}> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function ThemeToggleButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const colorScheme = useColorScheme();
  const toggleThemePreference = useThemeStore((state) => state.toggleThemePreference);
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={() => void toggleThemePreference(colorScheme)}
      style={({ hovered, pressed }) => [
        styles.toggleButton,
        compact && styles.toggleButtonCompact,
        isDark ? styles.toggleButtonDark : styles.toggleButtonLight,
        hovered && styles.toggleButtonHovered,
        pressed && styles.toggleButtonPressed,
      ]}
    >
      <Text style={[styles.toggleButtonLabel, isDark ? styles.toggleButtonLabelDark : styles.toggleButtonLabelLight]}>
        {isDark ? 'Light mode' : 'Dark mode'}
      </Text>
    </Pressable>
  );
}

export function ThemePreferencePicker({
  title = 'Appearance',
  description = 'Choose how Buddy Balance should look on this device.',
}: {
  title?: string;
  description?: string;
}) {
  const colorScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const setThemePreference = useThemeStore((state) => state.setThemePreference);
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.pickerBlock}>
      <Text style={[styles.pickerTitle, isDark && styles.pickerTitleDark]}>{title}</Text>
      <Text style={[styles.pickerDescription, isDark && styles.pickerDescriptionDark]}>{description}</Text>

      <View style={[styles.pickerRow, isDark && styles.pickerRowDark]}>
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => void setThemePreference(option.value)}
              style={({ hovered, pressed }) => [
                styles.pickerOption,
                isDark ? styles.pickerOptionDark : styles.pickerOptionLight,
                active && (isDark ? styles.pickerOptionActiveDark : styles.pickerOptionActiveLight),
                hovered && styles.pickerOptionHovered,
                pressed && styles.pickerOptionPressed,
              ]}
            >
              <Text
                style={[
                  styles.pickerOptionLabel,
                  isDark ? styles.pickerOptionLabelDark : styles.pickerOptionLabelLight,
                  active && styles.pickerOptionLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonCompact: {
    flex: 1,
  },
  toggleButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DAFF',
  },
  toggleButtonDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  toggleButtonHovered: {
    opacity: 0.96,
    transform: [{ translateY: -1 }],
  },
  toggleButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  toggleButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  toggleButtonLabelLight: {
    color: '#1E293B',
  },
  toggleButtonLabelDark: {
    color: '#E2E8F0',
  },
  pickerBlock: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerTitleDark: {
    color: '#F8FAFC',
  },
  pickerDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  pickerDescriptionDark: {
    color: '#94A3B8',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
  },
  pickerRowDark: {
    backgroundColor: '#111827',
  },
  pickerOption: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DAFF',
  },
  pickerOptionDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
  },
  pickerOptionActiveLight: {
    backgroundColor: '#5B63FF',
    borderColor: '#5B63FF',
  },
  pickerOptionActiveDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  pickerOptionHovered: {
    opacity: 0.96,
  },
  pickerOptionPressed: {
    opacity: 0.92,
  },
  pickerOptionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  pickerOptionLabelLight: {
    color: '#334155',
  },
  pickerOptionLabelDark: {
    color: '#CBD5E1',
  },
  pickerOptionLabelActive: {
    color: '#FFFFFF',
  },
});
