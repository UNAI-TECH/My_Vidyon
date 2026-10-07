import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
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
  School, 
  Clock, 
  Calendar,
  X,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';

type EventType = 'holiday' | 'exam' | 'sports' | 'cultural' | 'other';

export default function InstitutionEvents() {
  const { user, institutionUuid } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'other' as EventType,
    event_date: new Date(),
    end_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 1 day
    hyperlink: '',
    banner_url: '',
    category: 'academic',
  });

  // Alert State
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' | 'warning' });

  // Fetch Events (excluding sponsored ads)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['academic-events', institutionUuid],
    queryFn: async () => {
      if (!institutionUuid) return [];
      const { data, error } = await (supabase
        .from('academic_events') as any)
        .select('*')
        .eq('institution_id', institutionUuid)
        .neq('event_type', 'sponsored')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return (data as any[] || []).filter(e => e.event_type !== 'sponsored' && !e.is_admin_added);
    },
    enabled: !!institutionUuid,
  });

  // Create Event Mutation
  const createMutation = useMutation({
    mutationFn: async (newEvent: any) => {
      const { error } = await (supabase
        .from('academic_events') as any)
        .insert([{
          ...newEvent,
          institution_id: institutionUuid,
          start_date: newEvent.event_date.toISOString(),
          end_date: newEvent.end_date.toISOString(),
          event_date: format(newEvent.event_date, 'yyyy-MM-dd')
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events', institutionUuid] });
      setIsModalVisible(false);
      resetForm();
      showAlert('Success', 'Event added to the calendar!', 'success');
    },
    onError: (error: any) => {
      console.error('[Institution Events Create Mutation Error]:', error);
      showAlert('Error', 'Failed to schedule event. Please try again.', 'error');
    }
  });

  // Delete Event Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('academic_events') as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events', institutionUuid] });
      showAlert('Deleted', 'Event has been removed.', 'success');
    },
    onError: (error: any) => {
      console.error('[Institution Events Delete Mutation Error]:', error);
      showAlert('Error', 'Failed to remove event. Please try again.', 'error');
    }
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      event_type: 'other',
      event_date: new Date(),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      hyperlink: '',
      banner_url: '',
      category: 'academic',
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
      const fileName = `${institutionUuid}/${Date.now()}.${fileExt}`;
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
      showAlert('Uploaded', 'Banner image ready!', 'success');
    } catch (err: any) {
      console.error('[Institution Events Upload Failed]:', err);
      showAlert('Upload Failed', 'Failed to upload banner image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    if (!form.title.trim()) {
      showAlert('Validation Error', 'Please provide a title for the event.', 'warning');
      return;
    }
    createMutation.mutate(form);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const pickerType = showDatePicker;
    setShowDatePicker(null);
    if (selectedDate && pickerType) {
      if (pickerType === 'start') {
        setForm({ ...form, event_date: selectedDate });
      } else {
        setForm({ ...form, end_date: selectedDate });
      }
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const pickerType = showTimePicker;
    setShowTimePicker(null);
    if (selectedDate && pickerType) {
      if (pickerType === 'start') {
        const updated = new Date(form.event_date);
        updated.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setForm({ ...form, event_date: updated });
      } else {
        const updated = new Date(form.end_date);
        updated.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setForm({ ...form, end_date: updated });
      }
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Academic Events" subtitle="Manage school calendar & dashboard highlights" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Events ({events.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
            <Megaphone size={20} color={theme.colors.primary} />
            <Text style={styles.addBtnText}>New Event</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={64} color={theme.colors.textMuted} opacity={0.2} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No events scheduled yet.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.emptyActionText}>Add your first event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={[styles.typeIndicator, { backgroundColor: getEventTypeColor(event.event_type) }]} />
              <View style={styles.eventInfo}>
                <View style={styles.eventHeaderRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <TouchableOpacity onPress={() => deleteMutation.mutate(event.id)}>
                    <Trash2 size={18} color="#EF4444" opacity={0.7} />
                  </TouchableOpacity>
                </View>
                <View style={styles.eventMeta}>
                  <Clock size={12} color={theme.colors.textMuted} />
                  <Text style={styles.eventDateText}>
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                    {event.end_date ? ` → ${format(new Date(event.end_date), 'MMM d, h:mm a')}` : ''}
                  </Text>
                  <View style={styles.dot} />
                  <School size={12} color={theme.colors.textMuted} />
                  <Text style={styles.eventTypeTag}>{event.event_type.toUpperCase()}</Text>
                  {event.end_date && new Date(event.end_date) < new Date() && (
                    <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#EF4444' }}>ENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
                {event.hyperlink && (
                  <View style={styles.linkContainer}>
                    <ExternalLink size={12} color={theme.colors.primary} />
                    <Text style={styles.linkText} numberOfLines={1}>{event.hyperlink}</Text>
                  </View>
                )}
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
              <Text style={styles.modalTitle}>Schedule New Event</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>EVENT TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Annual Sports Day 2024"
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />

              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide details about the event..."
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />

              <Text style={styles.label}>EVENT TYPE</Text>
              <View style={styles.typeSelector}>
                {(['holiday', 'exam', 'sports', 'cultural', 'other'] as EventType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, form.event_type === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => setForm({ ...form, event_type: type })}
                  >
                    <Text style={[styles.typeBtnText, form.event_type === type && { color: 'white' }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>START DATE & TIME</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.dateSelector, { flex: 1 }]} onPress={() => setShowDatePicker('start')}>
                  <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.dateSelectorText}>{format(form.event_date, 'MMM d, yyyy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateSelector, { flex: 0.6 }]} onPress={() => setShowTimePicker('start')}>
                  <Clock size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.dateSelectorText}>{format(form.event_date, 'h:mm a')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>END DATE & TIME</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.dateSelector, { flex: 1 }]} onPress={() => setShowDatePicker('end')}>
                  <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.dateSelectorText}>{format(form.end_date, 'MMM d, yyyy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateSelector, { flex: 0.6 }]} onPress={() => setShowTimePicker('end')}>
                  <Clock size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.dateSelectorText}>{format(form.end_date, 'h:mm a')}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={showDatePicker === 'start' ? form.event_date : form.end_date}
                  mode="date"
                  onChange={onDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={showTimePicker === 'start' ? form.event_date : form.end_date}
                  mode="time"
                  onChange={onTimeChange}
                />
              )}

              <Text style={styles.label}>EVENT BANNER (OPTIONAL)</Text>
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
                    <Text style={styles.imagePickerText}>Select Banner Image</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>EXTERNAL LINK (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
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
                    <Text style={styles.submitBtnText}>Post Academic Event</Text>
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

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'holiday': return '#F59E0B';
    case 'exam': return '#EF4444';
    case 'sports': return '#10B981';
    case 'cultural': return '#8B5CF6';
    default: return '#3B82F6';
  }
};

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
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  typeIndicator: { width: 10, height: '100%', position: 'absolute', left: 0, top: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  eventThumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  eventInfo: { flex: 1 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  eventDateText: { fontSize: 12, color: theme.colors.textMuted },
  eventTypeTag: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  eventDesc: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 10 },
  linkContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.7 },
  linkText: { fontSize: 11, color: theme.colors.primary, textDecorationLine: 'underline' },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: theme.colors.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
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
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
