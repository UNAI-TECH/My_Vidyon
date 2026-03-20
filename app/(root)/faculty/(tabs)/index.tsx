import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NotificationBell } from '../../../../src/components/common/NotificationBell';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { ShortcutGrid } from '../../../../src/components/common/ShortcutGrid';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
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
  Contact
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
  const { user, institutionId, role } = useAuth();
  const { stats, todaySchedule, assignedSubjects, institution, facultyProfile, isLoading } = useFacultyDashboard(user?.id, institutionId || undefined);

  const welcomeName = facultyProfile?.full_name || user?.email?.split('@')[0] || 'Faculty';
  const facultySubtitle = facultyProfile ? 
    `${facultyProfile.department || 'Faculty'}` : 
    "Faculty Overview & Today's Schedule";

  const shortcuts = [
    { label: 'Attendance', icon: CheckSquare, href: '/(root)/faculty/attendance', color: '#3B82F6' },
    { label: 'Leaves', icon: UserCheck, href: '/(root)/faculty/leave', color: '#10B981' },
    { label: 'Directory', icon: Contact, href: '/(root)/faculty/directory', color: '#F59E0B' },
    { label: 'Timetable', icon: Calendar, href: '/(root)/faculty/timetable', color: '#8B5CF6' },
    { label: 'Assignments', icon: ClipboardList, href: '/(root)/faculty/assignments', color: '#F97316' },
    { label: 'Marks', icon: FileText, href: '/(root)/faculty/exams', color: '#EF4444' },
    { label: 'Announcements', icon: Megaphone, href: '/(root)/faculty/announcements', color: '#A855F7' },
    { label: 'Classes', icon: BookOpen, href: '/(root)/faculty/courses', color: '#6366F1' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={`Hello, ${welcomeName}!`} 
        subtitle={facultySubtitle}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || undefined}
        userAvatar={facultyProfile?.image_url || undefined}
        userSubtitle={facultyProfile?.department || undefined}
        actions={<NotificationBell />}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ShortcutGrid items={shortcuts} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          iconColor="#3B82F6"
        />
        <StatCard 
          title="Assigned" 
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
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {todaySchedule.length > 0 ? (
          todaySchedule.map((slot: any, index: number) => (
            <View key={index} style={styles.scheduleItem}>
              <View style={styles.scheduleTime}>
                <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.timeText}>{slot.start_time?.substring(0, 5)}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.subjectText}>{slot.subjects?.name || 'Subject'}</Text>
                <Text style={styles.classText}>
                  {slot.classes?.name || 'Class'} - {slot.section || 'A'}
                </Text>
              </View>
              {slot.room_number && (
                <View style={styles.roomContainer}>
                  <MapPin size={14} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.roomText}>{slot.room_number}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled for today.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Subjects</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll}>
          {assignedSubjects.length > 0 ? (
            assignedSubjects.map((item: any, index: number) => (
              <TouchableOpacity key={index} style={styles.subjectCard}>
                <View style={[styles.subjectIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                  <BookOpen size={24} color={theme.colors.primary} {...({} as any)} />
                </View>
                <Text style={styles.subjectCardTitle} numberOfLines={1}>{item.subjects?.name}</Text>
                <Text style={styles.subjectCardSubtitle}>{item.classes?.name} - {item.section}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No subjects assigned yet.</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Attendance by Class</Text>
        <BarChart
          data={{
            labels: ['10-A', '10-B', '11-A', '11-B'],
            datasets: [{ data: [92, 85, 88, 95] }]
          }}
          width={screenWidth - 48}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  scheduleTime: { width: 80, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', marginRight: 16 },
  timeText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  scheduleContent: { flex: 1 },
  subjectText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  classText: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  roomContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roomText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text, marginLeft: 4 },
  subjectsScroll: { marginHorizontal: -4 },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    width: 140,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  subjectIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  subjectCardTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  subjectCardSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  chartContainer: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chart: { marginVertical: 8, borderRadius: 16 },
});
