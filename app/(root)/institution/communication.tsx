import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { Bell, Send, Smartphone, Clock, X } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/hooks/useAuth';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { format } from 'date-fns';

export default function InstitutionCommunication() {
  const { institutionId, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  
  // Alert State
  const [alert, setAlert] = React.useState({ visible: false, title: '', message: '', type: 'info' as any });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['announcements', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!institutionId,
  });

  const onBlast = async () => {
    if (!message.trim() || !user || !institutionId) return;
    setIsSending(true);
    try {
      const payload: any = {
        title: 'Institution Announcement',
        content: message,
        type: 'info',
        created_by: user.id,
        institution_id: institutionId, // Tied to current institution
        category: 'General'
      };

      const { error } = await supabase
        .from('announcements')
        .insert(payload);
      
      if (!error) {
        setMessage('');
        showAlert('Success', 'Announcement sent to all members!', 'success');
        queryClient.invalidateQueries({ queryKey: ['announcements', institutionId] });
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
      <View style={styles.header}>
        <Text style={styles.title}>Communication Center</Text>
        <Text style={styles.subtitle}>Broadcast announcements to your institution</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bell size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>New Announcement</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message here..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
          />
        </View>

        <TouchableOpacity 
          style={[styles.blastButton, (!message.trim() || isSending) && styles.disabledButton]}
          onPress={onBlast}
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Send size={20} color="white" />
              <Text style={styles.blastText}>Send Announcement</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent History</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
        ) : history.length > 0 ? (
          history.map((item: any) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyDate}>{format(new Date(item.created_at), 'MMM d, h:mm a')}</Text>
              </View>
              <Text style={styles.historyBody}>{item.content}</Text>
              <View style={styles.historyFooter}>
                <View style={styles.historyBadge}>
                  <Smartphone size={12} color={theme.colors.primary} />
                  <Text style={styles.badgeText}>Mobile Blast</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Clock size={48} color={theme.colors.textMuted} opacity={0.3} />
            <Text style={styles.emptyText}>No previous announcements</Text>
          </View>
        )}
      </View>

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
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  inputContainer: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  input: { fontSize: 15, color: theme.colors.text, minHeight: 100, textAlignVertical: 'top' },
  blastButton: { backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  disabledButton: { opacity: 0.6 },
  blastText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  historyItem: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  historyTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  historyDate: { fontSize: 12, color: theme.colors.textMuted },
  historyBody: { fontSize: 14, color: '#475569', lineHeight: 20 },
  historyFooter: { marginTop: 12, flexDirection: 'row' },
  historyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
