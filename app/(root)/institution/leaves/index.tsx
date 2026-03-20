import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
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

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // Fetch ALL leave requests for this institution from DB
  const { data: requests = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['institution-leaves', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, students:student_id(name, register_number, class_name, section)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Real-time update handled by useERPRealtime global hook
  // (Redundant useEffect removed)

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

      showAlert('Success', `Leave request ${status} successfully`, 'success');
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
    const studentName = item.students?.name || 'Unknown';
    const studentClass = item.students?.class_name 
      ? `${item.students.class_name}${item.students.section ? `-${item.students.section}` : ''}`
      : '';
    const regNo = item.students?.register_number || '';

    return (
      <View style={[styles.card, !isPending && { opacity: 0.75 }]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <User size={20} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View>
              <Text style={styles.name}>{studentName}</Text>
              <Text style={styles.role}>
                {studentClass ? `Student (${studentClass})` : `#${regNo}`}
              </Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: getStatusBg(item.status) }]}>
            <Text style={[styles.typeText, { color: getStatusColor(item.status) }]}>
              {isPending ? (item.leave_type || 'Leave') : item.status}
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
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
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
