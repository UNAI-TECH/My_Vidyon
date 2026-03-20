import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
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
  Clock
} from 'lucide-react-native';

export default function LeaveManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  // Fetch pending leave requests where current faculty is the Class Teacher
  const { data: requests = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['pending-leaves', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, students:student_id(name, register_number)')
        .eq('assigned_class_teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leaves:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Real-time update handled by useERPRealtime global hook
  // (Redundant useEffect removed)


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
      
      Alert.alert('Success', `Leave request ${status} successfully`);
      refetch();
    } catch (error: any) {
      console.error('Error updating leave status:', error);
      Alert.alert('Error', error.message);
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
        <PageHeader title="Leave Management" subtitle="Review and approve student leaves" />

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
                  <View style={styles.studentInfo}>
                    <User size={16} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.studentName}>{req.students?.name}</Text>
                    <Text style={styles.regNo}>#{req.students?.register_number}</Text>
                  </View>
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
        </View>

        {historyRequests.length > 0 && (
          <View style={styles.section}>
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
                <Text style={styles.dateText}>
                  {format(new Date(req.from_date), 'MMM d')} - {format(new Date(req.to_date), 'MMM d')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  leaveCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  regNo: { fontSize: 11, color: theme.colors.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFBEB' },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  reasonContainer: { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 20 },
  reasonText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 },
  rejectBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  approveBtn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'white', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
});
