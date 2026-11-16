import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { theme } from '../../theme';
import { X, Clock, Check } from 'lucide-react-native';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialTime?: Date;
  title?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PRESETS = [
  { label: '8:00 AM', hour: 8, minute: 0, period: 'AM' },
  { label: '9:00 AM', hour: 9, minute: 0, period: 'AM' },
  { label: '9:30 AM', hour: 9, minute: 30, period: 'AM' },
  { label: '10:00 AM', hour: 10, minute: 0, period: 'AM' },
  { label: '11:00 AM', hour: 11, minute: 0, period: 'AM' },
  { label: '12:00 PM', hour: 12, minute: 0, period: 'PM' },
  { label: '1:00 PM', hour: 1, minute: 0, period: 'PM' },
  { label: '2:00 PM', hour: 2, minute: 0, period: 'PM' },
  { label: '3:00 PM', hour: 3, minute: 0, period: 'PM' },
  { label: '4:00 PM', hour: 4, minute: 0, period: 'PM' },
  { label: '5:30 PM', hour: 5, minute: 30, period: 'PM' },
];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialTime,
  title = "Select Time"
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (initialTime && visible) {
      let h = initialTime.getHours();
      const m = initialTime.getMinutes();
      const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      setSelectedHour(h);
      
      // Round to nearest 5 min or match exact
      const closestMin = Math.round(m / 5) * 5;
      const formattedMin = (closestMin % 60).toString().padStart(2, '0');
      setSelectedMinute(formattedMin);
      setSelectedPeriod(p);
    }
  }, [initialTime, visible]);

  const handleConfirm = () => {
    const date = initialTime ? new Date(initialTime) : new Date();
    let hours = selectedHour;
    if (selectedPeriod === 'PM' && hours < 12) {
      hours += 12;
    } else if (selectedPeriod === 'AM' && hours === 12) {
      hours = 0;
    }
    date.setHours(hours, parseInt(selectedMinute, 10), 0, 0);
    onSelect(date);
    onClose();
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setSelectedHour(preset.hour);
    setSelectedMinute(preset.minute.toString().padStart(2, '0'));
    setSelectedPeriod(preset.period as 'AM' | 'PM');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Clock size={20} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Time Display & AM/PM Toggle */}
          <View style={styles.displayCard}>
            <Text style={styles.timeDisplay}>
              {selectedHour.toString().padStart(2, '0')}:{selectedMinute}
            </Text>
            <View style={styles.periodToggle}>
              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'AM' && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod('AM')}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'AM' && styles.periodBtnTextActive]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'PM' && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod('PM')}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'PM' && styles.periodBtnTextActive]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Presets */}
          <Text style={styles.sectionLabel}>Quick Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {PRESETS.map((preset, idx) => {
              const isMatch = selectedHour === preset.hour && 
                              parseInt(selectedMinute, 10) === preset.minute && 
                              selectedPeriod === preset.period;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetChip, isMatch && styles.presetChipActive]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text style={[styles.presetText, isMatch && styles.presetTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Hour Selector */}
          <Text style={styles.sectionLabel}>Hour</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => {
              const isSelected = selectedHour === h;
              return (
                <TouchableOpacity
                  key={h}
                  style={[styles.gridCell, isSelected && styles.gridCellActive]}
                  onPress={() => setSelectedHour(h)}
                >
                  <Text style={[styles.gridCellText, isSelected && styles.gridCellTextActive]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Minute Selector */}
          <Text style={styles.sectionLabel}>Minute</Text>
          <View style={styles.grid}>
            {MINUTES.map((m) => {
              const isSelected = selectedMinute === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.gridCell, isSelected && styles.gridCellActive]}
                  onPress={() => setSelectedMinute(m)}
                >
                  <Text style={[styles.gridCellText, isSelected && styles.gridCellTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color="white" />
              <Text style={styles.confirmBtnText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  displayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeDisplay: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  periodBtnTextActive: {
    color: theme.colors.primary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetScroll: {
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipActive: {
    backgroundColor: '#FFFBEB',
    borderColor: theme.colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  gridCell: {
    flexBasis: '15%',
    flexGrow: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  gridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
