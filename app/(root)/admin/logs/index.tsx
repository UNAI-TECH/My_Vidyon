import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Linking,
  Alert,
  ScrollView
} from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldAlert, 
  Terminal, 
  Clock, 
  Activity, 
  FileSpreadsheet, 
  Phone, 
  Mail, 
  Search, 
  Calendar, 
  Megaphone, 
  UserCheck,
  Download,
  Filter,
  User,
  Building,
  CreditCard,
  RefreshCw,
  Layers,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react-native';
import { format, isAfter, subDays, startOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveBase64FileToDevice } from '../../../../src/utils/fileUtils';

export default function AdminLogs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'leads' | 'system'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // System Audit Logs filter states
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');

  // 1. Fetch Ad Leads
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['admin-ad-leads-tab'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('ad_leads') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch ad_leads:', error);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!user
  });

  // 2. Fetch Live User & Action Audit Logs
  const { data: auditLogs = [], isLoading: loadingAuditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['admin-institution-audit-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('institution_audit_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.warn('Could not fetch institution_audit_logs:', error);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!user
  });

  // Extract unique actors for actor filter
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log: any) => {
      if (log.actor_email) set.add(log.actor_email);
    });
    return Array.from(set);
  }, [auditLogs]);

  // Filtered Leads
  const nonAdminLeads = leads.filter((lead: any) => {
    const r = (lead.user_role || '').toLowerCase();
    return r !== 'admin' && r !== 'superadmin';
  });

  const filteredLeads = nonAdminLeads.filter((lead: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (lead.user_name || '').toLowerCase().includes(q);
    const phoneMatch = (lead.contact_number || '').toLowerCase().includes(q);
    const adMatch = (lead.ad_title || '').toLowerCase().includes(q);
    return nameMatch || phoneMatch || adMatch;
  });

  // Filtered System Audit Logs
  const filteredAuditLogs = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    return auditLogs.filter((log: any) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesType = (log.entity_type || '').toLowerCase().includes(q);
        const matchesEmail = (log.actor_email || '').toLowerCase().includes(q);
        const matchesInst = (log.institution_id || '').toLowerCase().includes(q);
        const detailsStr = JSON.stringify(log.new_data || log.old_data || {}).toLowerCase();
        const matchesDetails = detailsStr.includes(q);
        if (!matchesAction && !matchesType && !matchesEmail && !matchesInst && !matchesDetails) {
          return false;
        }
      }

      // 2. Feature Filter
      if (featureFilter !== 'all') {
        const entity = (log.entity_type || '').toLowerCase();
        if (featureFilter === 'user' && !entity.includes('user') && !entity.includes('stakeholder')) return false;
        if (featureFilter === 'ad' && !entity.includes('ad') && !entity.includes('campaign')) return false;
        if (featureFilter === 'leads' && !entity.includes('lead')) return false;
        if (featureFilter === 'finance' && !entity.includes('finance') && !entity.includes('fee')) return false;
        if (featureFilter === 'institution' && !entity.includes('institution')) return false;
      }

      // 3. Action Filter
      if (actionFilter !== 'all') {
        const act = (log.action || '').toUpperCase();
        if (!act.includes(actionFilter.toUpperCase())) return false;
      }

      // 4. Actor Filter
      if (actorFilter !== 'all') {
        if (log.actor_email !== actorFilter) return false;
      }

      // 5. Time Filter
      if (timeFilter !== 'all' && log.created_at) {
        const logDate = new Date(log.created_at);
        if (timeFilter === 'today' && !isAfter(logDate, todayStart)) return false;
        if (timeFilter === '7days' && !isAfter(logDate, sevenDaysAgo)) return false;
        if (timeFilter === '30days' && !isAfter(logDate, thirtyDaysAgo)) return false;
      }

      return true;
    });
  }, [auditLogs, searchQuery, featureFilter, actionFilter, actorFilter, timeFilter]);

  // Export Leads to XLSX Sheet
  const handleExportLeadsXLSX = async () => {
    if (filteredLeads.length === 0) {
      Alert.alert('No Leads', 'There are no leads matching your search to export.');
      return;
    }

    try {
      setIsExporting(true);

      const excelRows = filteredLeads.map((item: any, index: number) => ({
        'S.No': index + 1,
        'Campaign Title': item.ad_title || 'Sponsored Campaign',
        'User Name': item.user_name || 'Anonymous User',
        'Phone Number': item.contact_number || 'Not Provided',
        'User Role': (item.user_role || 'User').toUpperCase(),
        'Action': (item.action_type || 'Click').toUpperCase(),
        'Date & Time': item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 22 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ad Leads');

      const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `Ad_Leads_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      await saveBase64FileToDevice({
        base64Data: wboutBase64,
        fileName,
        dialogTitle: 'Download Ad Leads XLSX Sheet'
      });
    } catch (err: any) {
      console.error('[Export XLSX Error]:', err);
      Alert.alert('Export Failed', err.message || 'Failed to generate Excel sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Filtered Audit Logs to XLSX Sheet
  const handleExportAuditLogsXLSX = async () => {
    if (filteredAuditLogs.length === 0) {
      Alert.alert('No Logs Found', 'There are no audit logs matching your filters to export.');
      return;
    }

    try {
      setIsExporting(true);

      const excelRows = filteredAuditLogs.map((item: any, index: number) => {
        const details = item.new_data || item.old_data || {};
        const detailsSummary = Object.entries(details)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' | ');

        return {
          'S.No': index + 1,
          'Timestamp': item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
          'Action': (item.action || 'ACTION').toUpperCase(),
          'Feature / Entity': (item.entity_type || 'system').toUpperCase(),
          'Target Entity ID': item.entity_id || 'N/A',
          'Admin / Actor': item.actor_email || 'System Root',
          'Institution Scope': item.institution_id || 'Global',
          'Activity Details': detailsSummary || 'Logged user action'
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 26 },
        { wch: 28 },
        { wch: 18 },
        { wch: 45 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Platform Audit Logs');

      const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `Vidyon_Audit_Logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      await saveBase64FileToDevice({
        base64Data: wboutBase64,
        fileName,
        dialogTitle: 'Export Platform Audit Logs XLSX Sheet'
      });
    } catch (err: any) {
      console.error('[Export Audit Logs Error]:', err);
      Alert.alert('Export Failed', err.message || 'Failed to generate Audit Logs spreadsheet.');
    } finally {
      setIsExporting(false);
    }
  };

  const dialPhone = (phone: string) => {
    if (!phone || phone === 'Not Provided') {
      Alert.alert('Notice', 'No contact number provided for this lead.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call on this device.');
    });
  };

  const sendEmail = (email: string) => {
    if (!email || email === 'Not Provided') {
      Alert.alert('Notice', 'No email address provided for this lead.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Unable to open mail client.');
    });
  };

  const getLogIcon = (entityType: string, action: string) => {
    const ent = (entityType || '').toLowerCase();
    const act = (action || '').toUpperCase();
    if (ent.includes('user') || ent.includes('stakeholder')) {
      return <User size={18} color="#4F46E5" />;
    }
    if (ent.includes('ad')) {
      return <Megaphone size={18} color="#D97706" />;
    }
    if (ent.includes('lead')) {
      return <Phone size={18} color="#059669" />;
    }
    if (ent.includes('finance') || ent.includes('fee')) {
      return <CreditCard size={18} color="#10B981" />;
    }
    if (ent.includes('institution')) {
      return <Building size={18} color="#0284C7" />;
    }
    if (act.includes('DELETE') || act.includes('DEACTIVATE')) {
      return <ShieldAlert size={18} color="#EF4444" />;
    }
    return <Terminal size={18} color="#64748B" />;
  };

  const getActionColor = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('ACTIVATE')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    if (act.includes('DELETE') || act.includes('DEACTIVATE')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    if (act.includes('EXPORT')) return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
    if (act.includes('UPDATE')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Platform Audit & Logs"
        subtitle="Track every user action, module changes, time trails, and download reports"
      />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'system' && styles.tabBtnActive]}
          onPress={() => setActiveTab('system')}
        >
          <Terminal size={16} color={activeTab === 'system' ? 'white' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
            User Action Audit Logs ({auditLogs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'leads' && styles.tabBtnActive]}
          onPress={() => setActiveTab('leads')}
        >
          <Megaphone size={16} color={activeTab === 'leads' ? 'white' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>
            Ad Campaign Leads ({leads.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ACTION AUDIT LOGS TAB */}
      {activeTab === 'system' ? (
        <View style={{ flex: 1 }}>
          {/* Action Row: Search and Export */}
          <View style={styles.actionRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by user email, action, feature, or details..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textMuted}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.exportBtn, isExporting && { opacity: 0.6 }]}
              onPress={handleExportAuditLogsXLSX}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="white" />
                  <Text style={styles.exportBtnText}>Export XLSX</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.refreshBtn}
              onPress={() => refetchAuditLogs()}
            >
              <RefreshCw size={15} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Multi-facet Filter Bar (Feature, Action, Time, Actor) */}
          <View style={styles.filterBarContainer}>
            {/* 1. Feature Module Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <Text style={styles.filterRowLabel}>Feature:</Text>
              {[
                { id: 'all', label: 'All Modules' },
                { id: 'user', label: 'Users & Admins' },
                { id: 'ad', label: 'Sponsored Ads' },
                { id: 'leads', label: 'Leads' },
                { id: 'finance', label: 'Finance' },
                { id: 'institution', label: 'Institutions' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.miniChip, featureFilter === f.id && styles.miniChipActive]}
                  onPress={() => setFeatureFilter(f.id)}
                >
                  <Text style={[styles.miniChipText, featureFilter === f.id && styles.miniChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 2. Action Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <Text style={styles.filterRowLabel}>Action:</Text>
              {[
                { id: 'all', label: 'All Actions' },
                { id: 'CREATE', label: 'Create' },
                { id: 'UPDATE', label: 'Update' },
                { id: 'DELETE', label: 'Delete' },
                { id: 'EXPORT', label: 'Export' },
                { id: 'ACTIVATE', label: 'Activate' },
                { id: 'DEACTIVATE', label: 'Deactivate' },
              ].map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.miniChip, actionFilter === a.id && styles.miniChipActive]}
                  onPress={() => setActionFilter(a.id)}
                >
                  <Text style={[styles.miniChipText, actionFilter === a.id && styles.miniChipTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 3. Time Filter & Actor Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <Text style={styles.filterRowLabel}>Time:</Text>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.miniChip, timeFilter === t.id && styles.miniChipActive]}
                  onPress={() => setTimeFilter(t.id as any)}
                >
                  <Text style={[styles.miniChipText, timeFilter === t.id && styles.miniChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {uniqueActors.length > 0 && (
                <>
                  <View style={styles.chipDivider} />
                  <Text style={styles.filterRowLabel}>Admin:</Text>
                  <TouchableOpacity
                    style={[styles.miniChip, actorFilter === 'all' && styles.miniChipActive]}
                    onPress={() => setActorFilter('all')}
                  >
                    <Text style={[styles.miniChipText, actorFilter === 'all' && styles.miniChipTextActive]}>
                      All Users
                    </Text>
                  </TouchableOpacity>
                  {uniqueActors.map((actorEmail) => (
                    <TouchableOpacity
                      key={actorEmail}
                      style={[styles.miniChip, actorFilter === actorEmail && styles.miniChipActive]}
                      onPress={() => setActorFilter(actorEmail)}
                    >
                      <Text style={[styles.miniChipText, actorFilter === actorEmail && styles.miniChipTextActive]}>
                        {actorEmail.split('@')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>

          {/* Audit Logs List */}
          {loadingAuditLogs ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={filteredAuditLogs}
              keyExtractor={(item) => item.id || `audit-${Math.random()}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Terminal size={48} color={theme.colors.textMuted} opacity={0.3} />
                  <Text style={styles.emptyTitle}>No matching audit logs found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery || featureFilter !== 'all' || actionFilter !== 'all' || timeFilter !== 'all'
                      ? 'Try adjusting your filters to see more activities.'
                      : 'All actions performed by admins, stakeholders, and users will be recorded here.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const actStyle = getActionColor(item.action);
                const details = item.new_data || item.old_data || {};
                const hasDetails = Object.keys(details).length > 0;

                return (
                  <View style={styles.auditCard}>
                    <View style={styles.auditCardHeader}>
                      <View style={styles.auditIconWrap}>
                        {getLogIcon(item.entity_type, item.action)}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.auditActionRow}>
                          <View style={[styles.actionBadgePill, { backgroundColor: actStyle.bg, borderColor: actStyle.border }]}>
                            <Text style={[styles.actionBadgeText, { color: actStyle.text }]}>
                              {(item.action || 'ACTION').toUpperCase()}
                            </Text>
                          </View>

                          <View style={styles.featureBadgePill}>
                            <Text style={styles.featureBadgeText}>
                              {(item.entity_type || 'SYSTEM').toUpperCase()}
                            </Text>
                          </View>

                          <View style={styles.scopeBadgePill}>
                            <Text style={styles.scopeBadgeText}>
                              {item.institution_id === 'global' || !item.institution_id ? 'GLOBAL' : `INST: ${item.institution_id}`}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.auditActorText}>
                          By: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{item.actor_email || 'System'}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Activity Payload / Details */}
                    {hasDetails && (
                      <View style={styles.auditDetailsBox}>
                        {Object.entries(details).slice(0, 5).map(([k, v]) => (
                          <View key={k} style={styles.detailRow}>
                            <Text style={styles.detailKey}>{k}:</Text>
                            <Text style={styles.detailVal} numberOfLines={1}>
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Card Footer with timestamp */}
                    <View style={styles.cardFooter}>
                      <Clock size={11} color={theme.colors.textMuted} />
                      <Text style={styles.dateText}>
                        {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy • h:mm:ss a') : 'Recently logged'}
                      </Text>
                      {item.entity_id && (
                        <Text style={[styles.dateText, { marginLeft: 'auto', color: '#64748B' }]}>
                          ID: {String(item.entity_id).substring(0, 16)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : (
        /* AD LEADS TAB */
        <View style={{ flex: 1 }}>
          <View style={styles.actionRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search leads by name, phone, or ad campaign..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textMuted}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.exportBtn, isExporting && { opacity: 0.6 }]}
              onPress={handleExportLeadsXLSX}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="white" />
                  <Text style={styles.exportBtnText}>Export Leads</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {loadingLeads ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={filteredLeads}
              keyExtractor={(item) => item.id || `lead-${Math.random()}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Megaphone size={48} color={theme.colors.textMuted} opacity={0.3} />
                  <Text style={styles.emptyTitle}>No leads found</Text>
                  <Text style={styles.emptySubtitle}>
                    When users interact with sponsored campaigns, their contact info will be logged here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.leadCard}>
                  <View style={styles.leadHeader}>
                    <View style={styles.userAvatar}>
                      <UserCheck size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadName}>{item.user_name || 'App User'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Megaphone size={12} color={theme.colors.primary} />
                        <Text style={styles.leadAdTitle} numberOfLines={1}>
                          {item.ad_title || 'Sponsored Campaign'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.roleBadge, { backgroundColor: (item.action_type || 'click').toLowerCase() === 'view' ? '#EFF6FF' : '#ECFDF5' }]}>
                        <Text style={[styles.roleText, { color: (item.action_type || 'click').toLowerCase() === 'view' ? '#2563EB' : '#10B981' }]}>
                          {(item.action_type || 'click').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: item.user_role === 'student' ? '#EFF6FF' : '#F0FDF4' }]}>
                        <Text style={[styles.roleText, { color: item.user_role === 'student' ? '#2563EB' : '#16A34A' }]}>
                          {(item.user_role || 'User').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.contactRow}>
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => dialPhone(item.contact_number)}
                    >
                      <Phone size={13} color="#10B981" />
                      <Text style={styles.contactText}>
                        {item.contact_number && item.contact_number !== 'Not Provided' ? item.contact_number : 'No Phone'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => sendEmail(item.user_email)}
                    >
                      <Mail size={13} color="#3B82F6" />
                      <Text style={styles.contactText} numberOfLines={1}>
                        {item.user_email && item.user_email !== 'Not Provided' ? item.user_email : 'No Email'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardFooter}>
                    <Calendar size={11} color={theme.colors.textMuted} />
                    <Text style={styles.dateText}>
                      {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy • h:mm a') : 'Recently'}
                    </Text>
                    <Text style={{ fontSize: 11, color: (item.action_type || 'click').toLowerCase() === 'view' ? '#2563EB' : '#10B981', fontWeight: '600', marginLeft: 8 }}>
                      • {(item.action_type || 'click').toLowerCase() === 'view' ? 'Impression View' : 'Direct Click'}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: theme.colors.text,
  },
  clearSearch: {
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 8,
  },
  filterChipScroll: {
    flexDirection: 'row',
  },
  filterRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    alignSelf: 'center',
    marginRight: 6,
    textTransform: 'uppercase',
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  miniChipActive: {
    backgroundColor: theme.colors.primary,
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  miniChipTextActive: {
    color: '#FFFFFF',
  },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  list: { paddingBottom: 24 },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  auditCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  auditIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  actionBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  featureBadgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  scopeBadgePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scopeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  auditActorText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  auditDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailKey: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  detailVal: {
    fontSize: 11,
    color: '#1E293B',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  leadCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leadAdTitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  contactItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  contactText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
