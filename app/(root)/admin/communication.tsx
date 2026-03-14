import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { Bell, Send, Users, Smartphone } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/hooks/useAuth';

export default function CommunicationHub() {
  const { institutionId, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState('');
  const [audience, setAudience] = React.useState<'all' | 'faculty'>('all');
  const [isSending, setIsSending] = React.useState(false);

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
      const { error } = await supabase
        .from('announcements')
        // @ts-ignore: bypass 'never' type inference
        .insert({
          title: `Announcement for ${audience.toUpperCase()}`,
          content: message,
          type: audience === 'all' ? 'all' : 'faculty',
          created_by: user.id,
          institution_id: institutionId,
          category: 'General'
        });
      
      if (!error) {
        setMessage('');
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } else {
        console.error('Insert error:', error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
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
            style={[styles.audienceBtn, audience === 'faculty' && styles.activeAudience]}
            onPress={() => setAudience('faculty')}
          >
            <Smartphone size={18} color={audience === 'faculty' ? "white" : theme.colors.textMuted} {...({} as any)} />
            <Text style={audience === 'faculty' ? styles.audienceTextActive : styles.audienceText}>Faculty</Text>
          </TouchableOpacity>
        </View>

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
});
