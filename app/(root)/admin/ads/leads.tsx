import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  FlatList, 
  Linking,
  Alert
} from 'react-native';
import { theme } from '../../../../src/theme';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Download, 
  FileSpreadsheet, 
  Phone, 
  Mail, 
  Search, 
  Calendar, 
  ArrowLeft, 
  RefreshCw, 
  Filter,
  Megaphone,
  UserCheck
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { saveBase64FileToDevice } from '../../../../src/utils/fileUtils';

export default function AdminAdLeadsScreen() {
  const { user, role, institutionId, institutionUuid, institutionName } = useAuth();
  const params = useLocalSearchParams<{ adId?: string }>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdId, setSelectedAdId] = useState<string>(params.adId || 'all');
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'parent' | 'faculty' | 'institution'>('all');
  const [selectedAction, setSelectedAction] = useState<'all' | 'click' | 'view'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const isUUID = (str: string | null | undefined): boolean => 
    !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Check if user is an institution-scoped ad manager
  const isScoped = !!institutionId && institutionId !== 'global' && role !== 'superadmin';

  // Sync if route param changes
  React.useEffect(() => {
    if (params.adId) {
      setSelectedAdId(params.adId);
    }
  }, [params.adId]);

  // Fetch campaigns for this user's scope so every campus campaign is represented
  const { data: scopedCampaigns = [] } = useQuery({
    queryKey: ['admin-leads-campaigns', isScoped, institutionId, institutionUuid],
    queryFn: async () => {
      let q = (supabase.from('academic_events') as any)
        .select('id, title, institution_id')
        .eq('is_admin_added', true);

      if (isScoped) {
        let targetUuid = institutionUuid && isUUID(institutionUuid) ? institutionUuid : null;
        if (!targetUuid && institutionId) {
          if (isUUID(institutionId)) {
            targetUuid = institutionId;
          } else {
            const { data: inst } = await (supabase.from('institutions') as any)
              .select('id')
              .eq('institution_id', institutionId)
              .maybeSingle();
            targetUuid = (inst as any)?.id || null;
          }
        }
        if (targetUuid) {
          q = q.eq('institution_id', targetUuid);
        }
      }

      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) {
        console.warn('Failed to fetch campaigns for leads:', error);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!user
  });

  // Fetch leads from ad_leads table (strictly scoped if not global admin)
  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-ad-leads', isScoped, scopedCampaigns.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      // If scoped and campus has zero campaigns, return empty
      if (isScoped && scopedCampaigns.length === 0) {
        return [];
      }

      let q = (supabase
        .from('ad_leads') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (isScoped) {
        const campaignIdsList = scopedCampaigns.map((c: any) => c.id);
        q = q.in('ad_id', campaignIdsList);
      }

      const { data, error } = await q;

      if (error) {
        console.warn('Could not fetch ad_leads:', error);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!user && (!isScoped || scopedCampaigns !== undefined)
  });

  // Exclude admin and superadmin roles from ad leads
  const nonAdminLeads = React.useMemo(() => {
    return leads.filter((lead: any) => {
      const r = (lead.user_role || '').toLowerCase();
      return r !== 'admin' && r !== 'superadmin';
    });
  }, [leads]);

  // Extract unique campaigns for specific ad filtering
  const uniqueCampaigns = React.useMemo(() => {
    const map = new Map<string, string>();
    // First include all campaigns that exist in this scope
    scopedCampaigns.forEach((c: any) => {
      if (c.id) {
        map.set(c.id, c.title || 'Sponsored Campaign');
      }
    });
    // For global admins, also ensure any additional ads with recorded leads are present
    if (!isScoped) {
      nonAdminLeads.forEach((l: any) => {
        if (l.ad_id && !map.has(l.ad_id)) {
          map.set(l.ad_id, l.ad_title || 'Sponsored Campaign');
        }
      });
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [isScoped, scopedCampaigns, nonAdminLeads]);

  // Filter leads based on search query, selected campaign/ad, selected role, and action type (click vs view)
  const filteredLeads = nonAdminLeads.filter((lead: any) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (lead.user_name || '').toLowerCase().includes(q);
    const phoneMatch = (lead.contact_number || '').toLowerCase().includes(q);
    const adMatch = (lead.ad_title || '').toLowerCase().includes(q);

    const matchesSearch = !q || nameMatch || phoneMatch || adMatch;
    const matchesCampaign = selectedAdId === 'all' || lead.ad_id === selectedAdId;
    const matchesRole = selectedRole === 'all' || (lead.user_role || '').toLowerCase() === selectedRole;
    const matchesAction = selectedAction === 'all' || (lead.action_type || 'click').toLowerCase() === selectedAction;

    return matchesSearch && matchesCampaign && matchesRole && matchesAction;
  });

  // Export to XLSX Spreadsheet (Only Name and Phone Number, no mail id, no admin role)
  const handleExportXLSX = async () => {
    if (filteredLeads.length === 0) {
      Alert.alert('No Leads', 'There are no leads matching your filter to export.');
      return;
    }

    try {
      setIsExporting(true);

      // Prepare clean data rows for Excel: ONLY Name and Phone Number (no mail id)
      const excelRows = filteredLeads.map((item: any, index: number) => ({
        'S.No': index + 1,
        'Campaign Title': item.ad_title || 'Sponsored Campaign',
        'Name': item.user_name || 'App User',
        'Phone Number': item.contact_number || 'Not Provided',
        'User Role': (item.user_role || 'User').toUpperCase(),
        'Interaction Type': (item.action_type || 'Click').toUpperCase(),
        'Date & Time': item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
      }));

      // Generate worksheet & workbook
      const ws = XLSX.utils.json_to_sheet(excelRows);
      
      // Auto-fit column widths
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 30 }, // Campaign Title
        { wch: 22 }, // Name
        { wch: 18 }, // Phone Number
        { wch: 14 }, // Role
        { wch: 16 }, // Interaction Type
        { wch: 22 }  // Date & Time
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      const currentCampaign = uniqueCampaigns.find(c => c.id === selectedAdId);
      const sheetTitle = currentCampaign ? currentCampaign.title.substring(0, 25) : 'Ad Leads';
      XLSX.utils.book_append_sheet(wb, ws, sheetTitle.replace(/[\\/?*\[\]]/g, ''));

      // Generate base64 representation of XLSX file
      const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save directly to device storage (Downloads folder on Android) or share dialog
      const filePrefix = currentCampaign ? currentCampaign.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 18) : 'All_Campaigns';
      const fileName = `Vidyon_Leads_${filePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      await saveBase64FileToDevice({
        base64Data: wboutBase64,
        fileName,
        dialogTitle: `Download Leads for ${currentCampaign ? currentCampaign.title : 'All Ads'}`
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

  // Distinct contacts count (excluding admin)
  const uniqueContactsCount = new Set(nonAdminLeads.map((l: any) => l.contact_number).filter((p: any) => p && p !== 'Not Provided')).size;
  const totalViewsCount = nonAdminLeads.filter((l: any) => (l.action_type || '').toLowerCase() === 'view').length;
  const totalClicksCount = nonAdminLeads.filter((l: any) => (l.action_type || 'click').toLowerCase() === 'click').length;

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Ad Leads & User Logs</Text>
          <Text style={styles.headerSubtitle}>
            {isScoped ? `User contact data captured from ${institutionName || 'campus'} ads` : 'User contact data captured from sponsored ads'}
          </Text>
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
              <FileSpreadsheet size={16} color="white" />
              <Text style={styles.exportBtnText}>Export XLSX</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id || `lead-${Math.random()}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL LEADS</Text>
                <Text style={styles.kpiValue}>{nonAdminLeads.length}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>CLICKS</Text>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>{totalClicksCount}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>VIEWS</Text>
                <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{totalViewsCount}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>FILTERED</Text>
                <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{filteredLeads.length}</Text>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, contact, campaign, or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textMuted}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Campaign-Specific Filter Chips */}
            {uniqueCampaigns.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedAdId === 'all' && styles.filterChipActive]}
                    onPress={() => setSelectedAdId('all')}
                  >
                    <Text style={[styles.filterChipText, selectedAdId === 'all' && styles.filterChipTextActive]}>
                      All Ads ({nonAdminLeads.length})
                    </Text>
                  </TouchableOpacity>

                  {uniqueCampaigns.map((camp) => {
                    const count = nonAdminLeads.filter((l: any) => l.ad_id === camp.id).length;
                    const isActive = selectedAdId === camp.id;
                    return (
                      <TouchableOpacity
                        key={camp.id}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => setSelectedAdId(camp.id)}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} numberOfLines={1}>
                          {camp.title} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Action Type Filter Chips (All / Clicks / Views) */}
            <View style={styles.actionFilterRow}>
              {[
                { id: 'all', label: `All Actions (${nonAdminLeads.length})` },
                { id: 'click', label: `Clicks (${totalClicksCount})` },
                { id: 'view', label: `Views (${totalViewsCount})` },
              ].map((actionChip) => (
                <TouchableOpacity
                  key={actionChip.id}
                  style={[styles.actionFilterChip, selectedAction === actionChip.id && styles.actionFilterChipActive]}
                  onPress={() => setSelectedAction(actionChip.id as any)}
                >
                  <Text style={[styles.actionFilterChipText, selectedAction === actionChip.id && styles.actionFilterChipTextActive]}>
                    {actionChip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Role Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'student', label: 'Students' },
                { id: 'parent', label: 'Parents' },
                { id: 'faculty', label: 'Faculty' },
                { id: 'institution', label: 'Institutions' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterChip, selectedRole === chip.id && styles.filterChipActive]}
                  onPress={() => setSelectedRole(chip.id as any)}
                >
                  <Text style={[styles.filterChipText, selectedRole === chip.id && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
          ) : (
            <View style={styles.emptyContainer}>
              <Megaphone size={56} color={theme.colors.textMuted} opacity={0.3} />
              <Text style={styles.emptyTitle}>
                {selectedAdId !== 'all' 
                  ? `No leads yet for "${uniqueCampaigns.find(c => c.id === selectedAdId)?.title || 'this ad'}"` 
                  : (isScoped ? `No leads recorded for ${institutionName || 'your campus'} ads yet` : 'No leads recorded yet')}
              </Text>
              <Text style={styles.emptySubtitle}>
                When students, parents, or faculty view or click on this sponsored campaign, their contact details will be logged automatically here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isView = (item.action_type || '').toLowerCase() === 'view';
          return (
            <View style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={[styles.userAvatar, isView && { backgroundColor: '#EFF6FF' }]}>
                  <UserCheck size={18} color={isView ? '#2563EB' : theme.colors.primary} />
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
                  <View style={[styles.actionBadge, { backgroundColor: isView ? '#EFF6FF' : '#ECFDF5' }]}>
                    <Text style={[styles.actionBadgeText, { color: isView ? '#2563EB' : '#10B981' }]}>
                      {(item.action_type || 'click').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: item.user_role === 'student' ? '#EFF6FF' : item.user_role === 'parent' ? '#FDF2F8' : '#F0FDF4' }]}>
                    <Text style={[styles.roleText, { color: item.user_role === 'student' ? '#2563EB' : item.user_role === 'parent' ? '#DB2777' : '#16A34A' }]}>
                      {(item.user_role || 'User').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Contact Information with Click-to-Action */}
              <View style={styles.contactRow}>
                <TouchableOpacity 
                  style={styles.contactItem} 
                  onPress={() => dialPhone(item.contact_number)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Phone size={14} color="#10B981" />
                  </View>
                  <Text style={styles.contactText}>
                    {item.contact_number && item.contact_number !== 'Not Provided' ? item.contact_number : 'No Phone'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.contactItem} 
                  onPress={() => sendEmail(item.user_email)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Mail size={14} color="#3B82F6" />
                  </View>
                  <Text style={styles.contactText} numberOfLines={1}>
                    {item.user_email && item.user_email !== 'Not Provided' ? item.user_email : 'No Email'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer with Timestamp */}
              <View style={styles.cardFooter}>
                <Calendar size={12} color={theme.colors.textMuted} />
                <Text style={styles.dateText}>
                  {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy • h:mm a') : 'Recently'}
                </Text>
                <View style={styles.dot} />
                <Text style={[styles.actionTypeText, { color: isView ? '#2563EB' : '#10B981', fontWeight: '600' }]}>
                  {isView ? 'Impression View' : 'Direct Click / Inquiry'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.text,
  },
  clearSearch: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  filterChipsRow: {
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  leadCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leadAdTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 12,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
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
  contactIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
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
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textMuted,
  },
  actionTypeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  actionFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionFilterChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  actionFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actionFilterChipTextActive: {
    color: '#FFFFFF',
  },
  actionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
