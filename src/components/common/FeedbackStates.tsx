// ============================================================
// File: src/components/common/FeedbackStates.tsx
// Purpose: Standardized LoadingState, EmptyState, and ErrorState
// components with retry callback and authentic Vidyon theme tokens.
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';
import { AlertTriangle, RefreshCw, Inbox, LucideIcon } from 'lucide-react-native';
import { Button } from './Button';

// ------------------------------------------------------------
// 1. LoadingState Component
// ------------------------------------------------------------
export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  subMessage,
  size = 'large',
  color = theme.colors.primary,
  style,
}) => {
  return (
    <View style={[styles.centerContainer, style]}>
      <View style={styles.spinnerCircle}>
        <ActivityIndicator size={size} color={color} />
      </View>
      <Text style={styles.loadingTitle}>{message}</Text>
      {subMessage && <Text style={styles.loadingSub}>{subMessage}</Text>}
    </View>
  );
};

// ------------------------------------------------------------
// 2. EmptyState Component
// ------------------------------------------------------------
export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There is currently no information available for this view.',
  icon: Icon = Inbox,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.centerContainer, styles.emptyBox, style]}>
      <View style={styles.iconCircle}>
        <Icon size={32} color="#94A3B8" {...({} as any)} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
      {actionTitle && onAction && (
        <View style={styles.actionWrap}>
          <Button
            title={actionTitle}
            onPress={onAction}
            variant="outline"
            size="sm"
          />
        </View>
      )}
    </View>
  );
};

// ------------------------------------------------------------
// 3. ErrorState Component
// ------------------------------------------------------------
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An unexpected network or service error occurred. Please verify your connection and try again.',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.centerContainer, styles.errorBox, style]}>
      <View style={styles.errorIconCircle}>
        <AlertTriangle size={32} color="#EF4444" {...({} as any)} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDesc}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <RefreshCw size={15} color="#1E293B" {...({} as any)} />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  spinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  actionWrap: {
    marginTop: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: 12,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
});
