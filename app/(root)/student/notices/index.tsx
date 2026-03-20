import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { theme } from '../../../../src/theme';
import { Bell, Calendar, ChevronRight, Info, AlertTriangle, Megaphone } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { useAuth } from '../../../../src/hooks/useAuth';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { format } from 'date-fns';

export default function StudentNotices() {
  const { institutionId, user } = useAuth();

  // 1. Fetch student profile to get class_name & section
  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile-notices', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('students')
        .select('class_name, section')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as { class_name: string; section: string } | null;
    },
    enabled: !!user?.id,
  });

  // Build the class-section label the same way faculty creates it: "3rd - A"
  const classLabel = studentProfile
    ? `${studentProfile.class_name} - ${studentProfile.section}`
    : null;

  // 2. Fetch announcements that match this student
  const { data: notices = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notices', institutionId, classLabel],
    queryFn: async () => {
      if (!institutionId) return [];

      // Fetch ALL announcements for this institution (including system-wide ones)
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or(`institution_id.is.null,institution_id.eq.${institutionId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Client-side filter: keep announcements where category matches
      // the student's class label, OR is a general/broadcast value
      const generalValues = ['general', 'all', 'all students', 'student'];
      return data.filter((ann: any) => {
        const cat = (ann.category || '').toLowerCase().trim();
        // General announcements everyone can see
        if (generalValues.includes(cat)) return true;
        // Class-specific: match against student's class label
        if (classLabel && cat === classLabel.toLowerCase().trim()) return true;
        return false;
      });
    },
    enabled: !!institutionId,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'Warning': return <AlertTriangle size={20} color="#F59E0B" />;
      case 'Important': return <Info size={20} color="#F59E0B" />;
      default: return <Megaphone size={20} color={theme.colors.primary} />;
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
      }
    >
      <PageHeader 
        title="Notices & News" 
        subtitle="Stay updated with school announcements"
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notices.length > 0 ? (
        notices.map((notice: any) => (
          <View key={notice.id} style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: notice.type === 'Warning' ? 'rgba(245, 158, 11, 0.1)' : notice.type === 'Important' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)' }]}>
                {getIcon(notice.type)}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.noticeTitle}>{notice.title || 'Announcement'}</Text>
                <View style={styles.metaRow}>
                  <Calendar size={12} color={theme.colors.textMuted} />
                  <Text style={styles.dateText}>{format(new Date(notice.created_at), 'MMM d, yyyy • h:mm a')}</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.noticeContent}>{notice.content}</Text>
            
            <View style={styles.footer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{notice.category?.toUpperCase() || 'GENERAL'}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Megaphone size={64} color={theme.colors.textMuted} opacity={0.2} />
          <Text style={styles.emptyTitle}>No notices yet</Text>
          <Text style={styles.emptySubtitle}>You're all caught up! New announcements will appear here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20 },
  loadingContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
  noticeCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: theme.colors.textMuted },
  noticeContent: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 16 },
  footer: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, flexDirection: 'row' },
  tag: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  tagText: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },
  emptyContainer: { height: 400, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginTop: 24, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
