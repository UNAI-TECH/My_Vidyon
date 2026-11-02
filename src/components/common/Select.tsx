// ============================================================
// File: src/components/common/Select.tsx
// Purpose: Unified Select / Dropdown component for categories
// with search, clear, disabled/read-only styling, and modal selection.
// ============================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  sortOptions?: boolean;
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
  sortOptions = true,
  containerStyle,
  triggerStyle,
  labelStyle,
  modalTitle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isNavigatingWithArrows, setIsNavigatingWithArrows] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const isInactive = readOnly || disabled;

  // Selected Option finding
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value || opt.label === value);
  }, [options, value]);

  // Filtered and A-Z sorted options
  const filteredOptions = useMemo(() => {
    let list = [...options];

    if (sortOptions) {
      list.sort((a, b) => {
        // Keep 'All ...' or empty values at the top
        const aVal = String(a.value).toLowerCase();
        const bVal = String(b.value).toLowerCase();
        if (aVal === 'all' || aVal === '') return -1;
        if (bVal === 'all' || bVal === '') return 1;

        // Keep '+ Add' or '+ Register' or '__custom__' at the bottom
        const aIsSpecialEnd = aVal.startsWith('__') || a.label.startsWith('+');
        const bIsSpecialEnd = bVal.startsWith('__') || b.label.startsWith('+');
        if (aIsSpecialEnd && !bIsSpecialEnd) return 1;
        if (!aIsSpecialEnd && bIsSpecialEnd) return -1;

        // A-Z ascending order (natural alphanumeric)
        return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter(
      opt =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery, sortOptions]);

  // Auto-focus search input whenever modal opens
  useEffect(() => {
    if (modalVisible) {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      setIsNavigatingWithArrows(false);
      if (searchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [modalVisible, searchable]);

  // Reset highlight to top recommendation whenever search query changes
  useEffect(() => {
    if (modalVisible) {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      setIsNavigatingWithArrows(false);
    }
  }, [searchQuery, filteredOptions.length]);

  // Smooth scroll highlighted option into view on Web
  useEffect(() => {
    if (Platform.OS === 'web' && modalVisible && highlightedIndex >= 0) {
      const el = document.getElementById(`select-opt-${highlightedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, modalVisible]);

  // Global key navigation: ArrowUp, ArrowDown, Enter, Space, and type-ahead
  useEffect(() => {
    if (Platform.OS !== 'web' || !modalVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setModalVisible(false);
        return;
      }

      // 1. ArrowDown navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsNavigatingWithArrows(true);
        setHighlightedIndex(prev => {
          if (filteredOptions.length === 0) return -1;
          const next = prev + 1;
          return next < filteredOptions.length ? next : 0;
        });
        return;
      }

      // 2. ArrowUp navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsNavigatingWithArrows(true);
        setHighlightedIndex(prev => {
          if (filteredOptions.length === 0) return -1;
          const next = prev - 1;
          return next >= 0 ? next : filteredOptions.length - 1;
        });
        return;
      }

      // 3. Enter key: selects highlighted option or top recommended match
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
        return;
      }

      // 4. Space key: selects highlighted option when arrow-navigating or when input not focused
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === ' ' || e.key === 'Spacebar') {
        if (isNavigatingWithArrows || !isInputActive) {
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            e.preventDefault();
            handleSelect(filteredOptions[highlightedIndex]);
            return;
          }
        }
      }

      // 5. Global type-ahead when search input not active
      if (!isInputActive && searchable) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          setSearchQuery(prev => prev.slice(0, -1));
          searchInputRef.current?.focus();
        } else if (e.key.length === 1) {
          e.preventDefault();
          setSearchQuery(prev => prev + e.key);
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [modalVisible, searchable, filteredOptions, highlightedIndex, isNavigatingWithArrows]);

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
        <View style={styles.modalOverlay}>
          {/* Backdrop Dismiss Area */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          {/* Modal Dialog Content */}
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            {...(Platform.OS === 'web'
              ? {
                  onClick: (e: any) => {
                    e.stopPropagation();
                  },
                }
              : {})}
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
              <View style={[styles.searchBox, isSearchFocused && styles.searchBoxFocused]}>
                <Search size={16} color={isSearchFocused ? theme.colors.primary : '#94A3B8'} {...({} as any)} />
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.searchInput,
                    Platform.OS === 'web' && ({ outlineStyle: 'none', outline: 'none' } as any),
                  ]}
                  placeholder="Search options..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoFocus={true}
                  {...(Platform.OS === 'web'
                    ? {
                        onKeyDown: (e: any) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setIsNavigatingWithArrows(true);
                            setHighlightedIndex(prev => {
                              if (filteredOptions.length === 0) return -1;
                              const next = prev + 1;
                              return next < filteredOptions.length ? next : 0;
                            });
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setIsNavigatingWithArrows(true);
                            setHighlightedIndex(prev => {
                              if (filteredOptions.length === 0) return -1;
                              const next = prev - 1;
                              return next >= 0 ? next : filteredOptions.length - 1;
                            });
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                              handleSelect(filteredOptions[highlightedIndex]);
                            } else if (filteredOptions.length > 0) {
                              handleSelect(filteredOptions[0]);
                            }
                          }
                        },
                      }
                    : {})}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.searchClearBtn}
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color="#64748B" {...({} as any)} />
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
                filteredOptions.map((option, idx) => {
                  const isSelected =
                    selectedOption?.value === option.value ||
                    value === option.value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <TouchableOpacity
                      key={String(option.value)}
                      {...(Platform.OS === 'web' ? { id: `select-opt-${idx}` } : {}) as any}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        isHighlighted && styles.optionRowHighlighted,
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
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                              isHighlighted && styles.optionLabelHighlighted,
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
        </View>
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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchBoxFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    height: '100%',
  },
  searchClearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
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
  optionRowHighlighted: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
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
  optionLabelHighlighted: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  highlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 6,
  },
  highlightBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
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
