import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { format } from 'date-fns';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';
import { router } from 'expo-router';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { saveBase64FileToDevice } from '../../../../src/utils/fileUtils';

const TARGET_AUDIENCES = [
  { id: 'all', label: 'All Dashboards (Generic)' },
  { id: 'student', label: 'Students Only' },
  { id: 'parent', label: 'Parents Only' },
  { id: 'faculty', label: 'Faculty Only' },
  { id: 'institution', label: 'Institutions Only' },
];

const PRICING_TYPES = [
  { id: 'both', label: 'Hybrid (View + Click)' },
  { id: 'click', label: 'Click Ad (PPC)' },
  { id: 'view', label: 'View Ad (PPV)' },
];

export default function AdminAdManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportingAdId, setExportingAdId] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    hyperlink: '',
    banner_url: '',
    institution_id: null as string | null,
    target_audience: 'all' as 'all' | 'student' | 'parent' | 'faculty' | 'institution',
    ad_pricing_type: 'both' as 'both' | 'click' | 'view',
    paid_amount: '5000',
    cost_per_click: '2.50',
    cost_per_view: '0.20',
  });

  // Alert State
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' | 'warning' });

  // Fetch All Institutions for targeting
  const { data: institutions = [] } = useQuery({
    queryKey: ['all-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name');
      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Fetch Global/Targeted Ads
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['admin-global-ads'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('academic_events') as any)
        .select('*, institutions:institution_id(name)')
        .eq('is_admin_added', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Create Ad Mutation
  const createMutation = useMutation({
    mutationFn: async (newAd: any) => {
      const paid = parseFloat(newAd.paid_amount) || 0;
      const costClick = parseFloat(newAd.cost_per_click) || 2.50;
      const costView = parseFloat(newAd.cost_per_view) || 0.20;

      const { error } = await (supabase
        .from('academic_events') as any)
        .insert([{
          title: newAd.title,
          description: newAd.description,
          hyperlink: newAd.hyperlink,
          banner_url: newAd.banner_url,
          institution_id: newAd.institution_id,
          target_audience: newAd.target_audience || 'all',
          ad_pricing_type: newAd.ad_pricing_type || 'both',
          is_admin_added: true,
          event_type: 'sponsored',
          paid_amount: paid,
          cost_per_click: costClick,
          cost_per_view: costView,
          cost_per_visit: costClick,
          amount_debited: 0,
          remaining_balance: paid,
          clicks_count: 0,
          views_count: 0,
          visits_count: 0,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // Indefinite: 100 years out to satisfy NOT NULL constraints until budget is depleted
          event_date: format(new Date(), 'yyyy-MM-dd')
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-ads'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-revenue'] });
      setIsModalVisible(false);
      resetForm();
      showAlert('Success', 'Campaign published! Runs indefinitely until budget is fully exhausted.', 'success');
    },
    onError: (error: any) => {
      console.error('[Admin Ads Create Mutation Error]:', error);
      const msg = error?.message || 'Failed to publish campaign. Please try again.';
      showAlert('Error', msg, 'error');
    }
  });

  // Delete Ad Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('academic_events') as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-ads'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-revenue'] });
      showAlert('Removed', 'Sponsored content has been withdrawn.', 'success');
    },
    onError: (error: any) => {
      console.error('[Admin Ads Delete Mutation Error]:', error);
      showAlert('Error', 'Failed to remove campaign. Please try again.', 'error');
    }
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      hyperlink: '',
      banner_url: '',
      institution_id: null,
      target_audience: 'all',
      ad_pricing_type: 'both',
      paid_amount: '5000',
      cost_per_click: '2.50',
      cost_per_view: '0.20',
    });
  };

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning') => {
    setAlert({ visible: true, title, message, type });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Gallery access is required to upload banners.', 'warning');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUpload(result.assets[0]);
    }
  };

  const handleUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setIsUploading(true);
      const uri = asset.uri;
      const fileExt = (asset.fileName?.split('.').pop() || uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
      const fileName = `admin/${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;
      const mimeType = asset.mimeType || (fileExt === 'png' ? 'image/png' : 'image/jpeg');

      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: 'event-banners',
        path: filePath,
        uri,
        mimeType,
        upsert: true,
      });

      setForm({ ...form, banner_url: publicUrl });
      showAlert('Uploaded', 'Ad banner ready!', 'success');
    } catch (err: any) {
      console.error('[Admin Ads Upload Failed]:', err);
      showAlert('Upload Failed', 'Failed to upload banner image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    if (!form.title.trim() || !form.hyperlink.trim()) {
      showAlert('Validation Error', 'Title and Hyperlink are required for sponsored content.', 'warning');
      return;
    }
    createMutation.mutate(form);
  };

  const handleDownloadAdLeads = async (ad: any) => {
    try {
      setExportingAdId(ad.id);

      const { data: leads, error } = await (supabase
        .from('ad_leads') as any)
        .select('*')
        .eq('ad_id', ad.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch campaign leads.');
      }

      // Exclude admin and superadmin roles from export
      const nonAdminLeads = (leads || []).filter((l: any) => {
        const r = (l.user_role || '').toLowerCase();
        return r !== 'admin' && r !== 'superadmin';
      });

      if (nonAdminLeads.length === 0) {
        showAlert('No Leads', `No non-admin leads recorded yet for "${ad.title}".`, 'info');
        return;
      }

      // Format rows: Strictly Name and Phone Number only (no email / mail id)
      const excelRows = nonAdminLeads.map((item: any, index: number) => ({
        'S.No': index + 1,
        'Campaign Title': ad.title || 'Sponsored Campaign',
        'Name': item.user_name || 'App User',
        'Phone Number': item.contact_number || 'Not Provided',
        'User Role': (item.user_role || 'User').toUpperCase(),
        'Interaction Type': (item.action_type || 'Click').toUpperCase(),
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
      const cleanTitle = (ad.title || 'Ad Leads').replace(/[\\/?*\[\]]/g, '').substring(0, 25);
      XLSX.utils.book_append_sheet(wb, ws, cleanTitle);

      const wboutBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const safeTitle = (ad.title || 'Ad').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 18);
      const fileName = `Vidyon_Leads_${safeTitle}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      await saveBase64FileToDevice({
        base64Data: wboutBase64,
        fileName,
        dialogTitle: `Download Leads for "${ad.title}"`
      });
    } catch (err: any) {
      console.error('[Download Ad Leads Error]:', err);
      showAlert('Export Failed', err.message || 'Failed to download Excel sheet.', 'error');
    } finally {
      setExportingAdId(null);
    }
  };

  const totalSponsorBudget = ads.reduce((acc: number, a: any) => acc + (Number(a.paid_amount) || 0), 0);
  const totalRevenueEarned = ads.reduce((acc: number, a: any) => acc + (Number(a.amount_debited) || 0), 0);
  const totalRemainingBudget = ads.reduce((acc: number, a: any) => acc + (Number(a.remaining_balance ?? (a.paid_amount || 0)) || 0), 0);
  const totalClicks = ads.reduce((acc: number, a: any) => acc + (Number(a.clicks_count || a.visits_count) || 0), 0);
  const totalViews = ads.reduce((acc: number, a: any) => acc + (Number(a.views_count) || 0), 0);

  return (
    <View style={styles.container}>
      <PageHeader title="Ad Management" subtitle="Control global sponsored carousel content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sponsor Financial Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.revTitle}>Sponsor Ad Revenue</Text>
              <Text style={styles.revSubtitle}>No due dates • Debited by views & clicks until depleted</Text>
            </View>
          </View>

          <View style={styles.revGrid}>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Total Paid</Text>
              <Text style={styles.revItemValue}>₹{totalSponsorBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Earned (Debited)</Text>
              <Text style={[styles.revItemValue, { color: '#10B981' }]}>₹{totalRevenueEarned.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Remaining</Text>
              <Text style={[styles.revItemValue, { color: '#F59E0B' }]}>₹{totalRemainingBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Views / Clicks</Text>
              <Text style={styles.revItemValue}>{totalViews} / {totalClicks}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campaigns ({ads.length})</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.leadsBtn} 
              onPress={() => router.push('/(root)/admin/ads/leads')}
            >
              <Text style={styles.leadsBtnText}>User Leads</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.addBtnText}>+ New Campaign</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
        ) : ads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active sponsored campaigns.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.emptyActionText}>Launch first campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ads.map((ad) => {
            const isExhausted = Number(ad.paid_amount) > 0 && (Number(ad.remaining_balance) <= 0 || (Number(ad.amount_debited) >= Number(ad.paid_amount)));
            const audienceObj = TARGET_AUDIENCES.find(t => t.id === ad.target_audience) || TARGET_AUDIENCES[0];
            
            return (
              <View key={ad.id} style={styles.adCard}>
                <View style={styles.adThumb}>
                  {ad.banner_url ? (
                    <Image source={{ uri: ad.banner_url }} style={styles.thumbImage} />
                  ) : (
                    <Text style={styles.thumbPlaceholderText}>AD</Text>
                  )}
                </View>
                <View style={styles.adInfo}>
                  <View style={styles.adHeaderRow}>
                    <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                    <TouchableOpacity onPress={() => deleteMutation.mutate(ad.id)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.adMeta}>
                    {isExhausted ? (
                      <View style={[styles.sponsoredBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.sponsoredText, { color: '#D97706' }]}>BUDGET EXHAUSTED</Text>
                      </View>
                    ) : (
                      <View style={[styles.sponsoredBadge, { backgroundColor: '#F0FDF4' }]}>
                        <Text style={[styles.sponsoredText, { color: '#10B981' }]}>ACTIVE</Text>
                      </View>
                    )}
                    <View style={[styles.sponsoredBadge, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.sponsoredText, { color: theme.colors.primary }]}>
                        {ad.target_audience ? ad.target_audience.toUpperCase() : 'ALL'}
                      </Text>
                    </View>
                  </View>

                  {/* Pricing and Audience Info */}
                  <View style={styles.adAudienceRow}>
                    <View style={styles.audienceChip}>
                      <Text style={styles.audienceText}>{audienceObj.label}</Text>
                    </View>
                    <View style={styles.pricingChip}>
                      <Text style={styles.pricingTypeText}>
                        {ad.ad_pricing_type === 'click' ? 'Click Ad (PPC)' : ad.ad_pricing_type === 'view' ? 'View Ad (PPV)' : 'Hybrid (View + Click)'}
                      </Text>
                    </View>
                  </View>

                  {/* Financial breakdown box */}
                  <View style={styles.adFinanceBox}>
                    <View style={styles.adFinanceRow}>
                      <View>
                        <Text style={styles.financeLabel}>Paid Budget</Text>
                        <Text style={styles.financeValue}>₹{Number(ad.paid_amount || 0).toLocaleString()}</Text>
                      </View>
                      <View>
                        <Text style={styles.financeLabel}>View / Click</Text>
                        <Text style={styles.financeValue}>
                          ₹{Number(ad.cost_per_view || 0.2).toFixed(2)} / ₹{Number(ad.cost_per_click || ad.cost_per_visit || 2.5).toFixed(2)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.financeLabel}>Views / Clicks</Text>
                        <Text style={styles.financeValue}>{ad.views_count || 0} / {ad.clicks_count || ad.visits_count || 0}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.financeLabel}>Remaining</Text>
                        <Text style={[styles.financeValue, { color: isExhausted ? '#EF4444' : '#10B981' }]}>
                          ₹{Math.max(0, Number(ad.remaining_balance ?? (ad.paid_amount || 0))).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    {Number(ad.paid_amount) > 0 && (
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${Math.min(100, Math.round(((Number(ad.amount_debited) || 0) / Number(ad.paid_amount)) * 100))}%` }
                          ]} 
                        />
                      </View>
                    )}
                  </View>

                  <Text style={styles.adDesc} numberOfLines={2}>{ad.description}</Text>
                  <View style={styles.linkRow}>
                    <Text style={styles.linkText} numberOfLines={1}>{ad.hyperlink}</Text>
                  </View>

                  {/* Specific Campaign Leads Actions (Text only) */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity 
                      style={styles.actionBtnLeads}
                      onPress={() => router.push({
                        pathname: '/(root)/admin/ads/leads',
                        params: { adId: ad.id }
                      })}
                    >
                      <Text style={styles.actionBtnLeadsText}>View Leads</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtnDownload}
                      disabled={exportingAdId === ad.id}
                      onPress={() => handleDownloadAdLeads(ad)}
                    >
                      {exportingAdId === ad.id ? (
                        <ActivityIndicator size="small" color="#059669" />
                      ) : (
                        <Text style={styles.actionBtnDownloadText}>Export XLSX</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Creation Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sponsored Campaign</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* No Due Date Notice */}
              <View style={styles.noDueDateNotice}>
                <Text style={styles.noDueDateText}>
                  No Due Date: Ad runs indefinitely across months and will only end when the paid amount is 100% depleted.
                </Text>
              </View>

              <Text style={styles.label}>CAMPAIGN TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50% Off Vidyon Pro Coaching"
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />

              <Text style={styles.label}>NARRATIVE / DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write compelling ad copy..."
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />

              <Text style={styles.label}>TARGET DASHBOARD / AUDIENCE</Text>
              <View style={styles.institutionPickerContainer}>
                {TARGET_AUDIENCES.map((aud) => {
                  const isActive = form.target_audience === aud.id;
                  return (
                    <TouchableOpacity 
                      key={aud.id}
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      onPress={() => setForm({ ...form, target_audience: aud.id as any })}
                    >
                      <Text style={[styles.pickerItemText, isActive && styles.pickerItemTextActive]}>
                        {aud.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>AD PRICING MODEL</Text>
              <View style={styles.institutionPickerContainer}>
                {PRICING_TYPES.map((pt) => {
                  const isActive = form.ad_pricing_type === pt.id;
                  return (
                    <TouchableOpacity 
                      key={pt.id}
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      onPress={() => setForm({ ...form, ad_pricing_type: pt.id as any })}
                    >
                      <Text style={[styles.pickerItemText, isActive && styles.pickerItemTextActive]}>
                        {pt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>TARGET INSTITUTION (OPTIONAL)</Text>
              <View style={styles.institutionPickerContainer}>
                <TouchableOpacity 
                  style={[styles.pickerItem, !form.institution_id && styles.pickerItemActive]}
                  onPress={() => setForm({ ...form, institution_id: null })}
                >
                  <Text style={[styles.pickerItemText, !form.institution_id && styles.pickerItemTextActive]}>Global (All Schools)</Text>
                </TouchableOpacity>
                
                {institutions.map((inst) => (
                  <TouchableOpacity 
                    key={inst.id}
                    style={[styles.pickerItem, form.institution_id === inst.id && styles.pickerItemActive]}
                    onPress={() => setForm({ ...form, institution_id: inst.id })}
                  >
                    <Text style={[styles.pickerItemText, form.institution_id === inst.id && styles.pickerItemTextActive]}>
                      {inst.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>CAMPAIGN BANNER (OPTIONAL)</Text>
              <TouchableOpacity 
                style={styles.imagePickerBtn} 
                onPress={pickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : form.banner_url ? (
                  <View style={styles.bannerPreviewContainer}>
                    <Text style={styles.bannerOkText}>Banner Uploaded (Tap to Change)</Text>
                  </View>
                ) : (
                  <Text style={styles.imagePickerText}>Select Ad Banner Image</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>DESTINATION URL (REQUIRED)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://vidyon.in/offers/..."
                autoCapitalize="none"
                keyboardType="url"
                value={form.hyperlink}
                onChangeText={(t) => setForm({ ...form, hyperlink: t })}
              />

              <Text style={styles.label}>SPONSOR PAID AMOUNT / BUDGET (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={form.paid_amount}
                onChangeText={(t) => setForm({ ...form, paid_amount: t })}
              />

              {form.ad_pricing_type !== 'click' && (
                <>
                  <Text style={styles.label}>PRICE PER VIEW / IMPRESSION (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 0.20"
                    keyboardType="numeric"
                    value={form.cost_per_view}
                    onChangeText={(t) => setForm({ ...form, cost_per_view: t })}
                  />
                </>
              )}

              {form.ad_pricing_type !== 'view' && (
                <>
                  <Text style={styles.label}>PRICE PER CLICK / VISIT (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2.50"
                    keyboardType="numeric"
                    value={form.cost_per_click}
                    onChangeText={(t) => setForm({ ...form, cost_per_click: t })}
                  />
                </>
              )}

              <Text style={styles.helperText}>
                • Views & clicks are debited with frequency balancing.
                {'\n'}• Opening or closing the app repeatedly does NOT deduct money.
                {'\n'}• Ad will be shown until this balance is 100% depleted.
              </Text>

              <TouchableOpacity 
                style={[styles.submitBtn, (createMutation.isPending || isUploading) && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending || isUploading}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Launch Sponsored Content</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },
  leadsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  leadsBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 13 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: theme.colors.textMuted, marginTop: 16 },
  emptyAction: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: 'rgba(250, 183, 90, 0.1)', borderRadius: 12 },
  emptyActionText: { color: theme.colors.primary, fontWeight: 'bold' },
  adCard: { backgroundColor: 'white', borderRadius: 20, marginBottom: 16, flexDirection: 'row', padding: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  adThumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  adInfo: { flex: 1 },
  adHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  adTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  adMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adDateText: { fontSize: 11, color: theme.colors.textMuted },
  sponsoredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sponsoredText: { fontSize: 9, fontWeight: '800', color: '#10B981' },
  adDesc: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.8 },
  linkText: { fontSize: 11, color: theme.colors.primary, textDecorationLine: 'underline' },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnLeads: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLeadsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionBtnDownload: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDownloadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: theme.colors.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  dateSelectorText: { fontSize: 15, color: theme.colors.text },
  imagePickerBtn: {
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  imagePickerText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  bannerPreviewContainer: { alignItems: 'center' },
  bannerOkText: { color: '#10B981', fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 18, marginTop: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  institutionPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerItemActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  pickerItemText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  pickerItemTextActive: {
    color: theme.colors.primary,
  },
  revenueCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  revHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  revIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  revSubtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  revGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  revItem: { width: '47%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14 },
  revItemLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' },
  revItemValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  adFinanceBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  adFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeLabel: { fontSize: 9, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' },
  financeValue: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  noDueDateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  noDueDateText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  adAudienceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audienceText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  pricingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pricingTypeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  thumbPlaceholderText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -3,
    textAlign: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
