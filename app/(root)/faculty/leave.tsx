import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { useAuth } from '../../../src/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Calendar,
  MessageSquare,
  User,
  Clock,
  Plus,
  History,
  Info
} from 'lucide-react-native';
import { CalendarModal } from '../../../src/components/common/CalendarPicker';
import { LeaveHistoryModal } from '../../../src/components/leave/LeaveHistoryModal';

export default function LeaveManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'review' | 'my-leaves'>('review');

  // History Modal State
  const [historyModal, setHistoryModal] = React.useState<{
    visible: boolean;
    userId: string | null;
    userName: string;
    userImage?: string | null;
    userType: 'student' | 'staff';
  }>({
    visible: false,
    userId: null,
    userName: '',
    userImage: null,
    userType: 'student',
  });

  // Form State
  const [fromDate, setFromDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = React.useState('');
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch pending leave requests where current faculty is the Class Teacher
  const { data: requests = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['pending-leaves', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, students:student_id(name, register_number, image_url)')
        .eq('assigned_class_teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leaves:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && activeTab === 'review',
  });

  // Fetch faculty's own leave requests
  const { data: myRequests = [], isLoading: isLoadingMyLeaves, refetch: refetchMyLeaves } = useQuery<any[]>({
    queryKey: ['my-leaves', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my leaves:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id && activeTab === 'my-leaves',
  });

  const handleApplyLeave = async () => {
    if (!reason.trim()) {
      setAlertConfig({ visible: true, title: 'Error', message: 'Please provide a reason for leave', type: 'error' });
      return;
    }
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user?.id).maybeSingle() as any;

      const { error } = await (supabase.from('leave_requests') as any).insert({
        staff_id: user?.id,
        requester_role: 'faculty',
        institution_id: profile?.institution_id,
        from_date: fromDate,
        to_date: toDate,
        reason: reason,
        status: 'pending'
      });

      if (error) throw error;

      setAlertConfig({ visible: true, title: 'Success', message: 'Leave request submitted successfully', type: 'success' });
      setReason('');
      refetchMyLeaves();
    } catch (error: any) {
      console.error('Error applying for leave:', error);
      setAlertConfig({ visible: true, title: 'Error', message: error.message || 'Failed to submit leave request', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };


    const [alertConfig, setAlertConfig] = React.useState<{visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning'}>({
    visible: false, title: '', message: '', type: 'info'
  });

  const handleAction = async (requestId: string, status: 'approved' | 'rejected') => {
    setIsProcessing(requestId);
    try {
      const { error } = await (supabase
        .from('leave_requests') as any)
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: `Leave request ${status} successfully`,
        type: 'success'
      });
      refetch();
    } catch (error: any) {
      console.error('Error updating leave status:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to update leave request',
        type: 'error'
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Leave Management" subtitle={activeTab === 'review' ? "Review and approve student leaves" : "Apply for and track your own leaves"} />

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'review' && styles.activeTab]} 
            onPress={() => setActiveTab('review')}
          >
            <User size={18} color={activeTab === 'review' ? 'black' : theme.colors.textMuted} {...({} as any)} />
            <Text style={[styles.tabText, activeTab === 'review' && styles.activeTabText]}>Student Review</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'my-leaves' && styles.activeTab]} 
            onPress={() => setActiveTab('my-leaves')}
          >
            <History size={18} color={activeTab === 'my-leaves' ? 'black' : theme.colors.textMuted} {...({} as any)} />
            <Text style={[styles.tabText, activeTab === 'my-leaves' && styles.activeTabText]}>My Leaves</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'review' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle size={32} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.emptyText}>No pending leave requests</Text>
              </View>
            ) : (
              pendingRequests.map((req) => (
                <View key={req.id} style={styles.leaveCard}>
                  <View style={styles.cardHeader}>
                    <TouchableOpacity 
                      style={styles.studentInfo}
                      onPress={() => setHistoryModal({
                        visible: true,
                        userId: req.student_id,
                        userName: req.students?.name || 'Student',
                        userImage: req.students?.image_url,
                        userType: 'student'
                      })}
                    >
                      <View style={styles.avatarContainer}>
                        {req.students?.image_url ? (
                          <Image source={{ uri: req.students.image_url }} style={styles.avatarImage} />
                        ) : (
                          <User size={16} color={theme.colors.primary} {...({} as any)} />
                        )}
                      </View>
                      <View>
                        <Text style={styles.studentName}>{req.students?.name}</Text>
                        <Text style={styles.regNo}>#{req.students?.register_number}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                      <Clock size={12} color="#F59E0B" {...({} as any)} />
                      <Text style={[styles.statusText, { color: '#F59E0B' }]}>Pending</Text>
                    </View>
                  </View>

                  <View style={styles.dateRow}>
                    <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.dateText}>
                      {format(new Date(req.from_date), 'MMM d, yyyy')} - {format(new Date(req.to_date), 'MMM d, yyyy')}
                    </Text>
                  </View>

                  <View style={styles.reasonContainer}>
                    <MessageSquare size={14} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.reasonText}>{req.reason}</Text>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleAction(req.id, 'rejected')}
                      disabled={!!isProcessing}
                    >
                      <XCircle size={18} color="#EF4444" {...({} as any)} />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleAction(req.id, 'approved')}
                      disabled={!!isProcessing}
                    >
                      <CheckCircle size={18} color="white" {...({} as any)} />
                      <Text style={[styles.actionBtnText, { color: 'white' }]}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            
            {historyRequests.length > 0 && (
              <View style={[styles.section, { marginTop: 32 }]}>
                <Text style={styles.sectionTitle}>Recent History</Text>
                {historyRequests.slice(0, 5).map((req) => (
                  <View key={req.id} style={[styles.leaveCard, { opacity: 0.7 }]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.studentName}>{req.students?.name}</Text>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: req.status === 'approved' ? '#F0FDF4' : '#FEF2F2' }
                      ]}>
                        <Text style={[
                          styles.statusText, 
                          { color: req.status === 'approved' ? '#166534' : '#991B1B' }
                        ]}>
                          {req.status === 'approved' ? 'Approved' : 'Rejected'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dateRow}>
                      <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.dateText}>
                        {format(new Date(req.from_date), 'MMM d')} - {format(new Date(req.to_date), 'MMM d')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.applyCard}>
              <Text style={styles.sectionTitle}>Apply for Leave</Text>
              
              <View style={styles.formRow}>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowFromPicker(true)}>
                  <Text style={styles.inputLabel}>From Date</Text>
                  <View style={styles.dateValueBox}>
                    <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.dateValueText}>{format(new Date(fromDate), 'MMM d, yyyy')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateInput} onPress={() => setShowToPicker(true)}>
                  <Text style={styles.inputLabel}>To Date</Text>
                  <View style={styles.dateValueBox}>
                    <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.dateValueText}>{format(new Date(toDate), 'MMM d, yyyy')}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason for Leave</Text>
                <View style={styles.textAreaContainer}>
                  <MessageSquare size={16} color={theme.colors.textMuted} style={styles.textareaIcon} {...({} as any)} />
                  <TextInput
                    style={styles.textArea}
                    placeholder="Describe your reason..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={4}
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.loginBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleApplyLeave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <>
                    <Plus size={20} color="black" {...({} as any)} />
                    <Text style={styles.loginBtnText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 32 }}>
              <Text style={styles.sectionTitle}>My Leave History</Text>
              {isLoadingMyLeaves ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : myRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Info size={32} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.emptyText}>No leave history found</Text>
                </View>
              ) : (
                myRequests.map((req) => (
                  <View key={req.id} style={styles.leaveCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBg(req.status) }]}>
                        <Clock size={12} color={getStatusColor(req.status)} {...({} as any)} />
                        <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>{req.status}</Text>
                      </View>
                      <Text style={styles.regNo}>{format(new Date(req.created_at), 'MMM d, h:mm a')}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.dateText}>
                        {format(new Date(req.from_date), 'MMM d')} - {format(new Date(req.to_date), 'MMM d')}
                      </Text>
                    </View>
                    <Text style={styles.historyReason} numberOfLines={1}>{req.reason}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <CalendarModal 
        visible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        onSelect={(date) => setFromDate(date)}
        initialDate={fromDate}
        title="Select From Date"
      />

      <CalendarModal 
        visible={showToPicker}
        onClose={() => setShowToPicker(false)}
        onSelect={(date) => setToDate(date)}
        initialDate={toDate}
        title="Select To Date"
      />
      
      <AlertModal 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      <LeaveHistoryModal
        visible={historyModal.visible}
        onClose={() => setHistoryModal(prev => ({ ...prev, visible: false }))}
        userId={historyModal.userId}
        userName={historyModal.userName}
        userImage={historyModal.userImage}
        userType={historyModal.userType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: 'black' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  applyCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dateInput: { flex: 1 },
  dateValueBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  dateValueText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginLeft: 4 },
  textAreaContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, marginTop: 8, paddingHorizontal: 12, paddingTop: 12, minHeight: 120, borderWidth: 1, borderColor: '#E2E8F0' },
  textareaIcon: { marginTop: 2 },
  textArea: { flex: 1, fontSize: 14, color: theme.colors.text, textAlignVertical: 'top', marginLeft: 8 },
  loginBtn: { width: '100%', height: 52, backgroundColor: theme.colors.primary, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  loginBtnText: { color: 'black', fontSize: 16, fontWeight: 'bold' },
  leaveCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  regNo: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  reasonContainer: { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 20 },
  reasonText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  historyReason: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 },
  rejectBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  approveBtn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'white', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
});

// Helper functions for status colors
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved': return '#10B981';
    case 'rejected': return '#EF4444';
    default: return '#F59E0B';
  }
};

const getStatusBg = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved': return '#F0FDF4';
    case 'rejected': return '#FEF2F2';
    default: return '#FFFBEB';
  }
};
