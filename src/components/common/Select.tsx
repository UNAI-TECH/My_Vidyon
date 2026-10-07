// ============================================================
// File: src/components/common/Select.tsx
// Purpose: Unified Select / Dropdown component for categories
// with search, clear, disabled/read-only styling, and modal selection.
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import {
  ChevronDown,
  X,
  Check,
  Search,
  Lock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  label?: string;
  value?: string | number | null;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  error?: string;
  helperText?: string;
  onSelect: (value: any, option?: SelectOption) => void;
  showClear?: boolean;
  onClear?: () => void;
  searchable?: boolean;
  containerStyle?: ViewStyle;
  triggerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  modalTitle?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  placeholder = 'Select an option...',
  required = false,
  readOnly = false,
  disabled = false,
  disabledReason,
  error,
  helperText,
  onSelect,
  showClear = false,
  onClear,
  searchable = true,
  containerStyle,
  triggerStyle,
  labelStyle,
  modalTitle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isInactive = readOnly || disabled;

  // Selected Option finding
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value || opt.label === value);
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleOpen = () => {
    if (isInactive) return;
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelect = (option: SelectOption) => {
    onSelect(option.value, option);
    setModalVisible(false);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onSelect(null);
    }
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label Row */}
      {label && (
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              isInactive && styles.labelDisabled,
              labelStyle,
            ]}
          >
            {label}
            {required && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>

          {isInactive && disabledReason && (
            <View style={styles.lockReasonBadge}>
              <Lock size={10} color="#64748B" {...({} as any)} />
              <Text style={styles.lockReasonText} numberOfLines={1}>
                {disabledReason}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Select Trigger Box */}
      <TouchableOpacity
        style={[
          styles.triggerBox,
          isInactive && styles.triggerBoxDisabled,
          Boolean(error) && styles.triggerBoxError,
          triggerStyle,
          Platform.OS === 'web' && (isInactive ? ({ cursor: 'not-allowed' } as any) : undefined),
        ]}
        onPress={handleOpen}
        activeOpacity={isInactive ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled: isInactive, expanded: modalVisible }}
      >
        <View style={styles.triggerValueRow}>
          {selectedOption?.icon && (
            <View style={styles.selectedIconBox}>{selectedOption.icon}</View>
          )}
          <Text
            style={[
              styles.triggerText,
              !selectedOption && styles.placeholderText,
              isInactive && styles.disabledText,
            ]}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>

        <View style={styles.triggerIcons}>
          {isInactive ? (
            <Lock size={15} color="#94A3B8" {...({} as any)} />
          ) : (
            <ChevronDown size={18} color="#64748B" {...({} as any)} />
          )}
        </View>
      </TouchableOpacity>

      {/* Inline Error Message */}
      {Boolean(error) && (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color="#EF4444" {...({} as any)} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Helper Text */}
      {!error && helperText && (
        <View style={styles.helperRow}>
          <HelpCircle size={12} color="#94A3B8" {...({} as any)} />
          <Text style={styles.helperText}>{helperText}</Text>
        </View>
      )}

      {/* Options Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{modalTitle || label || 'Select Option'}</Text>
                <Text style={styles.modalSub}>{options.length} options available</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={20} color="#64748B" {...({} as any)} />
              </TouchableOpacity>
            </View>

            {/* Search Input if enabled and > 5 options */}
            {searchable && options.length > 5 && (
              <View style={styles.searchBox}>
                <Search size={16} color="#94A3B8" {...({} as any)} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search options..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color="#94A3B8" {...({} as any)} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Options List */}
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {showClear && !required && selectedOption && (
                <TouchableOpacity
                  style={styles.clearOption}
                  onPress={handleClear}
                >
                  <Text style={styles.clearOptionText}>Clear Selection</Text>
                  <X size={16} color="#EF4444" {...({} as any)} />
                </TouchableOpacity>
              )}

              {filteredOptions.length === 0 ? (
                <View style={styles.emptyOptions}>
                  <Text style={styles.emptyText}>No matching options found</Text>
                </View>
              ) : (
                filteredOptions.map(option => {
                  const isSelected =
                    selectedOption?.value === option.value ||
                    value === option.value;
                  return (
                    <TouchableOpacity
                      key={String(option.value)}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() => handleSelect(option)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        {option.icon && (
                          <View style={styles.optionIconBox}>
                            {option.icon}
                          </View>
                        )}
                        <View>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.subLabel && (
                            <Text style={styles.optionSubLabel}>
                              {option.subLabel}
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.checkIconBox}>
                          <Check size={16} color="#1E293B" {...({} as any)} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  labelDisabled: {
    color: '#64748B',
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },
  lockReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '55%',
  },
  lockReasonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.m, // 12
    paddingHorizontal: 14,
    minHeight: 46,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  triggerBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  triggerBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  triggerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedIconBox: {
    marginRight: 2,
  },
  triggerText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  disabledText: {
    color: '#64748B',
  },
  triggerIcons: {
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 2,
  },
  optionsList: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  clearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    marginVertical: 4,
  },
  clearOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  optionRowSelected: {
    backgroundColor: '#FEF3C7', // Warm amber tint for active item
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  optionLabelSelected: {
    color: '#92400E',
    fontWeight: '700',
  },
  optionSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOptions: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
