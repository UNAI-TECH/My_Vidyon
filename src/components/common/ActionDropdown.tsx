// ============================================================
// File: src/components/common/ActionDropdown.tsx
// Purpose: Clean, reusable Action Dropdown button for DataTable rows
//          and page headers, displaying actions in an accessible modal sheet.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import { ChevronDown, MoreVertical, X, Check } from 'lucide-react-native';

export interface ActionDropdownItem {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'destructive';
  disabled?: boolean;
  onPress: () => void;
}

export interface ActionDropdownProps {
  label?: string;
  iconOnly?: boolean;
  items: ActionDropdownItem[];
  containerStyle?: ViewStyle;
  triggerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  modalTitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  label = 'Actions',
  iconOnly = false,
  items,
  containerStyle,
  triggerStyle,
  labelStyle,
  modalTitle = 'Available Actions',
  size = 'md',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (item: ActionDropdownItem) => {
    if (item.disabled) return;
    setModalVisible(false);
    // Execute after modal dismisses smoothly
    setTimeout(() => {
      item.onPress();
    }, 120);
  };

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return {
          textColor: theme.colors.primary,
          bg: '#EEF2FF',
          badgeBg: '#E0E7FF',
        };
      case 'warning':
        return {
          textColor: '#B45309',
          bg: '#FEF3C7',
          badgeBg: '#FDE68A',
        };
      case 'success':
        return {
          textColor: '#15803D',
          bg: '#DCFCE7',
          badgeBg: '#BBF7D0',
        };
      case 'destructive':
        return {
          textColor: '#DC2626',
          bg: '#FEE2E2',
          badgeBg: '#FECACA',
        };
      default:
        return {
          textColor: theme.colors.text,
          bg: '#F8FAFC',
          badgeBg: '#E2E8F0',
        };
    }
  };

  const isSmall = size === 'sm';

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.trigger,
          isSmall ? styles.triggerSmall : styles.triggerMedium,
          triggerStyle,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {iconOnly ? (
          <MoreVertical size={isSmall ? 16 : 18} color={theme.colors.textMuted} {...({} as any)} />
        ) : (
          <View style={styles.triggerContent}>
            <Text style={[styles.triggerText, isSmall && styles.triggerTextSmall, labelStyle]}>
              {label}
            </Text>
            <ChevronDown size={isSmall ? 13 : 15} color={theme.colors.textMuted} {...({} as any)} />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#64748B" {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
              {items.map((item) => {
                const colors = getVariantStyles(item.variant);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.actionItem,
                      item.disabled && styles.actionItemDisabled,
                    ]}
                    onPress={() => handleSelect(item)}
                    disabled={item.disabled}
                    activeOpacity={0.65}
                  >
                    <View style={styles.actionItemLeft}>
                      {item.icon && (
                        <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
                          {item.icon}
                        </View>
                      )}
                      <View style={styles.textContainer}>
                        <Text
                          style={[
                            styles.itemLabel,
                            { color: item.disabled ? '#94A3B8' : colors.textColor },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subLabel ? (
                          <Text style={styles.itemSubLabel}>{item.subLabel}</Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  triggerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    minHeight: 28,
  },
  triggerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  triggerTextSmall: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  itemsList: {
    paddingVertical: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionItemDisabled: {
    opacity: 0.5,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
