import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { FormField } from '../../../../src/components/common/FormField';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { LoadingState } from '../../../../src/components/common/FeedbackStates';
import { usePromotions, PromotionItem } from '../../../../src/hooks/usePromotions';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react-native';

export default function ReviewPromotionBatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getRequestDetails,
    updateItemStatus,
    bulkUpdateItems,
    applyPromotions,
  } = usePromotions();

  const [request, setRequest] = useState<any>(null);
  const [items, setItems] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getRequestDetails(id);
      setRequest(res.request);
      setItems(res.items);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load promotion batch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleApproveItem = async (item: PromotionItem) => {
    try {
      await updateItemStatus(item.id, 'approved');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve item.');
    }
  };

  const handleOpenRejectModal = (item: PromotionItem) => {
    setRejectingItemId(item.id);
    setRejectionReason(item.eligibility_reason || 'Academic criteria not fulfilled');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItemId) return;
    try {
      await updateItemStatus(rejectingItemId, 'rejected', rejectionReason.trim());
      setRejectModalVisible(false);
      setRejectingItemId(null);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reject item.');
    }
  };

  const handleBulkApproveEligible = async () => {
    if (!id) return;
    try {
      await bulkUpdateItems(id, 'approved', true);
      await loadData();
      Alert.alert('Approved', 'All eligible candidates approved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve eligible candidates.');
    }
  };

  const handleBulkRejectIneligible = async () => {
    if (!id) return;
    try {
      await bulkUpdateItems(id, 'rejected', false);
      await loadData();
      Alert.alert('Rejected', 'Ineligible candidates rejected.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to bulk reject candidates.');
    }
  };

  const handleExecutePromotion = async () => {
    if (!id) return;
    const approvedCount = items.filter((i) => i.status === 'approved' && !i.applied_at).length;
    if (approvedCount === 0) {
      Alert.alert('No Approved Candidates', 'There are no approved candidates ready to be promoted.');
      return;
    }

    Alert.alert(
      'Execute Promotions',
      `This will officially update ${approvedCount} students to their next standard in the system. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute Now',
          onPress: async () => {
            try {
              setApplying(true);
              const result = await applyPromotions(id);
              Alert.alert(
                'Promotion Applied',
                `Successfully promoted ${result.appliedCount} of ${result.total} students.`
              );
              await loadData();
            } catch (err: any) {
              Alert.alert('Execution Error', err?.message || 'Failed to apply promotions.');
            } finally {
              setApplying(false);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const approvedPendingApply = items.filter((i) => i.status === 'approved' && !i.applied_at).length;

  const columns: ColumnDef<PromotionItem>[] = [
    {
      key: 'student',
      title: 'Student',
      sortable: true,
      render: (item) => (
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.studentSub}>Roll #{item.student?.roll_number || 'N/A'}</Text>
        </View>
      ),
    },
    {
      key: 'progression',
      title: 'Progression Pathway',
      render: (item) => (
        <View>
          <Text style={styles.pathwayText}>
            {item.from_class} {item.from_section ? `(${item.from_section})` : ''} ➔{' '}
            <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
              {item.to_class} {item.to_section ? `(${item.to_section})` : ''}
            </Text>
          </Text>
        </View>
      ),
    },
    {
      key: 'eligibility',
      title: 'Auto-Screening',
      render: (item) => (
        <View>
          <Badge variant={item.is_eligible ? 'success' : 'destructive'}>
            {item.is_eligible ? 'ELIGIBLE' : 'FLAGGED'}
          </Badge>
          {item.eligibility_reason && (
            <Text style={styles.eligibilityNote} numberOfLines={2}>
              {item.eligibility_reason}
            </Text>
          )}
        </View>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => {
        if (item.applied_at) {
          return <Badge variant="success">PROMOTED</Badge>;
        }
        let variant: 'warning' | 'info' | 'destructive' | 'default' = 'default';
        if (item.status === 'approved') variant = 'info';
        else if (item.status === 'pending') variant = 'warning';
        else if (item.status === 'rejected') variant = 'destructive';
        return <Badge variant={variant}>{item.status.toUpperCase()}</Badge>;
      },
    },
    {
      key: 'actions',
      title: 'Decide',
      align: 'center',
      render: (item) => {
        if (item.applied_at) {
          return <Text style={styles.doneText}>Completed</Text>;
        }
        return (
          <View style={styles.actionBtnsRow}>
            {item.status !== 'approved' && (
              <TouchableOpacity
                style={[styles.smallBtn, styles.approveBtn]}
                onPress={() => handleApproveItem(item)}
              >
                <CheckCircle size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {item.status !== 'rejected' && (
              <TouchableOpacity
                style={[styles.smallBtn, styles.rejectBtn]}
                onPress={() => handleOpenRejectModal(item)}
              >
                <XCircle size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        );
      },
    },
  ];

  if (loading && !request) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Review Promotion Batch"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <LoadingState message="Loading candidates..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={`Batch: ${request?.from_year} ➔ ${request?.to_year}`}
        subtitle={`Review student eligibility & approvals for ${request?.class_name || 'Institution-wide'}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          approvedPendingApply > 0 ? (
            <Button
              title={`Execute Promotions (${approvedPendingApply})`}
              size="sm"
              icon={<Play size={14} color="#FFFFFF" />}
              onPress={handleExecutePromotion}
              loading={applying}
            />
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Bulk Action Bar */}
        <View style={styles.bulkBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bulkTitle}>Bulk Actions</Text>
            <Text style={styles.bulkSub}>Fast-track candidates meeting all screening rules</Text>
          </View>
          <View style={styles.bulkButtons}>
            <Button
              title="Approve All Eligible"
              size="sm"
              variant="secondary"
              onPress={handleBulkApproveEligible}
            />
            <Button
              title="Reject Ineligible"
              size="sm"
              variant="outline"
              onPress={handleBulkRejectIneligible}
            />
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={filteredItems}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search candidates by name or roll..."
            searchKeys={['student.name', 'student.roll_number', 'from_class']}
            filters={[
              { id: 'all', label: 'All Candidates' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            emptyTitle="No Candidates Found"
            emptyDescription="There are no students listed in this promotion batch."
          />
        </View>
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Candidate Promotion</Text>
            <Text style={styles.modalSubtitle}>Provide justification for student retention / repeating</Text>

            <FormField
              label="Rejection Reason"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Failed annual exams / low attendance"
              required
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRejectModalVisible(false)}
              />
              <Button
                title="Confirm Rejection"
                variant="destructive"
                onPress={handleConfirmReject}
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  bulkBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bulkTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  bulkSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  studentSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pathwayText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  eligibilityNote: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  doneText: {
    color: theme.colors.accent || '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: theme.colors.accent || '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
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
