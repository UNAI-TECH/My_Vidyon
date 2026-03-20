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
  const { user, institutionId, institutionUuid } = useAuth();
  const { assignedSubjects } = useFacultyDashboard(user?.id, institutionId || undefined);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState<any>(null);
  const [priority, setPriority] = React.useState('Info');
  const [targetAudience, setTargetAudience] = React.useState('All Students');
  const [isPosting, setIsPosting] = React.useState(false);
  const [showClassSelector, setShowClassSelector] = React.useState(false);
  const [showTargetSelector, setShowTargetSelector] = React.useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = React.useState(false);

  // Fetch announcements for this institution
  const { data: announcements = [], isLoading, refetch } = useQuery({
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

  const handlePost = async () => {
    if (!title || !content || !institutionId || !user?.id) return;

    setIsPosting(true);
    try {
      const categoryValue = targetAudience === 'Specific Class' 
        ? `${selectedClass?.classes?.name} - ${selectedClass?.section}`
        : targetAudience;

      const { error } = await supabase
        .from('announcements')
        .insert({
          institution_id: institutionId,
          title,
          content,
          category: categoryValue,
          type: priority,
          created_by: user.id,
        } as any);

      if (error) throw error;

      // Sync to notifications table
      try {
        let userIds: string[] = [];

        if (targetAudience === 'Specific Class' && selectedClass) {
          // Only fetch students in that class + section
          const { data } = await supabase
            .from('students')
            .select('user_id')
            .eq('institution_id', institutionId)
            .eq('class_name', selectedClass.classes?.name)
            .eq('section', selectedClass.section) as { data: { user_id: string }[] | null };
          if (data) userIds = data.map(s => s.user_id).filter(Boolean);
        } else if (targetAudience === 'Faculty Only') {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('role', 'faculty') as { data: { id: string }[] | null };
          if (data) userIds = data.map(p => p.id).filter(Boolean);
        } else {
          // All Students
          const { data } = await supabase
            .from('students')
            .select('user_id')
            .eq('institution_id', institutionId) as { data: { user_id: string }[] | null };
          if (data) userIds = data.map(s => s.user_id).filter(Boolean);
        }

        userIds = [...new Set(userIds)];

        if (userIds.length > 0) {
          const notifications = userIds.map(uid => ({
            user_id: uid,
            title,
            message: content,
            type: 'announcement',
            read: false,
            institution_id: institutionId,
          }));

          const chunkSize = 100;
          for (let i = 0; i < notifications.length; i += chunkSize) {
            await supabase.from('notifications').insert(notifications.slice(i, i + chunkSize) as any);
          }
        }
      } catch (notifErr) {
        console.error('Failed to sync notifications:', notifErr);
      }
      
      setTitle('');
      setContent('');
      setSelectedClass(null);
      setTargetAudience('All Students');
      setPriority('Info');
      refetch();
      alert('Announcement posted successfully!');
    } catch (error: any) {
      console.error('Error posting announcement:', error);
      alert('Failed to post announcement: ' + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'Important': return '#F59E0B';
      case 'Warning': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  const renderPriorityIndicator = (type: string) => (
    <View style={[styles.priorityIndicatorBase, { backgroundColor: getPriorityColor(type) }]} />
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Class Communication" subtitle="Broadcast announcements to your classes" />

      <View style={styles.composer}>
        <Text style={styles.label}>Post Announcement</Text>
        
        <TextInput 
          style={styles.titleInput}
          placeholder="Title (e.g., Parent Teacher Meeting)"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.colors.textMuted}
        />

        <View style={styles.selectorsRow}>
          <View style={styles.selectorCol}>
            <Text style={styles.subLabel}>Target Audience</Text>
            <TouchableOpacity 
              style={styles.smallSelector}
              onPress={() => setShowTargetSelector(!showTargetSelector)}
            >
              <Text style={styles.selectorText}>{targetAudience}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>

          <View style={styles.selectorCol}>
            <Text style={styles.subLabel}>Priority</Text>
            <TouchableOpacity 
              style={styles.smallSelector}
              onPress={() => setShowPrioritySelector(!showPrioritySelector)}
            >
              <Text style={[styles.selectorText, { color: getPriorityColor(priority) }]}>{priority}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>
        </View>

        {showTargetSelector && (
          <View style={styles.dropdown}>
            {['All Students', 'Faculty Only', 'Specific Class'].map(t => (
              <TouchableOpacity 
                key={t} 
                style={styles.dropdownItem}
                onPress={() => {
                  setTargetAudience(t);
                  setShowTargetSelector(false);
                }}
              >
                <Text style={styles.dropdownText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showPrioritySelector && (
          <View style={styles.dropdown}>
            {['Info', 'Important', 'Warning'].map(p => (
              <TouchableOpacity 
                key={p} 
                style={styles.dropdownItem}
                onPress={() => {
                  setPriority(p);
                  setShowPrioritySelector(false);
                }}
              >
                <Text style={[styles.dropdownText, { color: getPriorityColor(p) }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {targetAudience === 'Specific Class' && (
          <>
            <Text style={styles.subLabel}>Select Class</Text>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowClassSelector(!showClassSelector)}
            >
              <Text style={styles.selectorText}>
                {selectedClass ? `${selectedClass.classes?.name} - ${selectedClass.section}` : "Choose your assigned class"}
              </Text>
              <ChevronDown size={18} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
            
            {showClassSelector && (
              <View style={styles.dropdown}>
                {assignedSubjects.map((s: any, i: number) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedClass(s);
                      setShowClassSelector(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{s.classes?.name} - {s.section}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <TextInput 
          style={styles.input} 
          multiline 
          placeholder="Detailed message..." 
          value={content}
          onChangeText={setContent}
          placeholderTextColor={theme.colors.textMuted}
        />

        <TouchableOpacity 
          style={[styles.sendBtn, (!title || !content || isPosting) && styles.disabledBtn]} 
          onPress={handlePost}
          disabled={!title || !content || isPosting}
        >
          {isPosting ? (
            <RNActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Megaphone size={18} color="white" {...({} as any)} />
              <Text style={styles.sendBtnText}>Broadcast Now</Text>
            </>
          )}
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
              {renderPriorityIndicator(ann.type)}
              <View style={styles.cardHeader}>
                <View style={styles.meta}>
                  <Users size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{ann.category || 'All'}</Text>
                </View>
                <Text style={styles.date}>{format(new Date(ann.created_at), 'MMM d, h:mm a')}</Text>
              </View>
              <Text style={styles.annTitle}>{ann.title}</Text>
              {ann.content && (
                <Text style={styles.annContent}>{ann.content}</Text>
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
  label: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 20 },
  subLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 8 },
  titleInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 'bold', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  selectorsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  selectorCol: { flex: 1 },
  smallSelector: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  selector: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { fontSize: 13, color: theme.colors.text },
  dropdown: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownText: { fontSize: 13, color: theme.colors.text },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, height: 100, textAlignVertical: 'top', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  sendBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  disabledBtn: { backgroundColor: '#94A3B8' },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative', overflow: 'hidden' },
  priorityIndicatorBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  date: { fontSize: 10, color: theme.colors.textMuted },
  annTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  annContent: { fontSize: 13, color: theme.colors.textMuted, marginTop: 6, lineHeight: 18 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
