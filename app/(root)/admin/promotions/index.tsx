import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarRange, Building2, ChevronRight, CheckCircle, XCircle } from 'lucide-react-native';
import { Badge } from '../../../../src/components/common/Badge';

export default function AdminPromotionsScreen() {
  const queryClient = useQueryClient();

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-promotion-requests'],
    queryFn: async () => {
      // We join with institutions to get the name
      const { data, error } = await supabase
        .from('promotion_requests')
        .select(`
          *,
          institutions (
            name,
            logo_url
          )
        `)
        .order('requested_at', { ascending: false });
        
      if (error && error.code !== 'PGRST116') throw error;
      return (data as any[]) || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      const { data, error } = await (supabase as any).rpc('promote_institution', {
        p_institution_id: request.institution_id,
        p_from_year: request.from_year,
        p_to_year: request.to_year,
        p_request_id: request.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotion-requests'] });
      showAlert('Success', `Promotion approved successfully. Promoted ${data.promoted_students} students to the next class and archived ${data.alumni_students} as alumni.`, 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to approve promotion.', 'error');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase
        .from('promotion_requests') as any)
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotion-requests'] });
      showAlert('Success', 'Promotion request rejected.', 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to reject promotion', 'error');
    }
  });

  const handleApprove = (request: any) => {
    setAlertConfig({
      visible: true,
      title: 'Approve Promotion',
      message: `Are you sure you want to approve the promotion to ${request.to_year} for ${request.institutions?.name || request.institution_id}?\n\nThis will auto-promote students, create new classes, and carry forward fee structures.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { 
          text: 'Approve & Execute', 
          style: 'primary', 
          onPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            approveMutation.mutate(request);
          }
        }
      ]
    });
  };

  const handleReject = (request: any) => {
    setAlertConfig({
      visible: true,
      title: 'Reject Promotion',
      message: `Are you sure you want to reject the promotion request from ${request.institutions?.name}?`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { 
          text: 'Reject', 
          style: 'destructive', 
          onPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            rejectMutation.mutate(request.id);
          }
        }
      ]
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const pastRequests = requests?.filter(r => r.status !== 'pending') || [];

  return (
    <View style={styles.container}>
      <PageHeader title="Academic Promotions" subtitle="Manage institution year transitions" />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionTitle}>Pending Approvals ({pendingRequests.length})</Text>
        
        {pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarRange size={48} color="#E2E8F0" />
            <Text style={styles.emptyStateText}>No pending promotion requests.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.instIcon}>
                    <Building2 size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.instInfo}>
                    <Text style={styles.instName}>{request.institutions?.name || request.institution_id}</Text>
                    <Text style={styles.instCode}>ID: {request.institution_id}</Text>
                  </View>
                  <Badge variant="warning">Pending</Badge>
                </View>

                <View style={styles.promotionDetails}>
                  <View style={styles.yearBox}>
                    <Text style={styles.yearLabel}>FROM YEAR</Text>
                    <Text style={styles.yearValue}>{request.from_year}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <ChevronRight size={20} color={theme.colors.textMuted} />
                  </View>
                  <View style={[styles.yearBox, styles.yearBoxActive]}>
                    <Text style={[styles.yearLabel, { color: theme.colors.primary }]}>TO YEAR</Text>
                    <Text style={[styles.yearValue, { color: theme.colors.primary }]}>{request.to_year}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => handleReject(request)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <XCircle size={18} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]} 
                    onPress={() => handleApprove(request)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    {approveMutation.isPending && approveMutation.variables?.id === request.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="white" />
                        <Text style={[styles.actionBtnText, { color: 'white' }]}>Approve Promotion</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {pastRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>History</Text>
            <View style={styles.list}>
              {pastRequests.map((request) => (
                <View key={request.id} style={[styles.card, { opacity: 0.8 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.instInfo}>
                      <Text style={styles.instName}>{request.institutions?.name || request.institution_id}</Text>
                      <Text style={styles.instCode}>{request.from_year} → {request.to_year}</Text>
                    </View>
                    <Badge variant={request.status === 'approved' ? 'success' : 'destructive'} >
                      {request.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Badge>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reusable Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => {
          if (!alertConfig.buttons) {
            setAlertConfig(prev => ({ ...prev, visible: false }));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16, marginLeft: 4 },
  list: { gap: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  instIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  instInfo: { flex: 1 },
  instName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  instCode: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  promotionDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20 },
  yearBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  yearBoxActive: { backgroundColor: 'white', borderRadius: 12, paddingVertical: 12, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  yearLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  yearValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  arrowContainer: { paddingHorizontal: 16 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  rejectBtn: { backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: theme.colors.primary },
  actionBtnText: { fontSize: 14, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyStateText: { fontSize: 15, color: theme.colors.textMuted, marginTop: 16, fontWeight: '500' }
});
