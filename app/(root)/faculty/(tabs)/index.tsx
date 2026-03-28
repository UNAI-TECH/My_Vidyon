import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../../../../src/components/common/NotificationBell';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { AdCard } from '../../../../src/components/common/AdCard';
import { ShortcutGrid } from '../../../../src/components/common/ShortcutGrid';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { useRouter } from 'expo-router';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  ClipboardList,
  FileUp,
  Clock,
  Megaphone,
  MapPin,
  FileText,
  UserCheck,
  Contact,
  ChevronRight
} from 'lucide-react-native';

import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
  barPercentage: 0.6,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

export default function FacultyDashboard() {
  const insets = useSafeAreaInsets();
  const { user, institutionId, role, imageUrl } = useAuth();

  const { stats, todaySchedule, assignedSubjects, assignedStudents, institution, facultyProfile, isLoading } = useFacultyDashboard(user?.id, institutionId || undefined);

  const router = useRouter();
  const welcomeName = facultyProfile?.full_name || user?.email?.split('@')[0] || 'Faculty';
  const facultySubtitle = facultyProfile ? 
    `${facultyProfile.department || 'Faculty'}` : 
    "Faculty Overview & Today's Schedule";

  const shortcuts = [
    { label: 'Attendance', icon: CheckSquare, href: '/faculty/attendance', color: '#3B82F6' },
    { label: 'Leaves', icon: UserCheck, href: '/faculty/leave', color: '#10B981' },
    { label: 'Directory', icon: Contact, href: '/faculty/directory', color: '#F59E0B' },
    { label: 'Schedule', icon: Calendar, href: '/faculty/timetable', color: '#8B5CF6' },
    { label: 'Exams', icon: FileText, href: '/faculty/exams', color: '#EF4444' },
    { label: 'Notices', icon: Megaphone, href: '/faculty/announcements', color: '#A855F7' },
    { label: 'Assignments', icon: ClipboardList, href: '/faculty/assignments', color: '#16A34A' },
    { label: 'Classes', icon: BookOpen, href: '/faculty/courses', color: '#64748B' },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.content, 
        { paddingBottom: insets.bottom + 100 }
      ]}
    >
      <PageHeader 
        title={`Hello, ${welcomeName}!`} 
        subtitle={facultySubtitle}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || 'faculty'}
        userAvatar={imageUrl || undefined}
        userSubtitle={facultyProfile?.department || undefined}
        actions={<NotificationBell />}
      />

      <View style={{ paddingBottom: 16 }}>
        <AdCard 
          title="Upgrade your Classroom!" 
          description="Access premium interactive tools for teachers. Click to explore."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ShortcutGrid items={shortcuts} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Content</Text>
        <View style={styles.manageGrid}>
          <TouchableOpacity 
            style={[styles.manageCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
            onPress={() => router.push('/faculty/materials')}
          >
            <View style={[styles.manageIcon, { backgroundColor: '#E0F2FE' }]}>
              <BookOpen size={24} color="#0284C7" {...({} as any)} />
            </View>
            <View style={styles.manageInfo}>
              <Text style={styles.manageTitle}>Study Materials</Text>
              <Text style={styles.manageSub}>View & Delete Uploads</Text>
            </View>
            <ChevronRight size={20} color="#0284C7" {...({} as any)} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.manageCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => router.push('/faculty/materials/upload')}
          >
            <View style={[styles.manageIcon, { backgroundColor: '#DCFCE7' }]}>
              <FileUp size={24} color="#16A34A" {...({} as any)} />
            </View>
            <View style={styles.manageInfo}>
              <Text style={styles.manageTitle}>Upload Material</Text>
              <Text style={styles.manageSub}>Share Files with Class</Text>
            </View>
            <ChevronRight size={20} color="#16A34A" {...({} as any)} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          iconColor="#3B82F6"
        />
        <StatCard 
          title="Assigned Students" 
          value={stats.assignedStudents} 
          icon={UserCheck} 
          iconColor="#10B981"
        />
        <StatCard 
          title="Pending Grading" 
          value={stats.pendingGrading} 
          icon={ClipboardList} 
          iconColor="#EF4444"
        />
        <StatCard 
          title="Pending Leaves" 
          value={stats.pendingLeaves} 
          icon={UserCheck} 
          iconColor="#F59E0B"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => router.push('/faculty/timetable')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {todaySchedule.length > 0 ? (
          todaySchedule.slice(0, 3).map((slot: any, index: number) => (
            <View key={index} style={styles.scheduleRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeTag}>{slot.start_time?.substring(0, 5)}</Text>
                <View style={styles.timeLine} />
              </View>
              <View style={styles.scheduleCard}>
                <View style={[styles.cardAccent, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.subjectRowTitle}>{slot.subjects?.name || 'Subject'}</Text>
                  <Text style={styles.classRowSub}>
                    {slot.classes?.name || 'Class'} • Section {slot.section || 'A'}
                  </Text>
                  {slot.room_number && (
                    <View style={styles.roomTag}>
                      <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.roomText}>Room {slot.room_number}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={18} color={theme.colors.textMuted + '80'} {...({} as any)} />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.premiumEmptyCard}>
            <Clock size={32} color={theme.colors.primary + '40'} {...({} as any)} />
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptySubtitle}>You have a free schedule today!</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Subjects</Text>
          <TouchableOpacity onPress={() => router.push('/faculty/courses')}>
            <Text style={styles.viewAllText}>Manage</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll} contentContainerStyle={styles.subjectsContent}>
          {assignedSubjects.length > 0 ? (
            assignedSubjects.map((item: any, index: number) => (
              <TouchableOpacity key={index} style={styles.premiumSubjectCard} activeOpacity={0.8}>
                <View style={styles.subjectCardHeader}>
                  <View style={styles.subjectIconWrap}>
                    <BookOpen size={20} color={theme.colors.primary} {...({} as any)} />
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.section}</Text>
                  </View>
                </View>
                <Text style={styles.subjectName} numberOfLines={1}>{item.subjects?.name}</Text>
                <Text style={styles.className}>{item.classes?.name}</Text>
                <View style={styles.cardFooter}>
                  <Users size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.studentCountText}>{assignedStudents} Students</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySubjectState}>
              <BookOpen size={24} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No subjects assigned</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Attendance Overview</Text>
        <BarChart
          data={{
            labels: ['10-A', '10-B', '11-A', '11-B'],
            datasets: [{ data: [92, 85, 88, 95] }]
          }}
          width={screenWidth - 48}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            ...chartConfig,
            decimalPlaces: 0,
            color: (opacity = 1) => theme.colors.primary,
            labelColor: (opacity = 1) => theme.colors.textMuted,
            style: { borderRadius: 16 },
            propsForBackgroundLines: { strokeDasharray: "" },
          }}
          verticalLabelRotation={0}
          style={styles.chart}
          fromZero
          showBarTops={false}
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.m },
  section: { marginBottom: theme.spacing.l },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  viewAllText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 32 },
  
  // Schedule Row Styles
  scheduleRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  timeColumn: { alignItems: 'center', width: 45 },
  timeTag: { fontSize: 12, fontWeight: '800', color: theme.colors.text, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  timeLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 8, borderRadius: 1 },
  scheduleCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardAccent: { width: 4, height: '100%', borderRadius: 2, marginRight: 12 },
  cardInfo: { flex: 1 },
  subjectRowTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  classRowSub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  roomTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  roomText: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },

  // Empty State Styles
  premiumEmptyCard: { backgroundColor: 'white', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4, textAlign: 'center' },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },

  // Subject Card Styles
  subjectsScroll: { marginHorizontal: -24 },
  subjectsContent: { paddingHorizontal: 24, paddingBottom: 8 },
  premiumSubjectCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, width: 160, marginRight: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  subjectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subjectIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.text },
  subjectName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  className: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  studentCountText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  emptySubjectState: { width: 160, height: 160, borderRadius: 24, backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', gap: 8 },

  chartContainer: { backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 40, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  chart: { marginVertical: 8, borderRadius: 16, marginLeft: -12 },
  
  // Manage Grid Styles
  manageGrid: { gap: 12 },
  manageCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  manageIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  manageInfo: { flex: 1 },
  manageTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  manageSub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
});
