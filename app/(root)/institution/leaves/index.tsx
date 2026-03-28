import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Calendar,
  MessageSquare,
  AlertCircle
} from 'lucide-react-native';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { LeaveHistoryModal } from '../../../../src/components/leave/LeaveHistoryModal';

export default function InstitutionLeaves() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = React.useState<string | null>(null);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
  }>({ visible: false, title: '', message: '' });

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

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // Fetch ALL leave requests for this institution from DB
  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ['institution-leaves', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *, 
          students:student_id(name, register_number, class_name, section, image_url), 
          staff:staff_id(full_name, role, image_url, profile_image_url)
        `)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Approve or reject a leave request
  const handleAction = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(requestId);
    try {
      const { error } = await (supabase
        .from('leave_requests') as any)
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['institution-leaves', institutionId] });
      showAlert('Success', `Request ${status} successfully`, 'success');
    } catch (error: any) {
      console.error('Error updating leave:', error);
      showAlert('Error', error.message || 'Failed to update leave request', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'recommended': return '#3B82F6';
      default: return '#F59E0B';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'approved': return '#F0FDF4';
      case 'rejected': return '#FEF2F2';
      case 'recommended': return '#EFF6FF';
      default: return '#FFFBEB';
    }
  };

  const getDuration = (from: string, to: string) => {
    const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} Day${diff > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderLeaveCard = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const isStaff = !!item.staff_id;
    
    const displayName = isStaff ? item.staff?.full_name : (item.students?.name || 'Unknown');
    const displayRole = isStaff 
      ? (item.staff?.role ? item.staff.role.charAt(0).toUpperCase() + item.staff.role.slice(1) : 'Staff')
      : (item.students?.class_name 
          ? `Student (${item.students.class_name}${item.students.section ? `-${item.students.section}` : ''})`
          : 'Student');
    const displayId = isStaff ? '' : (item.students?.register_number ? `#${item.students.register_number}` : '');
    
    const userImageUrl = isStaff 
      ? (item.staff?.profile_image_url || item.staff?.image_url)
      : item.students?.image_url;

    return (
      <View style={[styles.card, !isPending && { opacity: 0.75 }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => setHistoryModal({
              visible: true,
              userId: isStaff ? item.staff_id : item.student_id,
              userName: displayName,
              userImage: userImageUrl,
              userType: isStaff ? 'staff' : 'student'
            })}
          >
            <View style={[styles.avatar, isStaff && { backgroundColor: '#EEF2FF' }]}>
              {userImageUrl ? (
                <Image source={{ uri: userImageUrl }} style={styles.avatarImage} />
              ) : (
                <User size={20} color={theme.colors.primary} {...({} as any)} />
              )}
            </View>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.role}>
                {displayRole} {displayId}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.typeBadge, { backgroundColor: getStatusBg(item.status) }]}>
            <Text style={[styles.typeText, { color: getStatusColor(item.status) }]}>
              {isPending ? (item.leave_type || (isStaff ? 'Staff Leave' : 'Leave')) : item.status}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaInfo}>
            <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.metaText}>
              {format(new Date(item.from_date), 'MMM d')} - {format(new Date(item.to_date), 'MMM d')}
            </Text>
          </View>
          <View style={styles.metaInfo}>
            <Clock size={14} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.metaText}>{getDuration(item.from_date, item.to_date)}</Text>
          </View>
        </View>

        {item.reason ? (
          <View style={styles.reasonBox}>
            <MessageSquare size={14} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
          </View>
        ) : null}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleAction(item.id, 'rejected')}
              disabled={!!processing}
            >
              <XCircle size={18} color="#EF4444" {...({} as any)} />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleAction(item.id, 'approved')}
              disabled={!!processing}
            >
              {processing === item.id ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <CheckCircle size={18} color="white" {...({} as any)} />
              )}
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Leave Approvals" subtitle="Centralized request management for staff & students" />
      
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color="#E2E8F0" {...({} as any)} />
          <Text style={styles.emptyTitle}>No leave requests</Text>
          <Text style={styles.emptySubtitle}>Leave requests will appear here in real-time</Text>
        </View>
      ) : (
        <FlatList
          data={[...pendingRequests, ...historyRequests]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderLeaveCard}
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <Text style={styles.sectionLabel}>Pending ({pendingRequests.length})</Text>
            ) : null
          }
        />
      )}

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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  list: { paddingBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  role: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  typeBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  typeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },
  body: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: theme.colors.textMuted },
  reasonBox: { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16 },
  reasonText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  rejectText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  approveBtn: { backgroundColor: '#10B981' },
  approveText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptySubtitle: { fontSize: 13, color: theme.colors.textMuted },
});
