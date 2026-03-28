import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { AlertModal } from '../../../../src/components/common/AlertModal';

export default function FacultyAnnouncements() {
  const insets = useSafeAreaInsets();
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

  // Alert State
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

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
      const { error } = await supabase
        .from('announcements')
        .insert({
          institution_id: institutionId,
          title,
          content,
          category: targetAudience === 'Specific Class' ? 'class' : (targetAudience === 'Faculty Only' ? 'faculty' : 'student'),
          type: priority,
          target_class_id: targetAudience === 'Specific Class' ? selectedClass?.class_id : null,
          target_section: targetAudience === 'Specific Class' ? selectedClass?.section : null,
          created_by: user.id,
        } as any);

      if (error) throw error;
      
      setTitle('');
      setContent('');
      setSelectedClass(null);
      setTargetAudience('All Students');
      setPriority('Info');
      refetch();
      showAlert('Success', 'Announcement posted successfully!', 'success');
    } catch (error: any) {
      console.error('Error posting announcement:', error);
      showAlert('Error', 'Failed to post announcement: ' + error.message, 'error');
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
    <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(type) }]} />
  );

  const getCategoryTheme = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'class':    return { bg: '#EFF6FF', color: '#3B82F6', label: 'Class' };
      case 'faculty':  return { bg: '#F5F3FF', color: '#8B5CF6', label: 'Faculty' };
      case 'staff':    return { bg: '#FDF2F8', color: '#EC4899', label: 'Staff' };
      case 'student':  return { bg: '#F0FDF4', color: '#10B981', label: 'Students' };
      default:         return { bg: '#F8FAFC', color: '#64748B', label: category || 'General' };
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.content, 
        { paddingBottom: insets.bottom + theme.spacing.xl }
      ]}
    >
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
          announcements.map((ann: any) => {
            const catTheme = getCategoryTheme(ann.category);
            return (
              <View key={ann.id} style={styles.card}>
                {renderPriorityIndicator(ann.type)}
                <View style={styles.cardHeader}>
                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: catTheme.bg }]}>
                      <Users size={10} color={catTheme.color} {...({} as any)} />
                      <Text style={[styles.badgeText, { color: catTheme.color }]}>{catTheme.label}</Text>
                    </View>
                    <Text style={styles.date}>{format(new Date(ann.created_at), 'MMM d, h:mm a')}</Text>
                  </View>
                </View>
                <Text style={styles.annTitle}>{ann.title}</Text>
                {ann.content && (
                  <Text style={styles.annContent} numberOfLines={3}>{ann.content}</Text>
                )}
              </View>
            );
          })
        )}
      </View>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.m },
  composer: { backgroundColor: 'white', borderRadius: 24, padding: theme.spacing.m, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
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
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  priorityIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, opacity: 0.8 },
  cardHeader: { marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  date: { fontSize: 11, color: theme.colors.textMuted },
  annTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  annContent: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 20 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
