import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingState, EmptyState } from '../../../../src/components/common/FeedbackStates';
import { usePromotions, PromotionEligibilityRule } from '../../../../src/hooks/usePromotions';
import { ArrowLeft, Plus, Sliders, CheckCircle2 } from 'lucide-react-native';

export default function PromotionRulesScreen() {
  const router = useRouter();
  const { rules, loading, saveRule } = usePromotions();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<PromotionEligibilityRule | null>(null);
  const [className, setClassName] = useState<string>('all');
  const [minAttendance, setMinAttendance] = useState('75');
  const [minMarks, setMinMarks] = useState('40');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setClassName('all');
    setMinAttendance('75');
    setMinMarks('40');
    setModalVisible(true);
  };

  const handleOpenEdit = (rule: PromotionEligibilityRule) => {
    setEditingRule(rule);
    setClassName(rule.class_name || 'all');
    setMinAttendance(String(rule.rule_config?.min_attendance_pct ?? 75));
    setMinMarks(String(rule.rule_config?.min_marks_pct ?? 40));
    setModalVisible(true);
  };

  const handleSave = async () => {
    const att = parseFloat(minAttendance);
    const marks = parseFloat(minMarks);

    if (isNaN(att) || att < 0 || att > 100) {
      Alert.alert('Validation Error', 'Please enter a valid attendance percentage between 0 and 100.');
      return;
    }

    try {
      setSubmitting(true);
      await saveRule({
        id: editingRule?.id,
        class_name: className === 'all' ? null : className,
        rule_type: 'academic_criteria',
        rule_config: {
          min_attendance_pct: att,
          min_marks_pct: isNaN(marks) ? 40 : marks,
          require_all_passed: true,
        },
      });

      Alert.alert('Saved', 'Eligibility rule successfully updated.');
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save eligibility rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const classOptions = [
    { label: 'All Classes (Institution Default)', value: 'all' },
    { label: 'Class 1', value: 'Class 1' },
    { label: 'Class 2', value: 'Class 2' },
    { label: 'Class 3', value: 'Class 3' },
    { label: 'Class 4', value: 'Class 4' },
    { label: 'Class 5', value: 'Class 5' },
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Eligibility Rules"
        subtitle="Define minimum attendance, marks threshold, and pass conditions for promotion"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Button
            title="Configure Rule"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={handleOpenAdd}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {loading && rules.length === 0 ? (
          <LoadingState message="Loading rules..." />
        ) : rules.length === 0 ? (
          <EmptyState
            title="No Custom Rules Defined"
            description="The system uses default 75% attendance criteria. Click 'Configure Rule' to add standard-specific rules."
            actionTitle="Add Rule"
            onAction={handleOpenAdd}
          />
        ) : (
          <View style={styles.rulesList}>
            {rules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleCardHeader}>
                  <View style={styles.iconBox}>
                    <Sliders size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.ruleTitle}>
                      {rule.class_name ? `Class: ${rule.class_name}` : 'Institution-wide Default'}
                    </Text>
                    <Text style={styles.ruleType}>Rule Type: {rule.rule_type}</Text>
                  </View>
                  <Badge variant={rule.is_active ? 'success' : 'default'}>
                    {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </View>

                <View style={styles.criteriaBox}>
                  <View style={styles.criteriaItem}>
                    <Text style={styles.criteriaLabel}>Min Attendance:</Text>
                    <Text style={styles.criteriaVal}>
                      {rule.rule_config?.min_attendance_pct ?? 75}%
                    </Text>
                  </View>
                  <View style={styles.criteriaItem}>
                    <Text style={styles.criteriaLabel}>Min Marks:</Text>
                    <Text style={styles.criteriaVal}>
                      {rule.rule_config?.min_marks_pct ?? 40}%
                    </Text>
                  </View>
                  <View style={styles.criteriaItem}>
                    <Text style={styles.criteriaLabel}>Pass Status:</Text>
                    <Text style={styles.criteriaVal}>Required</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Button
                    title="Edit Rule"
                    size="sm"
                    variant="outline"
                    onPress={() => handleOpenEdit(rule)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Configure Rule Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingRule ? 'Edit Eligibility Rule' : 'New Eligibility Rule'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Candidates who fail to meet these thresholds will be flagged during screening
            </Text>

            <Select
              label="Standard / Class"
              options={classOptions}
              value={className}
              onSelect={(val) => setClassName(val as string)}
            />

            <FormField
              label="Minimum Required Attendance (%)"
              value={minAttendance}
              onChangeText={setMinAttendance}
              placeholder="75"
              keyboardType="numeric"
              required
            />

            <FormField
              label="Minimum Overall Marks (%)"
              value={minMarks}
              onChangeText={setMinMarks}
              placeholder="40"
              keyboardType="numeric"
              required
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              />
              <Button
                title="Save Rule"
                onPress={handleSave}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  rulesList: {
    gap: 12,
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ruleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  ruleType: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  criteriaBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    justifyContent: 'space-around',
  },
  criteriaItem: {
    alignItems: 'center',
  },
  criteriaLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  criteriaVal: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
});
