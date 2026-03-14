import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { useAuth } from '../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../src/hooks/useStudentDashboard';
import { 
  BookOpen, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Calendar, 
  LayoutDashboard,
  LucideIcon,
  Sparkles,
  ClipboardList,
  Award
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
  const { user, institutionId } = useAuth();
  const { stats, assignments, isLoading } = useStudentDashboard(user?.id, institutionId || undefined);

  const shortcuts = [
    { label: 'Attendance', icon: CheckCircle, href: '/(root)/student/attendance', color: '#3B82F6' },
    { label: 'Courses', icon: BookOpen, href: '/(root)/student/courses', color: '#F97316' },
    { label: 'Assignments', icon: ClipboardList, href: '/(root)/student/assignments', color: '#10B981' },
    { label: 'AI Tutor', icon: Sparkles, href: '/(root)/student/ai-tutor', color: '#A855F7' },
    { label: 'Grades', icon: TrendingUp, href: '/(root)/student/grades', color: '#EF4444' },
    { label: 'Certificates', icon: Award, href: '/(root)/student/certificates', color: '#F59E0B' },
    { label: 'Calendar', icon: Calendar, href: '/(root)/student/calendar', color: '#6366F1' },
    { label: 'Timetable', icon: Clock, href: '/(root)/student/timetable', color: '#64748B' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={`Welcome, ${user?.email?.split('@')[0]}!`} 
        subtitle="Unified Education Platform Overview"
        actions={<NotificationBell />}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Services</Text>
        <ShortcutGrid items={shortcuts} />
      </View>

      <View style={styles.announcementCard}>
        <View style={styles.announcementContent}>
          <View style={styles.announcementText}>
            <Text style={styles.announcementBadge}>NEW</Text>
            <Text style={styles.announcementTitle}>AI Tutor Enhanced!</Text>
            <Text style={styles.announcementDesc}>Boost your performance with real-time doubt solving.</Text>
          </View>
          <View style={styles.announcementIcon}>
            <TrendingUp size={32} color="white" {...({} as any)} />
          </View>
        </View>
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
  content: { padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  announcementCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  announcementContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  announcementText: { flex: 1 },
  announcementBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: 'white', fontSize: 10, fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 8 },
  announcementTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  announcementDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  announcementIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
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
});
