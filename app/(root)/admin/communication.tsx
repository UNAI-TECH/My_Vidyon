import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { Bell, Send, Users, Smartphone } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/hooks/useAuth';
import { School, ChevronDown, Check, X } from 'lucide-react-native';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { Modal, FlatList } from 'react-native';

interface Institution {
  id: string; 
  institution_id: string; // The Slug (TEXT) used for announcements
  name: string;
}

export default function CommunicationHub() {
  const { institutionId, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState('');
  const [audience, setAudience] = React.useState<'all' | 'institution'>('all');
  const [selectedInstitutionId, setSelectedInstitutionId] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [showInstitutionSelector, setShowInstitutionSelector] = React.useState(false);
  
  // Alert State
  const [alert, setAlert] = React.useState({ visible: false, title: '', message: '', type: 'info' as any });

  const { data: institutions = [] } = useQuery<Institution[]>({
    queryKey: ['institutions-active-v5'], // New key to clear any UUID cache
    queryFn: async () => {
      const { data } = await supabase
        .from('institutions')
        .select('id, institution_id, name')
        .eq('status', 'active');
      return (data as Institution[]) || [];
    },
    staleTime: 0,
    gcTime: 0, // Ensure no old data is kept
    refetchOnMount: 'always'
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const onBlast = async () => {
    if (!message.trim() || !user) return;
    setIsSending(true);
    try {
      const payload: any = {
        title: audience === 'all' ? 'Announcement for ALL' : `Announcement for ${institutions.find(i => i.institution_id === selectedInstitutionId)?.name || 'Institution'}`,
        content: message,
        type: audience === 'all' ? 'all' : 'info',
        created_by: user.id,
        category: 'General'
      };

      if (audience === 'institution' && selectedInstitutionId) {
        payload.institution_id = selectedInstitutionId;
      } else {
        payload.institution_id = null; // System-wide
      }

      const { error } = await supabase
        .from('announcements')
        .insert(payload);
      
      if (!error) {
        setMessage('');
        setSelectedInstitutionId(null);
        setAudience('all');
        showAlert('Success', 'Announcement blasted successfully!', 'success');
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } else {
        showAlert('Error', error.message, 'error');
      }
    } catch (e: any) {
      showAlert('Error', e.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const showAlert = (title: string, message: string, type: any) => {
    setAlert({ visible: true, title, message, type });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Communication Hub</Text>

      <View style={styles.broadcastCard}>
        <View style={styles.cardHeader}>
          <Bell size={24} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.cardHeaderTitle}>New Announcement</Text>
        </View>
        
        <Text style={styles.label}>Audience</Text>
        <View style={styles.audienceSelectors}>
          <TouchableOpacity 
            style={[styles.audienceBtn, audience === 'all' && styles.activeAudience]}
            onPress={() => setAudience('all')}
          >
            <Users size={18} color={audience === 'all' ? "white" : theme.colors.textMuted} {...({} as any)} />
            <Text style={audience === 'all' ? styles.audienceTextActive : styles.audienceText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.audienceBtn, audience === 'institution' && styles.activeAudience]}
            onPress={() => setAudience('institution')}
          >
            <School size={18} color={audience === 'institution' ? "white" : theme.colors.textMuted} {...({} as any)} />
            <Text style={audience === 'institution' ? styles.audienceTextActive : styles.audienceText}>Institutions</Text>
          </TouchableOpacity>
        </View>

        {audience === 'institution' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>Select Institution</Text>
            <TouchableOpacity 
              style={styles.institutionPicker}
              onPress={() => setShowInstitutionSelector(true)}
            >
              <Text style={selectedInstitutionId ? styles.pickerText : styles.pickerPlaceholder}>
                {institutions.find(i => i.institution_id === selectedInstitutionId)?.name || 'Choose an institution...'}
              </Text>
              <ChevronDown size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Message Body</Text>
        <TextInput
          style={styles.messageBox}
          placeholder="Type your announcement here..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity 
          style={[styles.sendBtn, (!message.trim() || isSending) && { opacity: 0.5 }]} 
          onPress={onBlast}
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Send size={20} color="white" {...({} as any)} />
          )}
          <Text style={styles.sendBtnText}>{isSending ? 'Sending...' : 'Blast Announcement'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Broadcasts</Text>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        history.map((item: any) => (
          <View key={item.id} style={styles.historyCard}>
            <Text style={styles.historyTitle}>{item.content}</Text>
            <Text style={styles.historyMeta}>
              Sent {new Date(item.created_at).toLocaleDateString()} • {item.title || 'Audience'}
            </Text>
          </View>
        ))
      )}

      {/* Institution Selector Modal */}
      <Modal
        visible={showInstitutionSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstitutionSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowInstitutionSelector(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Institution</Text>
              <TouchableOpacity onPress={() => setShowInstitutionSelector(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={institutions}
              keyExtractor={(item) => item.institution_id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.instItem}
                  onPress={() => {
                    setSelectedInstitutionId(item.institution_id);
                    setShowInstitutionSelector(false);
                  }}
                >
                  <Text style={styles.instName}>{item.name}</Text>
                  {selectedInstitutionId === item.institution_id && (
                    <Check size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.textMuted }}>
                  No active institutions found.
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <AlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginBottom: 24 },
  broadcastCard: { padding: 24, borderRadius: 32, backgroundColor: theme.colors.glass, borderWidth: 1, borderColor: theme.colors.glassBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  cardHeaderTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  audienceSelectors: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  audienceBtn: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.glassBorder, justifyContent: 'center', alignItems: 'center', gap: 8 },
  activeAudience: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  audienceText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  audienceTextActive: { color: 'white', fontSize: 14, fontWeight: '600' },
  messageBox: { height: 120, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: theme.colors.glassBorder, padding: 16, color: theme.colors.text, textAlignVertical: 'top' },
  sendBtn: { height: 56, backgroundColor: theme.colors.primary, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 10 },
  sendBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 32, marginBottom: 16 },
  historyCard: { padding: 16, borderRadius: 20, backgroundColor: theme.colors.glass, borderWidth: 1, borderColor: theme.colors.glassBorder, marginBottom: 12 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  historyMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  institutionPicker: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  pickerText: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  pickerPlaceholder: { color: theme.colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  instItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  instName: { fontSize: 16, color: theme.colors.text },
});
