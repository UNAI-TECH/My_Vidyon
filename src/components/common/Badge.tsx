import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  children: string;
  variant?: 'success' | 'warning' | 'info' | 'destructive' | 'default';
  style?: any;
  textStyle?: any;
}

export const Badge = ({ children, variant = 'default', style, textStyle }: BadgeProps) => {
  const getStyles = () => {
    switch (variant) {
      case 'success': return { bg: '#10B98120', text: '#10B981' };
      case 'warning': return { bg: '#F59E0B20', text: '#F59E0B' };
      case 'info': return { bg: '#3B82F620', text: '#3B82F6' };
      case 'destructive': return { bg: '#EF444420', text: '#EF4444' };
      default: return { bg: '#E2E8F0', text: '#64748B' };
    }
  };

  const colors = getStyles();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }, textStyle]}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});
