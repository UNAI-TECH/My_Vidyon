import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { FormField } from '../../../../src/components/common/FormField';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingState, EmptyState } from '../../../../src/components/common/FeedbackStates';
import { useFacultyLeaveBalance, LeaveType } from '../../../../src/hooks/useFacultyLeaveBalance';
import { useRBAC } from '../../../../src/hooks/useRBAC';
import { Plus, Edit2, Trash2, CalendarCheck, ArrowLeft } from 'lucide-react-native';

export default function LeaveConfigScreen() {
  const router = useRouter();
  const { can } = useRBAC();
  const { leaveTypes, loading, saveLeaveType, deleteLeaveType } = useFacultyLeaveBalance();

  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingType, setEditingType] = useState<Partial<LeaveType>>({
    name: '',
    code: '',
    annual_quota: 12,
    carry_forward: false,
    max_carry_forward: 0,
    is_active: true,
  });

  const canManage = can('faculty', 'manage') || can('faculty', 'edit');

  const handleOpenAdd = () => {
    setEditingType({
      name: '',
      code: '',
      annual_quota: 12,
      carry_forward: false,
      max_carry_forward: 0,
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleOpenEdit = (type: LeaveType) => {
    setEditingType(type);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editingType.name?.trim()) {
      Alert.alert('Required Field', 'Please enter leave type name (e.g. Casual Leave)');
      return;
    }

    try {
      setSubmitting(true);
      await saveLeaveType(editingType);
      setModalVisible(false);
      Alert.alert('Saved', 'Leave policy saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save leave type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Leave Type',
      `Are you sure you want to delete "${name}"? Existing balances may be impacted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLeaveType(id);
            } catch (err: any) {
              Alert.alert('Cannot Delete', err.message || 'Failed to delete leave type.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Leave Types Configuration"
        subtitle="Manage faculty leave categories and annual quotas"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          canManage ? (
            <Button
              title="Add Leave Type"
              icon={<Plus size={16} color="#FFFFFF" />}
              onPress={handleOpenAdd}
              size="md"
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {loading && leaveTypes.length === 0 ? (
          <LoadingState message="Loading leave policies..." />
        ) : leaveTypes.length === 0 ? (
          <EmptyState
            title="No Leave Policies Configured"
            description="Configure leave categories (e.g., Casual Leave, Sick Leave) to track faculty balances."
            actionTitle={canManage ? 'Add First Leave Type' : undefined}
            onAction={canManage ? handleOpenAdd : undefined}
          />
        ) : (
          <View style={styles.grid}>
            {leaveTypes.map((type) => (
              <View key={type.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <CalendarCheck size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.cardTitle}>{type.name}</Text>
                  </View>
                  <Badge variant={type.is_active ? 'success' : 'default'}>
                    {type.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Code:</Text>
                    <Text style={styles.detailValue}>{type.code || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Annual Quota:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.primary, fontWeight: '700' }]}>
                      {type.annual_quota} days / year
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Carry Forward:</Text>
                    <Text style={styles.detailValue}>
                      {type.carry_forward ? `Yes (Max ${type.max_carry_forward} days)` : 'No'}
                    </Text>
                  </View>
                </View>

                {canManage && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEdit(type)}
                    >
                      <Edit2 size={15} color={theme.colors.textMuted} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { marginLeft: 12 }]}
                      onPress={() => handleDelete(type.id, type.name)}
                    >
                      <Trash2 size={15} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingType.id ? 'Edit Leave Category' : 'New Leave Category'}
            </Text>

            <FormField
              label="Leave Type Name"
              required
              value={editingType.name || ''}
              onChangeText={(v) => setEditingType((prev) => ({ ...prev, name: v }))}
              placeholder="e.g. Casual Leave, Medical Leave"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Short Code"
                  value={editingType.code || ''}
                  onChangeText={(v) => setEditingType((prev) => ({ ...prev, code: v.toUpperCase() }))}
                  placeholder="CL, SL, ML"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Annual Quota (Days)"
                  required
                  value={String(editingType.annual_quota ?? 12)}
                  onChangeText={(v) =>
                    setEditingType((prev) => ({ ...prev, annual_quota: parseInt(v) || 0 }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow Carry Forward</Text>
              <Switch
                value={editingType.carry_forward || false}
                onValueChange={(v) => setEditingType((prev) => ({ ...prev, carry_forward: v }))}
                trackColor={{ false: '#3E3E50', true: theme.colors.primary }}
              />
            </View>

            {editingType.carry_forward && (
              <FormField
                label="Max Carry Forward Days"
                value={String(editingType.max_carry_forward ?? 0)}
                onChangeText={(v) =>
                  setEditingType((prev) => ({ ...prev, max_carry_forward: parseInt(v) || 0 }))
                }
                keyboardType="numeric"
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active Policy</Text>
              <Switch
                value={editingType.is_active !== false}
                onValueChange={(v) => setEditingType((prev) => ({ ...prev, is_active: v }))}
                trackColor={{ false: '#3E3E50', true: theme.colors.primary }}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
              />
              <Button
                title="Save Category"
                loading={submitting}
                onPress={handleSave}
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
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    paddingBottom: 8,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    marginBottom: 12,
  },
  switchLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
});
