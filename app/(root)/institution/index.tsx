import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { EventAdCarousel } from '../../../src/components/common/EventAdCarousel';
import { useAuth } from '../../../src/hooks/useAuth';
import { useInstitutionData } from '../../../src/hooks/useInstitutionData';
import { AdBanner } from '../../../src/components/common/Ads/AdBanner';
import { 
  Users, 
  Briefcase, 
  FileText,
  TrendingUp,
  Settings,
  GraduationCap,
  Building,
  ChevronDown,
  Bell,
  ClipboardList,
  Calendar
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { format } from 'date-fns';

export default function InstitutionDashboard() {
  const { institutionId, institutionUuid, role, imageUrl, academicYear: authYear } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  const academicYear = selectedYear || authYear || '2025-26';
  
  const { stats, charts, pendingLeaves, profile, institution, isLoading } = useInstitutionData(institutionId, academicYear);
  
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;

  // Optimized key for web stability
  const chartKey = useMemo(() => `chart-${isDesktop ? 'desktop' : 'mobile'}-${Math.floor(width/50)}`, [isDesktop, width]);

  const shortcuts = [
    { label: 'Departments', icon: Briefcase as any, href: '/(root)/institution/departments', color: '#6366F1' },
    { label: 'Users', icon: Users as any, href: '/(root)/institution/users', color: '#A855F7' },
    { label: 'Add User', icon: GraduationCap as any, href: '/(root)/institution/students/add', color: '#14B8A6' },
    { label: 'Leave Ops', icon: FileText as any, href: '/(root)/institution/leaves', color: '#EF4444' },
    { label: 'Timetable', icon: Clock as any, href: '/(root)/institution/timetable', color: '#F59E0B' },
    { label: 'Exams', icon: ClipboardList as any, href: '/(root)/institution/exams', color: '#F87171' },
    { label: 'Communication', icon: Bell as any, href: '/(root)/institution/communication', color: '#F43F5E' },
    { label: 'Analytics', icon: TrendingUp as any, href: '/(root)/institution/analytics', color: '#0EA5E9' },
    { label: 'Events', icon: Calendar as any, href: '/(root)/institution/events', color: '#F59E0B' },
    { label: 'Settings', icon: Settings as any, href: '/(root)/institution/settings', color: '#64748B' },
  ];

  const attendanceRate = stats.totalPeople > 0 
    ? Math.round((stats.presentToday / stats.totalPeople) * 100) 
    : 0;

  if (isLoading && !stats.students) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Simplified chart dimension logic
  const mainChartWidth = isDesktop ? 600 : (width - 64);
  const sideChartWidth = isDesktop ? 300 : (width - 48);

  const sharedChartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#3B82F6" },
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={StyleSheet.flatten([styles.content, isDesktop && { paddingHorizontal: 40 }])}
    >
      <PageHeader 
        title="Institution Overview" 
        subtitle={`Academic Year ${academicYear}`}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || undefined}
        actions={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <NotificationBell />
            <TouchableOpacity style={StyleSheet.flatten([styles.yearPicker, { marginLeft: 12 }])}>
              <Text style={styles.yearText}>{academicYear}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={StyleSheet.flatten([isDesktop ? { flexDirection: 'row' } : {}])}>
        {/* Main Column */}
        <View style={StyleSheet.flatten([{ flex: isDesktop ? 2 : 1 }, isDesktop && { marginRight: 32 }])}>
          <EventAdCarousel 
            nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
            adInterval={2}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management Console</Text>
            <ShortcutGrid items={shortcuts} />
          </View>

          <View style={styles.statsGrid}>
            <StatCard 
              title="Daily Attendance" 
              value={`${attendanceRate}%`} 
              icon={TrendingUp} 
              iconColor="#10B981"
              change={`${stats.presentToday} Present`}
              changeType="positive"
            />
            <StatCard 
              title="Total Students" 
              value={stats.students} 
              icon={GraduationCap} 
              iconColor="#3B82F6"
              change="Real-time count"
            />
            <StatCard 
              title="Total teachers" 
              value={stats.teachers} 
              icon={Users} 
              iconColor="#A855F7"
              change="Active faculty"
            />
            <StatCard 
              title="Total Classes" 
              value={stats.classes} 
              icon={Building} 
              iconColor="#F59E0B"
              change="Groups"
            />
          </View>

          <View style={StyleSheet.flatten([isDesktop ? { flexDirection: 'row' } : {}])}>
             <View style={StyleSheet.flatten([styles.chartCard, isDesktop && { flex: 1.5 }])}>
                <Text style={styles.chartTitle}>Enrollment Trend</Text>
                <LineChart
                  key={`${chartKey}-line-enroll`}
                  data={{
                    labels: charts.enrollmentTrend.length > 0 
                      ? charts.enrollmentTrend.map((t, i) => i % 2 === 0 ? t.name : "") 
                      : ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
                    datasets: [{
                      data: charts.enrollmentTrend.length > 0 ? charts.enrollmentTrend.map(t => t.value) : [0,0,0,0,0,0],
                      strokeWidth: 3
                    }]
                  }}
                  width={mainChartWidth}
                  height={200}
                  chartConfig={sharedChartConfig}
                  bezier
                  style={styles.cleanChart}
                />
             </View>

             <View style={StyleSheet.flatten([styles.chartCard, isDesktop && { flex: 1 }])}>
                <Text style={styles.chartTitle}>Distribution</Text>
                <PieChart
                  key={`${chartKey}-pie-dist`}
                  data={charts.classDistribution.map((c, i) => ({
                      name: c.name,
                      population: c.value,
                      color: ["#3B82F6", "#A855F7", "#10B981", "#F59E0B", "#EF4444"][i % 5],
                      legendFontColor: "#64748B",
                      legendFontSize: 10
                  }))}
                  width={sideChartWidth}
                  height={160}
                  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
             </View>
          </View>
        </View>

        {/* Sidebar Column */}
        <View style={{ flex: isDesktop ? 1 : 1 }}>
           <View style={styles.chartCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.chartTitle}>Attendance (%)</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>LIVE</Text></View>
              </View>
              <LineChart
                key={`${chartKey}-line-att`}
                data={{
                  labels: charts.dailyAttendanceTrend.length > 0 ? charts.dailyAttendanceTrend.map(t => t.name) : ["S"],
                  datasets: [{ data: charts.dailyAttendanceTrend.length > 0 ? charts.dailyAttendanceTrend.map(t => t.value) : [0] }]
                }}
                width={sideChartWidth}
                height={160}
                chartConfig={{
                  ...sharedChartConfig,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                }}
                style={styles.cleanChart}
              />
           </View>

           <View style={styles.section}>
             <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>Leaves</Text>
                 <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
             </View>
             <View style={styles.notificationList}>
                 {pendingLeaves.length > 0 ? pendingLeaves.map(notif => (
                     <View key={notif.id} style={styles.notifItem}>
                         <View style={styles.notifDot} />
                         <View style={styles.notifContent}>
                             <Text style={styles.notifMessage} numberOfLines={1}>{notif.message}</Text>
                             <Text style={styles.notifTime}>{format(new Date(notif.created_at), 'MMM d • hh:mm a')}</Text>
                         </View>
                     </View>
                 )) : (
                     <Text style={styles.emptyNotif}>No pending requests</Text>
                 )}
             </View>
           </View>

           <AdBanner type="INSTITUTION" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  yearPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  yearText: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginRight: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  // REPLACED chartStyle with cleanChart to avoid CSSStyleDeclaration TypeError in Electron
  cleanChart: { 
    marginVertical: 8,
    borderRadius: 16,
  },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  badge: { backgroundColor: 'rgba(59, 130, 246, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#3B82F6' },
  notificationList: { backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  notifItem: { flexDirection: 'row', marginBottom: 16 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginTop: 6, marginRight: 12 },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  notifTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  viewAll: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  emptyNotif: { textAlign: 'center', paddingVertical: 12, fontSize: 12, color: theme.colors.textMuted },
});

// Helper for navigation
function Clock(props: any) {
  return <FileText {...props} />;
}
