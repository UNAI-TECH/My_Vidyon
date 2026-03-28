import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { LucideIcon } from 'lucide-react-native';
import { Link } from 'expo-router';

interface ShortcutItem {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

interface ShortcutGridProps {
  items: ShortcutItem[];
}

export const ShortcutGrid = ({ items }: ShortcutGridProps) => {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <Link key={index} href={item.href as any} asChild>
          <TouchableOpacity style={styles.card}>
            <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
              <item.icon size={24} color={item.color} {...({} as any)} />
            </View>
            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: theme.metrics.isSmallDevice ? '30%' : '22%', // 3 items on small, 4 on others
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: theme.metrics.isSmallDevice ? 36 : 44,
    height: theme.metrics.isSmallDevice ? 36 : 44,
    borderRadius: theme.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
