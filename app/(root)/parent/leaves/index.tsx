import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useLeaveWorkflow } from '../../../../src/hooks/useLeaveWorkflow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { format, differenceInDays } from 'date-fns';
import {
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  ChevronDown,
  Info,
} from 'lucide-react-native';
import { AlertModal } from '../../../../src/components/common/AlertModal';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:     { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending' },
  recommended: { color: '#3B82F6', bg: '#EFF6FF', label: 'Recommended' },
  approved:    { color: '#10B981', bg: '#F0FDF4', label: 'Approved' },
  rejected:    { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected' },
};

export default function ParentLeaves() {
  const { user, institutionUuid } = useAuth();
  const queryClient = useQueryClient();
  const { createLeave } = useLeaveWorkflow();

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const params = useLocalSearchParams();
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [leaveType, setLeaveType] = useState('General');
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [classTeacher, setClassTeacher] = useState<string | null>(null);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // Fetch children linked to this parent
  const { data: children = [] } = useQuery<any[]>({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Try parent_student_links table, then fall back to students.parent_id
      const { data, error } = await supabase
        .from('students')
        .select('id, name, register_number, class_name, section, institution_id')
        .eq('parent_id', user.id);
      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const [selectedHistoryChildId, setSelectedHistoryChildId] = useState<string | null>(null);

  // Fetch all leave requests for visible children
  const { data: leaves = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['parent-leaves', user?.id, selectedHistoryChildId],
    queryFn: async () => {
      const childIds = selectedHistoryChildId 
        ? [selectedHistoryChildId] 
        : children.map(c => c.id);
      
      if (childIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          students (name, class_name, section)
        `)
        .in('student_id', childIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching parent leaves:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && children.length > 0,
  });

  // Pre-select child from params or if only one exists
  useEffect(() => {
    const sId = params.studentId as string;
    if (sId && children.length > 0 && !selectedChild) {
      const child = children.find(c => (c as any).id === sId);
      if (child) {
          setSelectedChild(child);
          setModalVisible(true);
      }
    } else if (children.length === 1 && !selectedChild && !sId) {
      setSelectedChild(children[0]);
    }
  }, [params.studentId, children]);

  // Fetch class teacher when child is selected
  useEffect(() => {
    async function getTeacher() {
      if (!selectedChild) {
        setClassTeacher(null);
        return;
      }
      
      try {
        const { data: classesData } = await (supabase
          .from('classes' as any) as any)
          .select('id, name, class_teacher_id, sections')
          .eq('institution_id', selectedChild.institution_id)
          .eq('name', selectedChild.class_name);

        const classes = (classesData || []) as any[];

        if (classes.length > 0) {
          const matchedClass: any = classes.find((c: any) => 
            !selectedChild.section || (Array.isArray(c.sections) && c.sections.includes(selectedChild.section))
          ) || classes[0];

          const { data: assignment } = await (supabase
            .from('faculty_subjects' as any) as any)
            .select(`
              faculty_profile_id,
              profiles:faculty_profile_id (full_name)
            `)
            .eq('class_id', matchedClass.id)
            .eq('institution_id', selectedChild.institution_id)
            .eq('assignment_type', 'class_teacher')
            .eq('section', selectedChild.section || 'A')
            .maybeSingle();

          if ((assignment as any)?.profiles?.full_name) {
            setClassTeacher((assignment as any).profiles.full_name);
          } else if (matchedClass.class_teacher_id) {
            const { data: ctProf } = await (supabase
              .from('profiles' as any) as any)
              .select('full_name')
              .eq('id', matchedClass.class_teacher_id)
              .maybeSingle();
            setClassTeacher(ctProf?.full_name || 'Class Teacher');
          } else {
            setClassTeacher('Class Teacher');
          }
        } else {
          setClassTeacher('Class Teacher');
        }
      } catch (err) {
        console.error('Error lookup teacher:', err);
        setClassTeacher('Class Teacher');
      }
    }
    getTeacher();
  }, [selectedChild]);


  const resetForm = () => {
    setFromDate('');
    setToDate('');
    setReason('');
    setLeaveType('General');
    setSelectedChild(null);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const childId = selectedChild?.id || (children.length === 1 ? children[0].id : null);
    if (!childId) {
      showAlert('Select Child', 'Please select which child this request is for.', 'warning');
      return;
    }
    if (!fromDate || !toDate || !reason.trim()) {
      showAlert('Incomplete', 'Please fill all fields.', 'warning');
      return;
    }
    if (fromDate > toDate) {
      showAlert('Invalid Dates', 'From date must be before To date.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await createLeave({
      studentId: childId,
      parentId: user.id,
      fromDate,
      toDate,
      reason: reason.trim(),
      leaveType,
    });
    setIsSubmitting(false);

    if (result?.error) {
      showAlert('Error', (result.error as any).message || 'Failed to submit leave request.', 'error');
      return;
    }

    showAlert('Submitted!', 'Leave request has been sent to the class teacher for review.', 'success');
    setModalVisible(false);
    resetForm();
    refetch();
  };

  const getDays = (from: string, to: string) =>
    differenceInDays(new Date(to), new Date(from)) + 1;

  // ── Leave card ─────────────────────────────────────────────
  const LeaveCard = ({ leave }: { leave: any }) => {
    const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
    const student = leave.students;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={styles.childRow}>
              <User size={14} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.childName}>
                {student?.name || 'Child'}{student?.class_name ? ` (${student.class_name}${student?.section ? `-${student.section}` : ''})` : ''}
              </Text>
            </View>
            <Text style={styles.leaveType}>{leave.leave_type || 'General'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Calendar size={13} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.metaText}>
            {format(new Date(leave.from_date), 'MMM d')} – {format(new Date(leave.to_date), 'MMM d, yyyy')}
          </Text>
          <Clock size={13} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.metaText}>{getDays(leave.from_date, leave.to_date)} day(s)</Text>
        </View>
        {leave.reason ? (
          <View style={styles.reasonBox}>
            <FileText size={12} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.reasonText} numberOfLines={2}>{leave.reason}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const pending = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Leave Application"
          subtitle="Manage school absence requests for your child"
          actions={
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <PlusCircle size={18} color="white" {...({} as any)} />
              <Text style={styles.addBtnText}>New Request</Text>
            </TouchableOpacity>
          }
        />

        {/* Child Selector */}
        {children.length > 1 && (
          <View style={styles.childSelector}>
            <Text style={styles.selectorLabel}>Filter History:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              <TouchableOpacity 
                onPress={() => setSelectedHistoryChildId(null)}
                style={[styles.childChip, selectedHistoryChildId === null && styles.childChipActive]}
              >
                <Text style={[styles.childChipText, selectedHistoryChildId === null && styles.childChipTextActive]}>All Children</Text>
              </TouchableOpacity>
              {children.map((c: any) => (
                <TouchableOpacity 
                  key={c.id} 
                  onPress={() => setSelectedHistoryChildId(c.id)}
                  style={[styles.childChip, selectedHistoryChildId === c.id && styles.childChipActive]}
                >
                  <Text style={[styles.childChipText, selectedHistoryChildId === c.id && styles.childChipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Summary chips */}
        <View style={styles.summary}>
          <View style={[styles.chip, { backgroundColor: '#FFFBEB' }]}>
            <AlertCircle size={15} color="#F59E0B" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#F59E0B' }]}>{pending} Pending</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={15} color="#10B981" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#10B981' }]}>{approved} Approved</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: '#FEF2F2' }]}>
            <XCircle size={15} color="#EF4444" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#EF4444' }]}>
              {leaves.filter(l => l.status === 'rejected').length} Rejected
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : leaves.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#E2E8F0" {...({} as any)} />
            <Text style={styles.emptyTitle}>No leave requests yet</Text>
            <Text style={styles.emptySubtitle}>Tap "New Request" to submit a leave for your child</Text>
          </View>
        ) : (
          leaves.map(l => <LeaveCard key={l.id} leave={l} />)
        )}
      </ScrollView>

      {/* ── Submit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <View style={modal.overlay}>
            <View style={modal.sheet}>
              <Text style={modal.title}>New Leave Request</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* Child Selection */}
                <View style={form.field}>
                  <Text style={form.label}>For Student</Text>
                  <View style={form.dropdownContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
                      {children.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={[form.dropdownItem, selectedChild?.id === c.id && form.dropdownItemActive]}
                          onPress={() => setSelectedChild(c)}
                        >
                          <Text style={[form.dropdownText, selectedChild?.id === c.id && form.dropdownTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={form.dropdownIcon}>
                      <ChevronDown size={16} color={theme.colors.textMuted} {...({} as any)} />
                    </View>
                  </View>
                </View>

                {/* Target Recipient Display */}
                {selectedChild && (
                  <View style={styles.teacherBadge}>
                    <User size={14} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.teacherText}>
                      Request will be sent to: <Text style={{ fontWeight: 'bold' }}>{classTeacher || 'Loading...'}</Text>
                    </Text>
                  </View>
                )}

                {/* Leave Type */}
                <View style={form.field}>
                  <Text style={form.label}>Leave Type</Text>
                  <View style={form.typeRow}>
                    {['General', 'Sick', 'Emergency', 'Personal'].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[form.typeChip, leaveType === t && form.typeChipActive]}
                        onPress={() => setLeaveType(t)}
                      >
                        <Text style={[form.typeChipText, leaveType === t && form.typeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={form.field}>
                  <Text style={form.label}>From Date (YYYY-MM-DD)</Text>
                  <TouchableOpacity
                    style={[form.input, { justifyContent: 'center' }]}
                    onPress={() => setShowFromPicker(true)}
                  >
                    <Text style={{ color: fromDate ? theme.colors.text : '#94A3B8' }}>
                      {fromDate || 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={form.field}>
                  <Text style={form.label}>To Date (YYYY-MM-DD)</Text>
                  <TouchableOpacity
                    style={[form.input, { justifyContent: 'center' }]}
                    onPress={() => setShowToPicker(true)}
                  >
                    <Text style={{ color: toDate ? theme.colors.text : '#94A3B8' }}>
                      {toDate || 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={form.field}>
                  <Text style={form.label}>Reason</Text>
                  <TextInput
                    style={[form.input, form.textarea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Briefly describe the reason..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                </View>

                <View style={modal.actions}>
                  <TouchableOpacity style={modal.cancelBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                    <Text style={modal.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={modal.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting
                      ? <ActivityIndicator color="white" />
                      : <Text style={modal.submitText}>Submit</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarModal
        visible={showFromPicker}
        title="Select From Date"
        initialDate={fromDate}
        onSelect={(date) => setFromDate(date)}
        onClose={() => setShowFromPicker(false)}
      />
      
      <CalendarModal
        visible={showToPicker}
        title="Select To Date"
        initialDate={toDate}
        onSelect={(date) => setToDate(date)}
        onClose={() => setShowToPicker(false)}
      />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 48 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, flex: 1, justifyContent: 'center' },
  chipText: { fontSize: 11, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1 },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  childName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  leaveType: { fontSize: 12, color: theme.colors.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 12, color: theme.colors.textMuted, marginRight: 8 },
  reasonBox: { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 },
  reasonText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  childSelector: { marginBottom: 20 },
  selectorLabel: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 10, fontWeight: '600' },
  selectorScroll: { flexDirection: 'row' },
  childChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  childChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  childChipText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  childChipTextActive: { color: 'white', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60, paddingBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptySubtitle: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  teacherBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary + '10', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  teacherText: { fontSize: 13, color: theme.colors.text },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelText: { fontWeight: 'bold', color: theme.colors.textMuted },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center' },
  submitText: { fontWeight: 'bold', color: 'white' },
});

const form = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.colors.text, borderWidth: 1, borderColor: '#E2E8F0' },
  textarea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  typeChipActive: { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
  typeChipText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' },
  typeChipTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  dropdownContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  dropdownItemActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dropdownText: { fontSize: 13, color: theme.colors.text },
  dropdownTextActive: { color: 'white', fontWeight: 'bold' },
  dropdownIcon: { paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', marginLeft: 4 },
});
