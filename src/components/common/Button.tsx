// ============================================================
// File: src/components/common/Button.tsx
// Purpose: Standard Button with loading, disabled, and consistent
// confirmation behavior for destructive actions.
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Alert,
  View,
  Platform,
} from 'react-native';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ConfirmConfig {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  confirm?: boolean | ConfirmConfig;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  confirm = false,
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
}) => {
  const isInactive = disabled || loading;

  const handlePress = () => {
    if (isInactive) return;

    if (confirm) {
      const config: ConfirmConfig =
        typeof confirm === 'object'
          ? confirm
          : {
              title: variant === 'destructive' ? 'Confirm Deletion' : 'Are you sure?',
              message: 'This action cannot be undone. Do you wish to continue?',
              confirmText: variant === 'destructive' ? 'Yes, Delete' : 'Confirm',
              cancelText: 'Cancel',
              destructive: variant === 'destructive',
            };

      Alert.alert(
        config.title || 'Confirm Action',
        config.message || 'Are you sure you want to proceed?',
        [
          {
            text: config.cancelText || 'Cancel',
            style: 'cancel',
          },
          {
            text: config.confirmText || 'Confirm',
            style: config.destructive ? 'destructive' : 'default',
            onPress: () => onPress(),
          },
        ]
      );
      return;
    }

    onPress();
  };

  // Determine spinner color
  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
        return '#1E293B';
      case 'secondary':
      case 'destructive':
        return '#FFFFFF';
      default:
        return theme.colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isInactive && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
        Platform.OS === 'web' && (isInactive ? ({ cursor: 'not-allowed' } as any) : ({ cursor: 'pointer' } as any)),
      ]}
      onPress={handlePress}
      activeOpacity={isInactive ? 1 : 0.75}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
    >
      {loading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator size="small" color={getSpinnerColor()} />
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
            Loading...
          </Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconBoxLeft}>{icon}</View>}
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconBoxRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.m, // 12
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconBoxLeft: {
    marginRight: 2,
  },
  iconBoxRight: {
    marginLeft: 2,
  },

  // Variants
  primary: {
    backgroundColor: theme.colors.primary, // #FAB75A Vidyon signature warm gold
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: theme.colors.secondary, // #F59E0B
    borderWidth: 0,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  destructive: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },

  // Sizes
  size_sm: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 8,
  },
  size_md: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: 12,
  },
  size_lg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
    borderRadius: 14,
  },

  // Text base
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },

  // Text Variants
  text_primary: {
    color: '#1E293B',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: theme.colors.text,
  },
  text_ghost: {
    color: '#64748B',
  },
  text_destructive: {
    color: '#FFFFFF',
  },

  // Text Sizes
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 16,
  },

  // Inactive
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});
