import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { X, Check } from 'lucide-react-native';

interface PickerSheetProps {
  visible: boolean;
  title: string;
  options: { label: string; value: any }[];
  selectedValue: any;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export const PickerSheet = ({ visible, title, options, selectedValue, onSelect, onClose }: PickerSheetProps) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.colors.text} {...({} as any)} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map((option, idx) => (
              <TouchableOpacity 
                key={idx}
                style={[styles.option, selectedValue === option.value && styles.selectedOption]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, selectedValue === option.value && styles.selectedText]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Check size={20} color={theme.colors.primary} {...({} as any)} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    maxHeight: '80%',
    paddingBottom: 40
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  closeBtn: { padding: 4 },
  list: { padding: 12 },
  option: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderRadius: 16,
    marginBottom: 4
  },
  selectedOption: { backgroundColor: '#F59E0B10' },
  optionText: { fontSize: 16, color: theme.colors.text },
  selectedText: { color: theme.colors.primary, fontWeight: 'bold' },
});
