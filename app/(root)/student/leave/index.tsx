import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useLeaveWorkflow } from '../../../../src/hooks/useLeaveWorkflow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { format, differenceInDays } from 'date-fns';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:     { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending' },
  recommended: { color: '#3B82F6', bg: '#EFF6FF', label: 'Recommended' },
  approved:    { color: '#10B981', bg: '#F0FDF4', label: 'Approved' },
  rejected:    { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected' },
};

export default function StudentLeaveScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fetchStudentLeaves } = useLeaveWorkflow();

  // Fetch student's own leave history (read-only)
  const { data: leaves = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['student-leaves', user?.id],
    queryFn: () => fetchStudentLeaves(user?.id || ''),
    enabled: !!user?.id,
  });

  // Real-time update handled by useERPRealtime global hook
  // (Redundant useEffect removed)


  const getDays = (from: string, to: string) =>
    differenceInDays(new Date(to), new Date(from)) + 1;

  const pending  = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

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
        <PageHeader
          title="My Leaves"
          subtitle="Your leave request history"
        />

        {/* Info notice — leave must be applied by parent */}
        <View style={styles.notice}>
          <AlertCircle size={16} color="#3B82F6" {...({} as any)} />
          <Text style={styles.noticeText}>
            Leave requests are submitted by your parent/guardian. You will be notified when your status changes.
          </Text>
        </View>

        {/* Summary Chips */}
        <View style={styles.summary}>
          <View style={[styles.chip, { backgroundColor: '#FFFBEB' }]}>
            <AlertCircle size={14} color="#F59E0B" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#F59E0B' }]}>{pending} Pending</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={14} color="#10B981" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#10B981' }]}>{approved} Approved</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: '#FEF2F2' }]}>
            <XCircle size={14} color="#EF4444" {...({} as any)} />
            <Text style={[styles.chipText, { color: '#EF4444' }]}>{rejected} Rejected</Text>
          </View>
        </View>

        {leaves.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#E2E8F0" {...({} as any)} />
            <Text style={styles.emptyTitle}>No leave requests yet</Text>
            <Text style={styles.emptySubtitle}>Your parent can submit leave requests on your behalf</Text>
          </View>
        ) : (
          leaves.map(leave => {
            const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
            return (
              <View key={leave.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.leaveType}>{leave.leave_type || 'General'}</Text>
                    <Text style={styles.dateRange}>
                      {format(new Date(leave.from_date), 'MMM d')} – {format(new Date(leave.to_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Clock size={13} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{getDays(leave.from_date, leave.to_date)} day(s)</Text>
                  <Calendar size={13} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{format(new Date(leave.created_at), 'MMM d, yyyy')}</Text>
                </View>
                {leave.reason ? (
                  <View style={styles.reasonBox}>
                    <FileText size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.reasonText} numberOfLines={2}>{leave.reason}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 48 },
  center: { justifyContent: 'center', alignItems: 'center' },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 13, color: '#3B82F6', lineHeight: 18 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, flex: 1, justifyContent: 'center' },
  chipText: { fontSize: 11, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1 },
  leaveType: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  dateRange: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 12, color: theme.colors.textMuted, marginRight: 4 },
  reasonBox: { flexDirection: 'row', gap: 8, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 },
  reasonText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptySubtitle: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
});
