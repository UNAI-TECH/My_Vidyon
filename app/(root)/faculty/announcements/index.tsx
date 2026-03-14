import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Megaphone, 
  Send, 
  Users,
  ChevronDown,
  Clock
} from 'lucide-react-native';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ActivityIndicator as RNActivityIndicator } from 'react-native';

export default function FacultyAnnouncements() {
  const { user, institutionId } = useAuth();
  const { assignedSubjects } = useFacultyDashboard(user?.id, institutionId || undefined);
  const [selectedClass, setSelectedClass] = React.useState<any>(null);

  // Fetch announcements for this institution
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['faculty-announcements', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!institutionId,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Class Communication" subtitle="Broadcast announcements to your classes" />

      <View style={styles.composer}>
        <Text style={styles.label}>Post to Class/Section</Text>
        <TouchableOpacity style={styles.selector}>
          <Text style={styles.selectorText}>
            {selectedClass ? `${selectedClass.classes?.name} - ${selectedClass.section}` : "Select Class"}
          </Text>
          <ChevronDown size={18} color={theme.colors.textMuted} {...({} as any)} />
        </TouchableOpacity>

        <TextInput 
          style={styles.input} 
          multiline 
          placeholder="Type your message here..." 
          placeholderTextColor={theme.colors.textMuted}
        />

        <TouchableOpacity style={styles.sendBtn}>
          <Megaphone size={18} color="white" {...({} as any)} />
          <Text style={styles.sendBtnText}>Post Announcement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        {isLoading ? (
          <RNActivityIndicator size="large" color={theme.colors.primary} />
        ) : announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No announcements found.</Text>
          </View>
        ) : (
          announcements.map((ann: any) => (
            <View key={ann.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.meta}>
                  <Users size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{ann.target_group || 'All'}</Text>
                </View>
                <Text style={styles.date}>{format(new Date(ann.created_at), 'MMM d')}</Text>
              </View>
              <Text style={styles.annTitle}>{ann.title}</Text>
              {ann.content && (
                <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  composer: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  label: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  selector: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { fontSize: 14, color: theme.colors.text },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, height: 120, textAlignVertical: 'top', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  sendBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  date: { fontSize: 10, color: theme.colors.textMuted },
  annTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  annContent: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
