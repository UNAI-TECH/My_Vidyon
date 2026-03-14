import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { useAuth } from '../../../src/hooks/useAuth';
import { useFacultyDashboard } from '../../../src/hooks/useFacultyDashboard';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  ClipboardList,
  FileUp,
  Clock,
  Megaphone
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
  const { user, institutionId } = useAuth();
  const { stats, todaySchedule, isLoading } = useFacultyDashboard(user?.id, institutionId || undefined);

  const shortcuts = [
    { label: 'Attendance', icon: CheckSquare, href: '/(root)/faculty/attendance', color: '#3B82F6' },
    { label: 'Schedule', icon: Clock, href: '/(root)/faculty/schedule', color: '#8B5CF6' },
    { label: 'Courses', icon: BookOpen, href: '/(root)/faculty/courses', color: '#F97316' },
    { label: 'Assignments', icon: ClipboardList, href: '/(root)/faculty/assignments', color: '#10B981' },
    { label: 'Exams', icon: FileUp, href: '/(root)/faculty/exams', color: '#EF4444' },
    { label: 'Announcements', icon: Megaphone, href: '/(root)/faculty/announcements', color: '#A855F7' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={`Hello, ${user?.email?.split('@')[0]}!`} 
        subtitle="Faculty Overview & Today's Schedule"
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
          title="Active Classes" 
          value={stats.todayClasses} 
          icon={Calendar} 
          iconColor="#A855F7"
        />
        <StatCard 
          title="Subjects" 
          value={stats.activeSubjects} 
          icon={BookOpen} 
          iconColor="#F59E0B"
        />
        <StatCard 
          title="Pending Reviews" 
          value={stats.pendingReviews} 
          icon={ClipboardList} 
          iconColor="#EF4444"
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
                <Text style={styles.classText}>Section {slot.section || 'A'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled for today.</Text>
          </View>
        )}
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
  classText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
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
