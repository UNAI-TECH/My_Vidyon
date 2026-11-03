import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarRange, Building2, ChevronRight, CheckCircle, XCircle, ArrowRight, ShieldCheck, Eye } from 'lucide-react-native';
import { Badge } from '../../../../src/components/common/Badge';
import { Select } from '../../../../src/components/common/Select';
import { DataTable } from '../../../../src/components/common/DataTable';
import { ActionDropdown, ActionDropdownItem } from '../../../../src/components/common/ActionDropdown';
import { router } from 'expo-router';

export default function AdminPromotionsScreen() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterInstitution, setFilterInstitution] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-promotion-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_requests')
        .select(`
          *,
          institutions (
            name,
            logo_url,
            city,
            institution_id
          )
        `)
        .order('requested_at', { ascending: false });
        
      if (error && error.code !== 'PGRST116') throw error;
      return (data as any[]) || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      const { data, error } = await (supabase as any).rpc('promote_institution', {
        p_institution_id: request.institution_id,
        p_from_year: request.from_year,
        p_to_year: request.to_year,
        p_request_id: request.id,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotion-requests'] });
      showAlert(
        'Promotion Approved',
        `Successfully advanced the institution academic year. Auto-promoted ${data?.promoted_students || 0} students and archived ${data?.alumni_students || 0} as graduated alumni.`,
        'success'
      );
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to approve promotion.', 'error');
    },
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
      showAlert('Rejected', 'Promotion request was rejected.', 'info');
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to reject promotion', 'error');
    },
  });

  const handleApprove = (request: any) => {
    setAlertConfig({
      visible: true,
      title: 'Approve Academic Year Transition',
      message: `Are you sure you want to approve the promotion to ${request.to_year} for ${request.institutions?.name || request.institution_id}?\n\nThis will promote active students to next class, roll forward curriculum structures, and transition graduating batches to alumni.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        { 
          text: 'Approve & Execute', 
          style: 'primary', 
          onPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            approveMutation.mutate(request);
          },
        },
      ],
    });
  };

  const handleReject = (request: any) => {
    setAlertConfig({
      visible: true,
      title: 'Reject Promotion Request',
      message: `Are you sure you want to reject the promotion request from ${request.institutions?.name}?`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        { 
          text: 'Reject', 
          style: 'destructive', 
          onPress: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            rejectMutation.mutate(request.id);
          },
        },
      ],
    });
  };

  // Distinct institutions for filter dropdown
  const uniqueInstitutions = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach(r => {
      const id = r.institution_id;
      const name = r.institutions?.name || id;
      if (id && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterInstitution !== 'all' && r.institution_id !== filterInstitution) return false;
      return true;
    });
  }, [requests, filterStatus, filterInstitution]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      <PageHeader
        title="Academic Year Promotions"
        subtitle="Approve year transitions, class roll-forward, and alumni graduation"
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Filter and View Toggle Toolbar */}
        <View style={styles.toolbarCard}>
          <View style={styles.filtersRow}>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Select
                placeholder="Filter by Status"
                value={filterStatus}
                options={[
                  { label: `All Requests (${requests.length})`, value: 'all' },
                  { label: `Pending Approvals (${pendingCount})`, value: 'pending' },
                  { label: 'Approved & Completed', value: 'approved' },
                  { label: 'Rejected', value: 'rejected' },
                ]}
                onSelect={(val) => setFilterStatus(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={{ flex: 1, minWidth: 200 }}>
              <Select
                placeholder="Filter by Campus"
                value={filterInstitution}
                options={[
                  { label: 'All Campuses', value: 'all' },
                  ...uniqueInstitutions,
                ]}
                onSelect={(val) => setFilterInstitution(val)}
                searchable={true}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'table' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('table')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'table' && styles.viewToggleTextActive]}>Table</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'cards' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('cards')}
              >
                <Text style={[styles.viewToggleText, viewMode === 'cards' && styles.viewToggleTextActive]}>Cards</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content View */}
        {viewMode === 'table' ? (
          <DataTable<any>
            columns={[
              {
                key: 'institutions',
                title: 'Campus / Institution',
                sortable: true,
                width: '32%',
                render: (r) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.tableInstIcon}>
                      <Building2 size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                        {r.institutions?.name || r.institution_id}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        ID: {r.institution_id} {r.institutions?.city ? `• ${r.institutions.city}` : ''}
                      </Text>
                    </View>
                  </View>
                ),
              },
              {
                key: 'years',
                title: 'Transition Cycle',
                width: '26%',
                render: (r) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.yearChipOld}>
                      <Text style={styles.yearChipTextOld}>{r.from_year}</Text>
                    </View>
                    <ArrowRight size={13} color="#64748B" />
                    <View style={styles.yearChipNew}>
                      <Text style={styles.yearChipTextNew}>{r.to_year}</Text>
                    </View>
                  </View>
                ),
              },
              {
                key: 'requested_at',
                title: 'Requested At',
                width: '18%',
                render: (r) => (
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {r.requested_at ? new Date(r.requested_at).toLocaleDateString() : 'N/A'}
                  </Text>
                ),
              },
              {
                key: 'status',
                title: 'Status',
                width: '12%',
                render: (r) => (
                  <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'destructive'}>
                    {(r.status || 'PENDING').toUpperCase()}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                title: 'Actions',
                width: '12%',
                align: 'right',
                render: (r) => {
                  const actions: ActionDropdownItem[] = [
                    ...(r.status === 'pending'
                      ? [
                          {
                            id: 'approve',
                            label: 'Approve & Execute Promotion',
                            subLabel: 'Roll students forward to next academic year',
                            icon: <CheckCircle size={15} color="#16A34A" />,
                            variant: 'success' as const,
                            onPress: () => handleApprove(r),
                          },
                          {
                            id: 'reject',
                            label: 'Reject Promotion Request',
                            subLabel: 'Deny academic transition',
                            icon: <XCircle size={15} color="#DC2626" />,
                            variant: 'destructive' as const,
                            onPress: () => handleReject(r),
                          },
                        ]
                      : []),
                    {
                      id: 'view_inst',
                      label: 'View Campus Portal',
                      subLabel: 'Inspect institution master record',
                      icon: <Eye size={15} color="#4338CA" />,
                      onPress: () => router.push('/(root)/admin/institutions'),
                    },
                  ];
                  return <ActionDropdown items={actions} size="sm" />;
                },
              },
            ]}
            data={filteredRequests}
            keyExtractor={(item) => item.id}
            searchable={false}
            pageSize={10}
            loading={isLoading}
            emptyTitle="No Promotion Requests Found"
            emptyDescription="Promotion requests initiated by campus admins will appear here."
          />
        ) : (
          <View style={styles.cardsGrid}>
            {filteredRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.instIcon}>
                    <Building2 size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.instInfo}>
                    <Text style={styles.instName}>{request.institutions?.name || request.institution_id}</Text>
                    <Text style={styles.instCode}>ID: {request.institution_id}</Text>
                  </View>
                  <Badge variant={request.status === 'approved' ? 'success' : request.status === 'pending' ? 'warning' : 'destructive'}>
                    {(request.status || 'PENDING').toUpperCase()}
                  </Badge>
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

                {request.status === 'pending' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]} 
                      onPress={() => handleReject(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <XCircle size={17} color="#EF4444" />
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
                          <CheckCircle size={17} color="white" />
                          <Text style={[styles.actionBtnText, { color: 'white' }]}>Approve Promotion</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Alert Modal */}
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
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  toolbarCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginLeft: 'auto',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewToggleTextActive: {
    color: '#0F172A',
  },
  tableInstIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearChipOld: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yearChipTextOld: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  yearChipNew: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yearChipTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  cardsGrid: { gap: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  instIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instInfo: { flex: 1 },
  instName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  instCode: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  promotionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  yearBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  yearBoxActive: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  yearLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  yearValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  arrowContainer: { paddingHorizontal: 12 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  rejectBtn: { backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: theme.colors.primary },
  actionBtnText: { fontSize: 13, fontWeight: 'bold' },
});
