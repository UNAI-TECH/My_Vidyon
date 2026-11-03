// ============================================================
// File: src/components/common/MultiSelectDropdown.tsx
// Purpose: Reusable Multi-Select Dropdown component with searchable modal,
//          Select All / Clear All, and removable badge pills preview.
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
  CheckCheck,
  RotateCcw,
} from 'lucide-react-native';
import { SelectOption } from './Select';

export interface MultiSelectDropdownProps {
  label?: string;
  options: SelectOption[];
  selectedValues: (string | number)[];
  onChange: (values: any[]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  error?: string;
  helperText?: string;
  searchable?: boolean;
  sortOptions?: boolean;
  containerStyle?: ViewStyle;
  triggerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  modalTitle?: string;
  maxDisplayBadges?: number;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues = [],
  onChange,
  placeholder = 'Select multiple items...',
  required = false,
  disabled = false,
  disabledReason,
  error,
  helperText,
  searchable = true,
  sortOptions = true,
  containerStyle,
  triggerStyle,
  labelStyle,
  modalTitle = 'Select Items',
  maxDisplayBadges = 5,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isNavigatingWithArrows, setIsNavigatingWithArrows] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Selected Option objects
  const selectedOptions = useMemo(() => {
    return options.filter(opt => selectedValues.includes(opt.value));
  }, [options, selectedValues]);

  // Filtered and A-Z sorted options
  const filteredOptions = useMemo(() => {
    let list = [...options];

    if (sortOptions) {
      list.sort((a, b) => {
        const aVal = String(a.value).toLowerCase();
        const bVal = String(b.value).toLowerCase();
        if (aVal === 'all' || aVal === '') return -1;
        if (bVal === 'all' || bVal === '') return 1;
        if (aVal.startsWith('__') || a.label.startsWith('+')) return 1;
        if (bVal.startsWith('__') || b.label.startsWith('+')) return -1;
        return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
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
      const el = document.getElementById(`multi-opt-${highlightedIndex}`);
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

      // 3. Enter key: toggles highlighted option
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          toggleValue(filteredOptions[highlightedIndex].value);
        } else if (filteredOptions.length > 0) {
          toggleValue(filteredOptions[0].value);
        }
        return;
      }

      // 4. Space key: toggles highlighted option when arrow-navigating or when input not focused
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === ' ' || e.key === 'Spacebar') {
        if (isNavigatingWithArrows || !isInputActive) {
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            e.preventDefault();
            toggleValue(filteredOptions[highlightedIndex].value);
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
  }, [modalVisible, searchable, filteredOptions, highlightedIndex, isNavigatingWithArrows, selectedValues]);

  const toggleValue = (val: string | number) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    const allVals = filteredOptions.map(opt => opt.value);
    const combined = Array.from(new Set([...selectedValues, ...allVals]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const removeValue = (val: string | number, e?: any) => {
    e?.stopPropagation?.();
    onChange(selectedValues.filter(v => v !== val));
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {Boolean(label) && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>
        </View>
      )}

      {/* Trigger Box */}
      <TouchableOpacity
        style={[
          styles.trigger,
          error ? styles.triggerError : null,
          disabled ? styles.triggerDisabled : null,
          triggerStyle,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          {selectedOptions.length === 0 ? (
            <Text style={styles.placeholderText}>{placeholder}</Text>
          ) : (
            <View style={styles.badgeRow}>
              {selectedOptions.slice(0, maxDisplayBadges).map(opt => (
                <View key={String(opt.value)} style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {!disabled && (
                    <TouchableOpacity
                      onPress={(e) => removeValue(opt.value, e)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <X size={12} color="#4338CA" {...({} as any)} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {selectedOptions.length > maxDisplayBadges && (
                <View style={[styles.badge, styles.badgeMore]}>
                  <Text style={styles.badgeMoreText}>
                    +{selectedOptions.length - maxDisplayBadges} more
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <ChevronDown size={18} color="#64748B" style={styles.chevron} {...({} as any)} />
      </TouchableOpacity>

      {/* Helper / Error Text */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Multi-Select Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
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
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedValues.length} of {options.length} selected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#64748B" {...({} as any)} />
              </TouchableOpacity>
            </View>

            {/* Quick Bulk Action Buttons */}
            <View style={styles.bulkActionsRow}>
              <TouchableOpacity
                style={styles.bulkBtn}
                onPress={handleSelectAll}
                activeOpacity={0.7}
              >
                <CheckCheck size={14} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.bulkBtnText}>Select All ({filteredOptions.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkBtn}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <RotateCcw size={14} color="#64748B" {...({} as any)} />
                <Text style={[styles.bulkBtnText, { color: '#64748B' }]}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            {searchable && (
              <View style={[styles.searchBox, isSearchFocused && styles.searchBoxFocused]}>
                <Search size={16} color={isSearchFocused ? theme.colors.primary : '#94A3B8'} {...({} as any)} />
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.searchInput,
                    Platform.OS === 'web' && ({ outlineStyle: 'none', outline: 'none' } as any),
                  ]}
                  placeholder="Search items..."
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
                              toggleValue(filteredOptions[highlightedIndex].value);
                            } else if (filteredOptions.length > 0) {
                              toggleValue(filteredOptions[0].value);
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
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No matching items found</Text>
                </View>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = selectedValues.includes(opt.value);
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      {...(Platform.OS === 'web' ? { id: `multi-opt-${idx}` } : {}) as any}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                        isHighlighted && styles.optionItemHighlighted,
                      ]}
                      onPress={() => toggleValue(opt.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.checkbox}>
                        {isSelected && <Check size={14} color="white" {...({} as any)} />}
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                            isHighlighted && styles.optionLabelHighlighted,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {opt.subLabel ? (
                          <Text style={styles.optionSubLabel}>{opt.subLabel}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Done Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>
                  Done ({selectedValues.length} Selected)
                </Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  triggerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  triggerDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  triggerContent: {
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  chevron: {
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
    maxWidth: 160,
  },
  badgeMore: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  badgeMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bulkBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 340,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  optionItemHighlighted: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#166534',
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
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
