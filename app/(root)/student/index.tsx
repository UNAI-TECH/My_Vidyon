import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { AdCard } from '../../../src/components/common/AdCard';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { useAuth } from '../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../src/hooks/useStudentDashboard';
import { useStudentTimetable } from '../../../src/hooks/useStudentTimetable';
import { 
  BookOpen, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Calendar, 
  LayoutDashboard,
  LucideIcon,
  ClipboardList,
  Award,
  MapPin,
  FileText
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const { user, institutionId, role, imageUrl } = useAuth();
  const { stats, assignments, institution, studentProfile, isLoading: isDashboardLoading } = useStudentDashboard(user?.id, institutionId || undefined);

  const { slots, specialSlots, isLoading: isTimetableLoading } = useStudentTimetable(user?.id);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = React.useMemo(() => {
    return (slots as any[]).filter((s: any) => s.day_of_week === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots, today]);

  const isLoading = isDashboardLoading || isTimetableLoading;

  const shortcuts = [
    { label: 'Attendance', icon: CheckCircle, href: '/student/attendance', color: '#3B82F6' },
    { label: 'Courses', icon: BookOpen, href: '/student/courses', color: '#F97316' },
    { label: 'Assignments', icon: ClipboardList, href: '/student/assignments', color: '#10B981' },
    { label: 'Exams', icon: ClipboardList, href: '/student/exams', color: '#F87171' },
    { label: 'Leave', icon: FileText, href: '/student/leave', color: '#EF4444' },
    { label: 'Grades', icon: TrendingUp, href: '/student/grades', color: '#F59E0B' },
    { label: 'Certificates', icon: Award, href: '/student/certificates', color: '#6366F1' },
    { label: 'Timetable', icon: Clock, href: '/student/timetable', color: '#64748B' },
  ];

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.content, 
        { paddingBottom: insets.bottom + theme.spacing.xl }
      ]}
    >
      <PageHeader 
        title={`Welcome, ${studentProfile?.name || 'Student'}!`} 
        subtitle="Unified Education Platform Overview"
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || 'student'}
        userAvatar={imageUrl || (studentProfile as any)?.image_url || undefined}
        userSubtitle={studentProfile ? `Class ${studentProfile.class_name} - ${studentProfile.section}` : undefined}
        actions={<NotificationBell />}
      />



      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Services</Text>
        <ShortcutGrid items={shortcuts} />
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
                <Text style={styles.facultyText}>
                  {slot.profiles?.full_name || 'Faculty'}
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



      <View style={styles.statsGrid}>
        <StatCard 
          title="Attendance" 
          value={stats.attendancePercentage} 
          icon={CheckCircle} 
          iconColor="#10B981"
          change="Updated Today"
        />
        <StatCard 
          title="Avg. Grade" 
          value={stats.averageGrade} 
          icon={TrendingUp} 
          iconColor="#FAB75A"
          change="Last Month"
        />
        <StatCard 
          title="Assignments" 
          value={stats.pendingAssignments} 
          icon={Clock} 
          iconColor="#F59E0B"
          change="Due Soon"
        />
        <StatCard 
          title="Events" 
          value={stats.upcomingEvents} 
          icon={Calendar} 
          iconColor="#6366F1"
          change="Next 7 Days"
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Attendance Trend</Text>
        <LineChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{ data: [80, 85, 90, 88, 92, 95] }]
          }}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.m },
  section: { marginBottom: theme.spacing.l },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  chartContainer: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 24, 
    marginTop: 8,
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
  facultyText: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  roomContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roomText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text, marginLeft: 4 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
