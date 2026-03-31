import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  PlusCircle,
  X,
  Layout,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminAdManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: new Date(),
    hyperlink: '',
    banner_url: '',
    institution_id: null as string | null,
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
      const { error } = await (supabase
        .from('academic_events') as any)
        .insert([{
          ...newAd,
          institution_id: newAd.institution_id, 
          is_admin_added: true,
          event_type: 'sponsored',
          start_date: newAd.event_date.toISOString(),
          end_date: newAd.event_date.toISOString(),
          event_date: format(newAd.event_date, 'yyyy-MM-dd')
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-global-ads'] });
      setIsModalVisible(false);
      resetForm();
      showAlert('Success', 'Global sponsored content published!', 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message, 'error');
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
      showAlert('Removed', 'Sponsored content has been withdrawn.', 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message, 'error');
    }
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      event_date: new Date(),
      hyperlink: '',
      banner_url: '',
      institution_id: null,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUpload(result.assets[0].uri);
    }
  };

  const handleUpload = async (uri: string) => {
    try {
      setIsUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase();
      const fileName = `admin/${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      const { data, error } = await (supabase.storage
        .from('event-banners') as any)
        .upload(filePath, formData, {
           upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('event-banners')
        .getPublicUrl(filePath);

      setForm({ ...form, banner_url: publicUrl });
      showAlert('Uploaded', 'Ad banner ready!', 'success');
    } catch (err: any) {
      showAlert('Upload Failed', err.message, 'error');
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm({ ...form, event_date: selectedDate });
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Ad Management" subtitle="Control global sponsored carousel content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Campaigns ({ads.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
            <PlusCircle size={20} color={theme.colors.primary} />
            <Text style={styles.addBtnText}>New Campaign</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
        ) : ads.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={64} color={theme.colors.textMuted} opacity={0.2} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No active sponsored campaigns.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.emptyActionText}>Launch first campaign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ads.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
            <View style={styles.adThumb}>
              {ad.banner_url ? (
                <Image source={{ uri: ad.banner_url }} style={styles.thumbImage} />
              ) : (
                <Layout size={20} color={theme.colors.primary} opacity={0.5} />
              )}
            </View>
              <View style={styles.adInfo}>
                <View style={styles.adHeaderRow}>
                  <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                  <TouchableOpacity onPress={() => deleteMutation.mutate(ad.id)}>
                    <Trash2 size={18} color="#EF4444" opacity={0.7} />
                  </TouchableOpacity>
                </View>
                <View style={styles.adMeta}>
                  <Clock size={12} color={theme.colors.textMuted} />
                  <Text style={styles.adDateText}>
                    Starts: {format(new Date(ad.event_date), 'MMM d, yyyy')}
                  </Text>
                  <View style={[styles.sponsoredBadge, ad.institution_id && { backgroundColor: '#EFF6FF' }]}>
                    <ShieldCheck size={10} color={ad.institution_id ? theme.colors.primary : "#10B981"} />
                    <Text style={[styles.sponsoredText, ad.institution_id && { color: theme.colors.primary }]}>
                      {ad.institution_id ? `FOR: ${ad.institutions?.name}` : 'GLOBAL SPONSOR'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.adDesc} numberOfLines={2}>{ad.description}</Text>
                <View style={styles.linkRow}>
                  <ExternalLink size={12} color={theme.colors.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>{ad.hyperlink}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
        <Plus color="white" size={32} />
      </TouchableOpacity>

      {/* Creation Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sponsored Campaign</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>CAMPAIGN TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50% Off Vidyon Pro"
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

              <Text style={styles.label}>START DATE</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Clock size={20} color={theme.colors.primary} />
                <Text style={styles.dateSelectorText}>{format(form.event_date, 'MMMM do, yyyy')}</Text>
              </TouchableOpacity>

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

              {showDatePicker && (
                <DateTimePicker
                  value={form.event_date}
                  mode="date"
                  onChange={onDateChange}
                />
              )}

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
                    <Text style={styles.bannerOkText}>Banner Uploaded ✓</Text>
                  </View>
                ) : (
                  <>
                    <ImageIcon size={20} color={theme.colors.textMuted} />
                    <Text style={styles.imagePickerText}>Select Ad Banner Image</Text>
                  </>
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

              <TouchableOpacity 
                style={[styles.submitBtn, (createMutation.isPending || isUploading) && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending || isUploading}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <UploadCloud size={20} color="white" />
                    <Text style={styles.submitBtnText}>Launch Sponsored Content</Text>
                  </>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnText: { color: theme.colors.primary, fontWeight: 'bold' },
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
});
