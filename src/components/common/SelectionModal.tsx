import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated,
  Dimensions,
  Pressable
} from 'react-native';
import { theme } from '../../theme';
import { X, Check } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SelectionOption {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValue?: string | number | null;
  onSelect: (option: SelectionOption) => void;
  onClose: () => void;
  showClear?: boolean;
  onClear?: () => void;
}

export const SelectionModal = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  showClear,
  onClear
}: SelectionModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.optionsList} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {showClear && (
              <TouchableOpacity 
                style={[styles.optionItem, !selectedValue && styles.selectedOption]} 
                onPress={() => {
                  onClear?.();
                  onClose();
                }}
              >
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, !selectedValue && styles.selectedLabel]}>All Options</Text>
                </View>
                {!selectedValue && <Check size={18} color={theme.colors.primary} {...({} as any)} />}
              </TouchableOpacity>
            )}

            {options.map((option) => {
              const isSelected = selectedValue === option.id || selectedValue === option.label;
              return (
                <TouchableOpacity 
                  key={option.id}
                  style={[styles.optionItem, isSelected && styles.selectedOption]}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                >
                  <View style={styles.optionInfo}>
                    {option.icon && (
                      <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                        {option.icon}
                      </View>
                    )}
                    <Text style={[styles.optionLabel, isSelected && styles.selectedLabel]}>
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkContainer}>
                      <Check size={18} color="white" {...({} as any)} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  selectedOption: {
    backgroundColor: 'white',
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  selectedIconContainer: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '20',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedLabel: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
