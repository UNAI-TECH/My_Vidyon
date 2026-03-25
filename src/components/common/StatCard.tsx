import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  onPress?: () => void;
}

export const StatCard = ({ title, value, icon: Icon, iconColor, change, changeType = 'neutral', onPress }: StatCardProps) => {
  const getChangeColor = () => {
    if (changeType === 'positive') return '#10B981';
    if (changeType === 'negative') return '#EF4444';
    return theme.colors.textMuted;
  };

  const CardView = (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: iconColor ? `${iconColor}20` : `${theme.colors.primary}20` }]}>
          <Icon size={20} color={iconColor || theme.colors.primary} {...({} as any)} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {change && (
        <Text style={[styles.change, { color: getChangeColor() }]}>
          {change}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ width: '48%' }}>
        {CardView}
      </TouchableOpacity>
    );
  }

  return <View style={{ width: '48%' }}>{CardView}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  change: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
