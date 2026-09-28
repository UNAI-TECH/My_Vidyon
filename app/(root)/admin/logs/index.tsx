import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Linking,
  Alert 
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
  Download
} from 'lucide-react-native';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { saveBase64FileToDevice } from '../../../../src/utils/fileUtils';

export default function AdminLogs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'leads' | 'system'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  const systemLogs = [
    { id: '1', action: 'New Institution Added', admin: 'kamal_saas', date: '10:30 AM', type: 'system' },
    { id: '2', action: 'Role Updated: principal@abc.com', admin: 'kamal_saas', date: '09:15 AM', type: 'security' },
    { id: '3', action: 'Server Maintenance Triggered', admin: 'System', date: '08:00 AM', type: 'infra' },
  ];

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

  // Export Leads to XLSX Sheet (Phone Number only, no admin roles)
  const handleExportXLSX = async () => {
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

  return (
    <View style={styles.container}>
      <PageHeader title="Platform Logs" subtitle="Audit trails & user inquiry leads" />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'leads' && styles.tabBtnActive]}
          onPress={() => setActiveTab('leads')}
        >
          <Megaphone size={16} color={activeTab === 'leads' ? 'white' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>
            Ad Leads ({leads.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'system' && styles.tabBtnActive]}
          onPress={() => setActiveTab('system')}
        >
          <Terminal size={16} color={activeTab === 'system' ? 'white' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
            System Logs
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'leads' ? (
        <View style={{ flex: 1 }}>
          {/* Action Row: Search and Export Button */}
          <View style={styles.actionRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search leads..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textMuted}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity 
              style={[styles.exportBtn, isExporting && { opacity: 0.6 }]}
              onPress={handleExportXLSX}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="white" />
                  <Text style={styles.exportBtnText}>XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {loadingLeads ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={filteredLeads}
              keyExtractor={item => item.id || `lead-${Math.random()}`}
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
      ) : (
        <FlatList
          data={systemLogs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.typeIcon, { backgroundColor: item.type === 'security' ? '#FEF2F2' : '#F1F5F9' }]}>
                {item.type === 'security' ? (
                  <ShieldAlert size={18} color="#EF4444" {...({} as any)} />
                ) : (
                  <Terminal size={18} color={theme.colors.textMuted} {...({} as any)} />
                )}
              </View>
              <View style={styles.content}>
                <Text style={styles.action}>{item.action}</Text>
                <Text style={styles.meta}>By {item.admin} • {item.date}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.type.toUpperCase()}</Text>
              </View>
            </View>
          )}
        />
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
    marginBottom: 16,
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
    gap: 10,
    marginBottom: 14,
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
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  action: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  tag: { backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 8, fontWeight: 'bold', color: theme.colors.textMuted },
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 10,
    color: theme.colors.textMuted,
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

