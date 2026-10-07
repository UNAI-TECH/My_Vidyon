import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { Eye, ShieldCheck } from 'lucide-react-native';

interface ReadOnlyBadgeProps {
  label?: string;
  compact?: boolean;
}

export function ReadOnlyBadge({ label = 'Parent Read-Only View', compact = false }: ReadOnlyBadgeProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Eye size={compact ? 12 : 14} color={theme.colors.textMuted} style={styles.icon} />
      <Text style={[styles.text, compact && styles.compactText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  compactText: {
    fontSize: 10,
  },
});
