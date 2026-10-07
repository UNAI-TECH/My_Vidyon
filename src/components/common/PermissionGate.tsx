// ============================================================
// File: src/components/common/PermissionGate.tsx
// Purpose: Declarative permission gate component for hiding or disabling UI elements
// ============================================================

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { useRBAC } from '../../hooks/useRBAC';
import { Action, ERPModule, RBACResource } from '../../types/rbac';

export interface PermissionGateProps {
  module: ERPModule;
  action: Action;
  resource?: RBACResource | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'hide' | 'disable';
  disabledOpacity?: number;
  showStakeholderAlertOnPress?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  resource,
  children,
  fallback = null,
  mode = 'hide',
  disabledOpacity = 0.4,
  showStakeholderAlertOnPress = true,
}) => {
  const { can, isStakeholder } = useRBAC();
  const isAllowed = can(module, action, resource);

  if (isAllowed) {
    return <>{children}</>;
  }

  // If mode is 'hide', render fallback
  if (mode === 'hide') {
    return <>{fallback}</>;
  }

  // If mode is 'disable', wrap children and block interactions
  const handleDisabledPress = () => {
    if (isStakeholder && showStakeholderAlertOnPress) {
      Alert.alert(
        'Read-Only Access',
        'Institution Stakeholders have view-only access. Write operations (create, edit, delete, approve) are not permitted.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleDisabledPress}
      style={[styles.disabledWrapper, { opacity: disabledOpacity }]}
    >
      <View pointerEvents="none">
        {children}
      </View>
    </TouchableOpacity>
  );
};

export const StakeholderReadOnlyBanner: React.FC<{ institutionName?: string }> = ({ institutionName }) => {
  const { isStakeholder } = useRBAC();
  if (!isStakeholder) return null;

  return (
    <View style={styles.bannerContainer}>
      <Text style={styles.bannerText}>
        👁️ Stakeholder View-Only Mode {institutionName ? `• ${institutionName}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  disabledWrapper: {
    // Container for disabled mode
  },
  bannerContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
});
