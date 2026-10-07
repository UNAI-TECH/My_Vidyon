import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingState, ErrorState } from '../../../../src/components/common/FeedbackStates';
import {
  useAdmissions,
  AdmissionRecord,
  AdmissionHistoryRecord,
} from '../../../../src/hooks/useAdmissions';
import { useRBAC } from '../../../../src/hooks/useRBAC';
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Users,
  FileText,
  ArrowLeft,
} from 'lucide-react-native';

export default function AdmissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { can } = useRBAC();
  const { getAdmissionById, updateAdmissionStatus, enrollAdmission } = useAdmissions();

  const [admission, setAdmission] = useState<AdmissionRecord | null>(null);
  const [history, setHistory] = useState<AdmissionHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Enrollment Modal State
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollDryRunData, setEnrollDryRunData] = useState<any>(null);

  const canEdit = can('admissions', 'edit') || can('admissions', 'manage');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getAdmissionById(id);
      setAdmission(res.admission);
      setHistory(res.history);
    } catch (err: any) {
      setError(err.message || 'Failed to load admission details');
    } finally {
      setLoading(false);
    }
  }, [id, getAdmissionById]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: string, notes?: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await updateAdmissionStatus(id, newStatus, notes);
      await loadData();
      Alert.alert('Status Updated', `Admission is now marked as ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = () => {
    handleStatusChange('under_review', 'Review initiated by institution staff');
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Admission',
      'Are you sure you want to approve this applicant? Once approved, the student can be enrolled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => handleStatusChange('approved', 'Application approved') },
      ]
    );
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for rejecting the application.');
      return;
    }
    setRejectModalVisible(false);
    await handleStatusChange('rejected', rejectionReason.trim());
    setRejectionReason('');
  };

  const handleOpenEnrollModal = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const preview = await enrollAdmission(id, true);
      setEnrollDryRunData(preview);
      setEnrollModalVisible(true);
    } catch (err: any) {
      Alert.alert('Preview Failed', err.message || 'Unable to preview enrollment changes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEnrollment = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await enrollAdmission(id, false);
      setEnrollModalVisible(false);
      await loadData();
      Alert.alert(
        'Student Enrolled!',
        'Student profile has been created and assigned to the selected class successfully.',
        [
          {
            text: 'View Students',
            onPress: () => router.push('/(root)/institution/students' as any),
          },
          { text: 'OK' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Enrollment Error', err.message || 'Failed to finalize enrollment');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'destructive' | 'default' => {
    switch (status) {
      case 'enrolled':
        return 'success';
      case 'approved':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Admission Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <LoadingState message="Loading application details..." />
      </View>
    );
  }

  if (error || !admission) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Admission Details"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          title="Could Not Load Admission"
          message={error || 'Record not found.'}
          onRetry={loadData}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={admission.student_name}
        subtitle={`App #${admission.admission_number || id?.substring(0, 8)} • Applied: ${new Date(
          admission.created_at
        ).toLocaleDateString()}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Badge variant={getStatusVariant(admission.status)}>
            {admission.status.replace('_', ' ').toUpperCase()}
          </Badge>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Action Header Banner if Actionable */}
        {canEdit && (
          <View style={styles.actionBanner}>
            <Text style={styles.actionBannerTitle}>Workflow Actions</Text>
            <View style={styles.actionBtnRow}>
              {admission.status === 'submitted' && (
                <Button
                  title="Mark Under Review"
                  icon={<Clock size={16} color="#FFFFFF" />}
                  loading={actionLoading}
                  onPress={handleStartReview}
                />
              )}

              {admission.status === 'under_review' && (
                <>
                  <Button
                    title="Approve"
                    variant="primary"
                    icon={<CheckCircle size={16} color="#FFFFFF" />}
                    loading={actionLoading}
                    onPress={handleApprove}
                  />
                  <Button
                    title="Reject"
                    variant="outline"
                    icon={<XCircle size={16} color="#EF4444" />}
                    onPress={() => setRejectModalVisible(true)}
                  />
                </>
              )}

              {admission.status === 'approved' && (
                <Button
                  title="Enroll Student"
                  icon={<UserCheck size={16} color="#FFFFFF" />}
                  loading={actionLoading}
                  onPress={handleOpenEnrollModal}
                />
              )}

              {admission.status === 'enrolled' && (
                <View style={styles.enrolledSuccessTag}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.enrolledSuccessText}>
                    Enrolled into student database {admission.enrolled_at ? `on ${new Date(admission.enrolled_at).toLocaleDateString()}` : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Section 1: Student Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <GraduationCap size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Student Profile</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{admission.student_name}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Applying For Class</Text>
              <Text style={styles.value}>
                {admission.applying_for_class || '—'}{' '}
                {admission.applying_for_section ? `(${admission.applying_for_section})` : ''}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>{admission.date_of_birth || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{admission.gender || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Blood Group</Text>
              <Text style={styles.value}>{admission.blood_group || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Aadhar Number</Text>
              <Text style={styles.value}>{admission.aadhar_number || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Nationality</Text>
              <Text style={styles.value}>{admission.nationality || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Mother Tongue</Text>
              <Text style={styles.value}>{admission.mother_tongue || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Contact Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Phone size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Contact & Residence</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{admission.phone || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{admission.email || '—'}</Text>
            </View>
            <View style={[styles.gridItem, { width: '100%' }]}>
              <Text style={styles.label}>Residential Address</Text>
              <Text style={styles.value}>
                {[
                  admission.address_line_1,
                  admission.address_line_2,
                  admission.city,
                  admission.state,
                  admission.pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Guardian Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Parent & Guardian Information</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Primary Guardian</Text>
              <Text style={styles.value}>
                {admission.guardian_name || '—'} ({admission.guardian_relation || 'Parent'})
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Guardian Phone</Text>
              <Text style={styles.value}>{admission.guardian_phone || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Guardian Email</Text>
              <Text style={styles.value}>{admission.guardian_email || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Occupation</Text>
              <Text style={styles.value}>{admission.guardian_occupation || '—'}</Text>
            </View>
            {admission.guardian2_name ? (
              <>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Secondary Guardian</Text>
                  <Text style={styles.value}>
                    {admission.guardian2_name} ({admission.guardian2_relation || 'Parent'})
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Secondary Phone</Text>
                  <Text style={styles.value}>{admission.guardian2_phone || '—'}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Section 4: Academic Background */}
        {(admission.previous_school_name || admission.previous_class) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FileText size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Previous Academic Background</Text>
            </View>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Previous School</Text>
                <Text style={styles.value}>{admission.previous_school_name || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Previous Board</Text>
                <Text style={styles.value}>{admission.previous_school_board || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Class Completed</Text>
                <Text style={styles.value}>{admission.previous_class || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Percentage Scored</Text>
                <Text style={styles.value}>
                  {admission.previous_percentage ? `${admission.previous_percentage}%` : '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section 5: Status Audit Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Application Audit Trail</Text>
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyTimelineText}>No previous status changes logged.</Text>
          ) : (
            <View style={styles.timeline}>
              {history.map((item, index) => (
                <View key={item.id} style={styles.timelineRow}>
                  <View style={styles.timelinePoint}>
                    <View style={styles.pointDot} />
                    {index < history.length - 1 && <View style={styles.pointLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineAction}>
                        {item.old_status
                          ? `${item.old_status.toUpperCase()} → ${item.new_status?.toUpperCase()}`
                          : item.action}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </View>
                    {item.notes && <Text style={styles.timelineNotes}>{item.notes}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* REJECTION REASON MODAL */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Application</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a clear reason for rejecting this admission application. This will be recorded in the audit history.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Incomplete documentation, age criteria not met..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRejectModalVisible(false)}
              />
              <Button
                title="Confirm Rejection"
                variant="primary"
                onPress={handleRejectSubmit}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ENROLLMENT CONFIRMATION / PREVIEW MODAL */}
      <Modal
        visible={enrollModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEnrollModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderIcon}>
              <UserCheck size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Confirm Student Enrollment</Text>
            <Text style={styles.modalSubtitle}>
              This will officially convert the applicant into a registered active student for the institution.
            </Text>

            {enrollDryRunData?.changes && (
              <View style={styles.previewBox}>
                <Text style={styles.previewBoxTitle}>Planned Actions:</Text>
                {enrollDryRunData.changes.map((ch: any, idx: number) => (
                  <View key={idx} style={styles.changeRow}>
                    <CheckCircle size={14} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.changeText}>
                      {ch.entity === 'student_profile'
                        ? `${ch.action === 'create' ? 'Create new' : 'Update existing'} student master record`
                        : ch.entity === 'class_section'
                        ? `Assign to Class: ${ch.class || ''} Section: ${ch.section || 'Default'}`
                        : ch.entity === 'parent_link'
                        ? `${ch.action === 'reuse_existing' ? 'Link existing' : 'Create new'} parent account (${ch.parent_name || ''})`
                        : JSON.stringify(ch)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEnrollModalVisible(false)}
              />
              <Button
                title="Proceed & Enroll"
                variant="primary"
                loading={actionLoading}
                onPress={handleConfirmEnrollment}
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
    paddingBottom: 60,
  },
  actionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 16,
  },
  actionBannerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  enrolledSuccessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrolledSuccessText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    paddingBottom: 10,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridItem: {
    width: '48%',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  timeline: {
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelinePoint: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  pointLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.glassBorder,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineAction: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  timelineDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  timelineNotes: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  emptyTimelineText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
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
  modalHeaderIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.m,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  previewBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  previewBoxTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  changeText: {
    color: theme.colors.text,
    fontSize: 12,
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
