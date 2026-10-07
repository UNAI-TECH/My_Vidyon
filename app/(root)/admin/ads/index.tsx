import React, { useState, useMemo, useEffect } from 'react';
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
import { logAuditEvent } from '../../../../src/utils/auditLogger';
import { LargeSecureStore } from '../../../../src/lib/storage';
import { 
  Building, 
  Globe, 
  DollarSign, 
  TrendingUp, 
  Filter, 
  ShieldCheck, 
  CheckCircle,
  Sliders,
  Maximize2,
  RotateCcw,
  FileText,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  X
} from 'lucide-react-native';

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

// Constant Standard Limits Enforced for Every Ad
export const CONSTANT_TITLE_LIMIT = 60;
export const CONSTANT_DESC_LIMIT = 180;
export const CONSTANT_ASPECT_RATIO = '16:9';
export const CONSTANT_TARGET_RATIO = 16 / 9; // ~1.7778
export const CONSTANT_MAX_BANNER_SIZE_MB = 5;

export default function AdminAdManagement() {
  const { user, role, institutionId, institutionUuid, institutionName } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportingAdId, setExportingAdId] = useState<string | null>(null);

  const isUUID = (str: string | null | undefined): boolean => 
    !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Check if current user is an institution-scoped ad manager
  const isScoped = !!institutionId && institutionId !== 'global' && role !== 'superadmin';
  const [filterInstitutionId, setFilterInstitutionId] = useState<string | null>(null);

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

  // Strict live banner & text validation states
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerDimensions, setBannerDimensions] = useState<{ width: number; height: number; ratio: number } | null>(null);

  const isTitleExceeded = form.title.length > CONSTANT_TITLE_LIMIT;
  const isDescExceeded = form.description.length > CONSTANT_DESC_LIMIT;
  const isBannerInvalid = !!bannerError;
  const hasValidationErrors = isTitleExceeded || isDescExceeded || isBannerInvalid;

  // Fetch All Institutions for targeting & revenue distribution
  const { data: institutions = [] } = useQuery({
    queryKey: ['all-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, institution_id, name, city');
      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Compute current scoped institution UUID (academic_events requires a valid UUID or null)
  const currentScopedUuid = useMemo(() => {
    if (!isScoped) return null;
    if (institutionUuid && isUUID(institutionUuid)) return institutionUuid;
    if (institutionId && isUUID(institutionId)) return institutionId;
    const matched = institutions.find((i: any) => i.institution_id === institutionId || i.id === institutionId);
    return matched?.id || null;
  }, [isScoped, institutionUuid, institutionId, institutions]);

  // Fetch Global or Scoped Ads based on user role and assignment
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['admin-global-ads', isScoped, institutionId, currentScopedUuid],
    queryFn: async () => {
      let q = (supabase
        .from('academic_events') as any)
        .select('*, institutions:institution_id(id, institution_id, name)')
        .eq('is_admin_added', true);

      if (isScoped) {
        let targetUuid = currentScopedUuid;
        if (!targetUuid && institutionId) {
          if (isUUID(institutionId)) {
            targetUuid = institutionId;
          } else {
            const { data } = await (supabase.from('institutions') as any).select('id').eq('institution_id', institutionId).maybeSingle();
            targetUuid = (data as any)?.id || null;
          }
        }
        if (targetUuid) {
          q = q.eq('institution_id', targetUuid);
        }
      }

      const { data, error } = await q.order('created_at', { ascending: false });
      
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

      // Resolve UUID for academic_events.institution_id (UUID foreign key or null)
      let finalInstitutionUuid: string | null = null;
      if (isScoped) {
        finalInstitutionUuid = currentScopedUuid;
        if (!finalInstitutionUuid && institutionId) {
          if (isUUID(institutionId)) {
            finalInstitutionUuid = institutionId;
          } else {
            const { data } = await (supabase.from('institutions') as any).select('id').eq('institution_id', institutionId).maybeSingle();
            finalInstitutionUuid = (data as any)?.id || null;
          }
        }
      } else if (newAd.institution_id && newAd.institution_id !== 'global') {
        if (isUUID(newAd.institution_id)) {
          finalInstitutionUuid = newAd.institution_id;
        } else {
          const matched = institutions.find((i: any) => i.institution_id === newAd.institution_id || i.id === newAd.institution_id);
          finalInstitutionUuid = matched?.id || null;
        }
      }

      const { data: inserted, error } = await (supabase
        .from('academic_events') as any)
        .insert([{
          title: newAd.title,
          description: newAd.description,
          hyperlink: newAd.hyperlink,
          banner_url: newAd.banner_url,
          institution_id: finalInstitutionUuid,
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
          end_date: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          event_date: format(new Date(), 'yyyy-MM-dd')
        }])
        .select()
        .single();

      if (error) throw error;
      return { inserted, newAd, assignedInstId: finalInstitutionUuid, paid };
    },
    onSuccess: async (data: any) => {
      await logAuditEvent({
        action: 'CREATE_AD',
        entityType: 'ad',
        entityId: data?.inserted?.id || data?.newAd?.title,
        institutionId: data?.assignedInstId || 'global',
        actorId: user?.id,
        actorEmail: user?.email,
        details: {
          title: data?.newAd?.title,
          paid_amount: data?.paid,
          is_scoped: isScoped,
          institution_id: data?.assignedInstId,
        }
      });

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
      return id;
    },
    onSuccess: async (deletedId: string) => {
      await logAuditEvent({
        action: 'DELETE_AD',
        entityType: 'ad',
        entityId: deletedId,
        institutionId: isScoped && (currentScopedUuid || institutionId) ? (currentScopedUuid || institutionId)! : 'global',
        actorId: user?.id,
        actorEmail: user?.email,
        details: { ad_id: deletedId }
      });

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
    setBannerError(null);
    setBannerDimensions(null);
  };

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning') => {
    setAlert({ visible: true, title, message, type });
  };

  const pickImage = async () => {
    setBannerError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Gallery access is required to upload banners.', 'warning');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // 1. File size validation (Strict constant limit 5MB)
      if (asset.fileSize && asset.fileSize > CONSTANT_MAX_BANNER_SIZE_MB * 1024 * 1024) {
        const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(1);
        const err = `Selected banner (${sizeMb} MB) exceeds maximum allowed size of ${CONSTANT_MAX_BANNER_SIZE_MB} MB. Please compress or choose a smaller image.`;
        setBannerError(err);
        showAlert('Banner Too Large', err, 'error');
        return;
      }

      // 2. Strict Aspect Ratio Validation (Strict 16:9 check)
      let imgWidth = asset.width || 0;
      let imgHeight = asset.height || 0;

      if (!imgWidth || !imgHeight) {
        try {
          const dims = await new Promise<{ width: number; height: number }>((resolve) => {
            if (typeof window !== 'undefined' && (window as any).Image) {
              const img = new (window as any).Image();
              img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
              img.onerror = () => resolve({ width: 0, height: 0 });
              img.src = asset.uri;
            } else {
              Image.getSize(asset.uri, (w, h) => resolve({ width: w, height: h }), () => resolve({ width: 0, height: 0 }));
            }
          });
          imgWidth = dims.width;
          imgHeight = dims.height;
        } catch {
          // ignore
        }
      }

      if (imgWidth > 0 && imgHeight > 0) {
        const actualRatio = imgWidth / imgHeight;
        setBannerDimensions({ width: imgWidth, height: imgHeight, ratio: actualRatio });

        // Tolerance check: must be strictly 16:9 (1.7778) within 0.08
        if (Math.abs(actualRatio - CONSTANT_TARGET_RATIO) > 0.08) {
          const err = `Invalid Aspect Ratio! Uploaded image is ${actualRatio.toFixed(2)}:1 (${imgWidth}x${imgHeight}px), but strictly 16:9 (1.78:1) landscape format is required. Please upload a 16:9 image.`;
          setBannerError(err);
          showAlert('Invalid Aspect Ratio', err, 'error');
          return;
        }
      }

      setBannerError(null);
      handleUpload(asset);
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
      showAlert('Uploaded', '16:9 Ad banner uploaded & verified successfully!', 'success');
    } catch (err: any) {
      console.error('[Admin Ads Upload Failed]:', err);
      showAlert('Upload Failed', 'Failed to upload banner image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    const trimmedTitle = form.title.trim();
    const trimmedHyperlink = form.hyperlink.trim();
    const trimmedDesc = form.description.trim();

    if (!trimmedTitle || !trimmedHyperlink) {
      showAlert('Validation Error', 'Title and Hyperlink are required for sponsored content.', 'warning');
      return;
    }

    if (form.title.length > CONSTANT_TITLE_LIMIT) {
      showAlert(
        'Title Limit Exceeded', 
        `Title is ${form.title.length} characters, which exceeds the constant limit of ${CONSTANT_TITLE_LIMIT} characters. Please shorten it.`, 
        'error'
      );
      return;
    }

    if (form.description.length > CONSTANT_DESC_LIMIT) {
      showAlert(
        'Description Limit Exceeded', 
        `Description is ${form.description.length} characters, which exceeds the constant limit of ${CONSTANT_DESC_LIMIT} characters. Please shorten it.`, 
        'error'
      );
      return;
    }

    if (bannerError) {
      showAlert('Invalid Banner', bannerError, 'error');
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

      await logAuditEvent({
        action: 'EXPORT_AD_LEADS',
        entityType: 'leads',
        entityId: ad.id,
        institutionId: ad.institution_id || (isScoped ? institutionId : 'global'),
        actorId: user?.id,
        actorEmail: user?.email,
        details: {
          ad_id: ad.id,
          ad_title: ad.title,
          exported_count: nonAdminLeads.length
        }
      });
    } catch (err: any) {
      console.error('[Download Ad Leads Error]:', err);
      showAlert('Export Failed', err.message || 'Failed to download Excel sheet.', 'error');
    } finally {
      setExportingAdId(null);
    }
  };

  // Filtered ads for global view or scoped view
  const displayedAds = useMemo(() => {
    if (isScoped) return ads;
    if (!filterInstitutionId) return ads;
    if (filterInstitutionId === 'global') return ads.filter((a: any) => !a.institution_id);
    return ads.filter((a: any) => a.institution_id === filterInstitutionId);
  }, [ads, isScoped, filterInstitutionId]);

  // Out-of-credit ads that ran out of money (exhausted budget)
  const outOfCreditAds = useMemo(() => {
    return displayedAds.filter((a: any) => 
      Number(a.paid_amount) > 0 && 
      (Number(a.remaining_balance) <= 0 || Number(a.amount_debited) >= Number(a.paid_amount))
    );
  }, [displayedAds]);

  const totalSponsorBudget = displayedAds.reduce((acc: number, a: any) => acc + (Number(a.paid_amount) || 0), 0);
  const totalRevenueEarned = displayedAds.reduce((acc: number, a: any) => acc + (Number(a.amount_debited) || 0), 0);
  const totalRemainingBudget = displayedAds.reduce((acc: number, a: any) => acc + (Number(a.remaining_balance ?? (a.paid_amount || 0)) || 0), 0);
  const totalClicks = displayedAds.reduce((acc: number, a: any) => acc + (Number(a.clicks_count || a.visits_count) || 0), 0);
  const totalViews = displayedAds.reduce((acc: number, a: any) => acc + (Number(a.views_count) || 0), 0);

  // Revenue Sharing (30% platform margin, 70% institutional revenue share)
  const platformRevenueShare = Math.round(totalRevenueEarned * 0.3);
  const institutionsRevenueShare = Math.round(totalRevenueEarned * 0.7);

  // Institution-wise breakdown for Global Ad Manager
  const institutionBreakdown = useMemo(() => {
    if (isScoped) return [];
    return institutions.map((inst: any) => {
      const instAds = ads.filter((a: any) => a.institution_id === inst.id || a.institution_id === inst.institution_id);
      const instEarned = instAds.reduce((acc: number, a: any) => acc + (Number(a.amount_debited) || 0), 0);
      const instViews = instAds.reduce((acc: number, a: any) => acc + (Number(a.views_count) || 0), 0);
      const instClicks = instAds.reduce((acc: number, a: any) => acc + (Number(a.clicks_count || a.visits_count) || 0), 0);
      const instShare = Math.round(instEarned * 0.7);
      return {
        id: inst.id,
        institution_id: inst.institution_id,
        name: inst.name,
        city: inst.city,
        adsCount: instAds.length,
        earned: instEarned,
        views: instViews,
        clicks: instClicks,
        share: instShare,
      };
    }).filter(item => item.adsCount > 0 || item.earned > 0);
  }, [ads, institutions, isScoped]);

  return (
    <View style={styles.container}>
      <PageHeader
        title={isScoped ? "Campus Ad Management" : "Ad Management"}
        subtitle={isScoped ? `Managing sponsored campaigns for ${institutionName || institutionId}` : "Control global & campus sponsored carousel content and revenues"}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Scoped Campus Badge if scoped */}
        {isScoped && (
          <View style={styles.scopedCampusBanner}>
            <Building size={20} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.scopedCampusTitle}>Scoped Campus Authority</Text>
              <Text style={styles.scopedCampusDesc}>
                You have permission to create, run, and track ads exclusively for <Text style={{ fontWeight: 'bold' }}>{institutionName || institutionId}</Text>. Financial earnings below represent this campus's revenue.
              </Text>
            </View>
          </View>
        )}

        {/* Sponsor Financial Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.revTitle}>
                {isScoped ? "Campus Ad Financial Performance" : "Sponsor Ad Revenue & Financial Reports"}
              </Text>
              <Text style={styles.revSubtitle}>
                {isScoped
                  ? "Calculated from impressions & clicks on your institution's dashboards"
                  : "Platform-wide debited ad revenue • 70% Institutional Revenue Share"}
              </Text>
            </View>
          </View>

          <View style={styles.revGrid}>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Total Ad Budget</Text>
              <Text style={styles.revItemValue}>₹{totalSponsorBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Earned (Debited)</Text>
              <Text style={[styles.revItemValue, { color: '#10B981' }]}>₹{totalRevenueEarned.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Remaining Balance</Text>
              <Text style={[styles.revItemValue, { color: '#F59E0B' }]}>₹{totalRemainingBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.revItem}>
              <Text style={styles.revItemLabel}>Views / Clicks</Text>
              <Text style={styles.revItemValue}>{totalViews} / {totalClicks}</Text>
            </View>
          </View>

          {/* Revenue Share Split (Visible in Global mode or Campus payout) */}
          <View style={styles.revSplitRow}>
            <View style={styles.revSplitBox}>
              <Text style={styles.revSplitLabel}>
                {isScoped ? "Campus Revenue Share (70%)" : "Total Institutions' Share (70%)"}
              </Text>
              <Text style={styles.revSplitValueHighlight}>
                ₹{institutionsRevenueShare.toLocaleString()}
              </Text>
              <Text style={styles.revSplitSub}>Direct campus ad dividend</Text>
            </View>

            {!isScoped && (
              <View style={styles.revSplitBox}>
                <Text style={styles.revSplitLabel}>Platform Share (30%)</Text>
                <Text style={[styles.revSplitValueHighlight, { color: theme.colors.primary }]}>
                  ₹{platformRevenueShare.toLocaleString()}
                </Text>
                <Text style={styles.revSplitSub}>Infrastructure & ad-serving</Text>
              </View>
            )}
          </View>
        </View>

        {/* Institution-Wise Revenue Breakdown Table (Global Mode Only) */}
        {!isScoped && institutionBreakdown.length > 0 && (
          <View style={styles.institutionBreakdownCard}>
            <View style={styles.breakdownHeader}>
              <Building size={16} color={theme.colors.primary} />
              <Text style={styles.breakdownTitle}>Institution Revenue Breakdown</Text>
            </View>
            <Text style={styles.breakdownSubtitle}>
              Revenue generated and dividend share distributed per institution:
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCol, { width: 180, fontWeight: '700' }]}>Institution</Text>
                  <Text style={[styles.tableCol, { width: 80, textAlign: 'center', fontWeight: '700' }]}>Ads</Text>
                  <Text style={[styles.tableCol, { width: 90, textAlign: 'center', fontWeight: '700' }]}>Views</Text>
                  <Text style={[styles.tableCol, { width: 80, textAlign: 'center', fontWeight: '700' }]}>Clicks</Text>
                  <Text style={[styles.tableCol, { width: 110, textAlign: 'right', fontWeight: '700' }]}>Gross Debited</Text>
                  <Text style={[styles.tableCol, { width: 120, textAlign: 'right', fontWeight: '700', color: '#059669' }]}>Campus Share (70%)</Text>
                </View>

                {institutionBreakdown.map((row: any) => (
                  <View key={row.id} style={styles.tableDataRow}>
                    <View style={{ width: 180 }}>
                      <Text style={styles.instNameText} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.instCodeText}>{row.city || 'India'} • {row.institution_id}</Text>
                    </View>
                    <Text style={[styles.tableCol, { width: 80, textAlign: 'center' }]}>{row.adsCount}</Text>
                    <Text style={[styles.tableCol, { width: 90, textAlign: 'center' }]}>{row.views.toLocaleString()}</Text>
                    <Text style={[styles.tableCol, { width: 80, textAlign: 'center' }]}>{row.clicks.toLocaleString()}</Text>
                    <Text style={[styles.tableCol, { width: 110, textAlign: 'right', fontWeight: '600' }]}>₹{row.earned.toLocaleString()}</Text>
                    <Text style={[styles.tableCol, { width: 120, textAlign: 'right', fontWeight: '700', color: '#059669' }]}>₹{row.share.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Global Filter Chips Toolbar */}
        {!isScoped && (
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.filterChip, !filterInstitutionId && styles.filterChipActive]}
                onPress={() => setFilterInstitutionId(null)}
              >
                <Text style={[styles.filterChipText, !filterInstitutionId && styles.filterChipTextActive]}>
                  All Campaigns ({ads.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filterInstitutionId === 'global' && styles.filterChipActive]}
                onPress={() => setFilterInstitutionId('global')}
              >
                <Globe size={13} color={filterInstitutionId === 'global' ? '#FFF' : '#64748B'} />
                <Text style={[styles.filterChipText, filterInstitutionId === 'global' && styles.filterChipTextActive]}>
                  Global Generic ({ads.filter((a: any) => !a.institution_id).length})
                </Text>
              </TouchableOpacity>

              {institutions.map((inst: any) => {
                const count = ads.filter((a: any) => a.institution_id === inst.id || a.institution_id === inst.institution_id).length;
                if (count === 0) return null;
                const isSelected = filterInstitutionId === inst.id || filterInstitutionId === inst.institution_id;
                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setFilterInstitutionId(inst.id)}
                  >
                    <Building size={13} color={isSelected ? '#FFF' : '#64748B'} />
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {inst.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Out-of-Credits Notification Banner for Ad Managers */}
        {outOfCreditAds.length > 0 && (
          <View style={styles.outOfCreditAlertBanner}>
            <View style={styles.outOfCreditHeader}>
              <View style={styles.outOfCreditIconCircle}>
                <AlertTriangle size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.outOfCreditTitle}>
                  ⚠️ {outOfCreditAds.length} Ad Campaign{outOfCreditAds.length > 1 ? 's' : ''} Ran Out of Credits
                </Text>
                <Text style={styles.outOfCreditSubtitle}>
                  This ad ran out of credits and is currently paused from displaying across user feeds. Top up the budget to resume impressions.
                </Text>
              </View>
            </View>

            <View style={styles.outOfCreditList}>
              {outOfCreditAds.map((ad: any) => (
                <View key={ad.id} style={styles.outOfCreditItem}>
                  <Text style={styles.outOfCreditItemTitle} numberOfLines={1}>
                    • {ad.title}
                  </Text>
                  <View style={styles.outOfCreditBadge}>
                    <Text style={styles.outOfCreditBadgeText}>Ran out of credits</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Campaigns ({displayedAds.length})
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
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
        ) : displayedAds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active sponsored campaigns.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.emptyActionText}>Launch first campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedAds.map((ad: any) => {
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
                      <View style={[styles.sponsoredBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                        <Text style={[styles.sponsoredText, { color: '#DC2626', fontWeight: 'bold' }]}>⚠️ OUT OF CREDITS</Text>
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

              {/* Campaign Title */}
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.label}>CAMPAIGN TITLE (MAX {CONSTANT_TITLE_LIMIT} CHARS)</Text>
                <View style={[styles.limitCounterBadge, isTitleExceeded && styles.limitCounterBadgeError]}>
                  <Text style={[
                    styles.limitCounterText,
                    form.title.length > CONSTANT_TITLE_LIMIT * 0.85 && { color: '#F59E0B' },
                    isTitleExceeded && styles.limitCounterTextError
                  ]}>
                    {form.title.length} / {CONSTANT_TITLE_LIMIT}
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, isTitleExceeded && styles.inputError]}
                placeholder="e.g. 50% Off Vidyon Pro Coaching"
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
              {isTitleExceeded && (
                <View style={styles.errorAlertBox}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <Text style={styles.errorAlertText}>
                    Exceeding character limit! Title is {form.title.length} characters (Limit: {CONSTANT_TITLE_LIMIT}). Please remove {form.title.length - CONSTANT_TITLE_LIMIT} characters.
                  </Text>
                </View>
              )}

              {/* Narrative / Description */}
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.label}>NARRATIVE / DESCRIPTION (MAX {CONSTANT_DESC_LIMIT} CHARS)</Text>
                <View style={[styles.limitCounterBadge, isDescExceeded && styles.limitCounterBadgeError]}>
                  <Text style={[
                    styles.limitCounterText,
                    form.description.length > CONSTANT_DESC_LIMIT * 0.85 && { color: '#F59E0B' },
                    isDescExceeded && styles.limitCounterTextError
                  ]}>
                    {form.description.length} / {CONSTANT_DESC_LIMIT}
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, styles.textArea, isDescExceeded && styles.inputError]}
                placeholder="Write compelling ad copy..."
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />
              {isDescExceeded && (
                <View style={styles.errorAlertBox}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <Text style={styles.errorAlertText}>
                    Exceeding character limit! Description is {form.description.length} characters (Limit: {CONSTANT_DESC_LIMIT}). Please remove {form.description.length - CONSTANT_DESC_LIMIT} characters.
                  </Text>
                </View>
              )}

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

              <Text style={styles.label}>
                {isScoped ? "TARGET CAMPUS (LOCKED)" : "TARGET INSTITUTION (OPTIONAL)"}
              </Text>
              {isScoped ? (
                <View style={styles.scopedLockedBanner}>
                  <Building size={16} color="#0284C7" />
                  <Text style={styles.scopedLockedText}>
                    Locked to {institutionName || institutionId} (Campus-restricted access)
                  </Text>
                </View>
              ) : (
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
              )}

              <View style={styles.fieldHeaderRow}>
                <Text style={styles.label}>CAMPAIGN BANNER (REQUIRED 16:9 RATIO)</Text>
                <View style={[styles.ratioEnforcedTag, bannerError && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                  <Text style={[styles.ratioEnforcedText, bannerError && { color: '#DC2626' }]}>
                    Constant: 16:9 • Max: 5MB
                  </Text>
                </View>
              </View>
              <Text style={styles.bannerRuleHint}>
                Standard 16:9 landscape ratio required (e.g. 1920×1080 or 1280×720, max 5MB). Other aspect ratios or oversize images are rejected.
              </Text>

              {bannerError && (
                <View style={[styles.errorAlertBox, { marginBottom: 10 }]}>
                  <AlertTriangle size={15} color="#DC2626" />
                  <Text style={styles.errorAlertText}>{bannerError}</Text>
                </View>
              )}

              {form.banner_url ? (
                <View style={styles.bannerPreviewBox}>
                  <Image source={{ uri: form.banner_url }} style={styles.bannerPreviewImg} />
                  <View style={styles.bannerRatioBadge}>
                    <Text style={styles.bannerRatioBadgeText}>✓ Strict 16:9 Verified</Text>
                  </View>
                  <View style={styles.bannerActionsOverlay}>
                    <TouchableOpacity 
                      style={styles.bannerOverlayBtn}
                      onPress={pickImage}
                      disabled={isUploading}
                    >
                      <Text style={styles.bannerOverlayBtnText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.bannerOverlayBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                      onPress={() => {
                        setForm({ ...form, banner_url: '' });
                        setBannerError(null);
                        setBannerDimensions(null);
                      }}
                    >
                      <Text style={styles.bannerOverlayBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.imagePickerBtn, bannerError && styles.imagePickerBtnError]} 
                  onPress={pickImage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <ImageIcon size={26} color={bannerError ? '#DC2626' : theme.colors.textMuted} />
                      <Text style={[styles.imagePickerText, bannerError && { color: '#DC2626', fontWeight: 'bold' }]}>
                        {bannerError ? 'Select a Valid 16:9 Image' : 'Select Ad Banner Image'}
                      </Text>
                      <Text style={[styles.imagePickerSubtext, bannerError && { color: '#EF4444' }]}>
                        Locked to strictly 16:9 Landscape ratio • Max 5 MB
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

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
                style={[
                  styles.submitBtn, 
                  hasValidationErrors && styles.submitBtnDisabled,
                  (createMutation.isPending || isUploading) && { opacity: 0.7 }
                ]}
                onPress={handleCreate}
                disabled={createMutation.isPending || isUploading || hasValidationErrors}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : hasValidationErrors ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="white" />
                    <Text style={styles.submitBtnText}>Cannot Launch — Fix Exceeded Limits Above</Text>
                  </View>
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
  scopedCampusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  scopedCampusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  scopedCampusDesc: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 16,
  },
  scopedLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  scopedLockedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },
  revSplitRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  revSplitBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  revSplitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  revSplitValueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 4,
  },
  revSplitSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  institutionBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  breakdownSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCol: {
    fontSize: 12,
    color: theme.colors.text,
  },
  instNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  instCodeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  filterBar: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  limitsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  limitsBtnText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  limitCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  limitCounterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  quickLimitEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  limitCounterBadgeError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  limitCounterTextError: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  errorAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  ratioEnforcedTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  ratioEnforcedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  bannerRuleHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  imagePickerBtnError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  imagePickerSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bannerPreviewBox: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
  },
  bannerPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerRatioBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerRatioBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerActionsOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  bannerOverlayBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerOverlayBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtnDisabled: {
    backgroundColor: '#EF4444',
    opacity: 0.9,
  },
  outOfCreditAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  outOfCreditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  outOfCreditIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfCreditTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  outOfCreditSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginTop: 2,
  },
  outOfCreditList: {
    marginTop: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingTop: 10,
  },
  outOfCreditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  outOfCreditItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
  },
  outOfCreditBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outOfCreditBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
