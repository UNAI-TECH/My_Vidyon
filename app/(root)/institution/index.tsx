import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useNotifications } from '../../../src/hooks/useNotifications';
import { StatCard } from '../../../src/components/common/StatCard';
import { EventAdCarousel } from '../../../src/components/common/EventAdCarousel';
import { useAuth } from '../../../src/hooks/useAuth';
import { useInstitutionData } from '../../../src/hooks/useInstitutionData';
import { useAccountantDashboard } from '../../../src/hooks/useAccountantDashboard';
import { AdBanner } from '../../../src/components/common/Ads/AdBanner';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Settings, 
  GraduationCap, 
  Building, 
  UserCheck, 
  Clock, 
  ChevronDown, 
  Bell, 
  ClipboardList, 
  Calendar,
  CreditCard,
  CheckCircle,
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function InstitutionDashboard() {
  const router = useRouter();
  const { institutionId, role, imageUrl } = useAuth();
  const [academicYear, setAcademicYear] = useState('2026-27');
  const isFinance = role === 'accountant' || role === 'finance';

  const { stats, charts, attendanceFeed, pendingLeaves, profile, institution, isLoading } = useInstitutionData(!isFinance ? institutionId : null, academicYear);
  const accountantData = useAccountantDashboard(isFinance ? (institutionId || undefined) : undefined);
  const [containerWidth, setContainerWidth] = useState(screenWidth - 32);

  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };
  
  const shortcuts = React.useMemo(() => {
    if (role === 'admission_officer' || role === 'admissions') {
      return [
        { label: 'Admissions', icon: UserCheck, href: '/(root)/institution/admissions', color: '#0EA5E9' },
        { label: 'Add Student', icon: GraduationCap, href: '/(root)/institution/students/add', color: '#14B8A6' },
        { label: 'Promotions', icon: Clock, href: '/(root)/institution/promotions', color: '#F59E0B' },
        { label: 'Communication', icon: Bell, href: '/(root)/institution/communication', color: '#F43F5E' },
        { label: 'Events', icon: Calendar, href: '/(root)/institution/events', color: '#8B5CF6' },
        { label: 'Settings', icon: Settings, href: '/(root)/institution/settings', color: '#64748B' },
      ];
    }
    if (role === 'accountant' || role === 'finance') {
      return [
        { label: 'Fee Collection', icon: TrendingUp, href: '/(root)/institution/fees/collection', color: '#10B981' },
        { label: 'Fee Management', icon: Briefcase, href: '/(root)/institution/fees', color: '#F59E0B' },
        { label: 'Fee Structures', icon: FileText, href: '/(root)/institution/fees/structures', color: '#6366F1' },
        { label: 'Concessions', icon: UserCheck, href: '/(root)/institution/fees/concessions', color: '#EC4899' },
        { label: 'Reports', icon: FileText, href: '/(root)/institution/reports', color: '#3B82F6' },
        { label: 'Analytics', icon: TrendingUp, href: '/(root)/institution/analytics', color: '#0EA5E9' },
        { label: 'Settings', icon: Settings, href: '/(root)/institution/settings', color: '#64748B' },
      ];
    }
    if (role === 'reports_manager') {
      return [
        { label: 'Reports', icon: FileText, href: '/(root)/institution/reports', color: '#6366F1' },
        { label: 'Analytics', icon: TrendingUp, href: '/(root)/institution/analytics', color: '#0EA5E9' },
        { label: 'Exams & Results', icon: ClipboardList, href: '/(root)/institution/exams', color: '#F87171' },
        { label: 'Departments', icon: Briefcase, href: '/(root)/institution/departments', color: '#A855F7' },
        { label: 'Settings', icon: Settings, href: '/(root)/institution/settings', color: '#64748B' },
      ];
    }
    return [
      { label: 'Admissions', icon: UserCheck, href: '/(root)/institution/admissions', color: '#0EA5E9' },
      { label: 'Fee Management', icon: Briefcase, href: '/(root)/institution/fees', color: '#F59E0B' },
      { label: 'Promotions', icon: Clock, href: '/(root)/institution/promotions', color: '#EAB308' },
      { label: 'Departments', icon: Briefcase, href: '/(root)/institution/departments', color: '#6366F1' },
      { label: 'Users', icon: Users, href: '/(root)/institution/users', color: '#A855F7' },
      { label: 'Add User', icon: GraduationCap, href: '/(root)/institution/students/add', color: '#14B8A6' },
      { label: 'Leave Ops', icon: FileText, href: '/(root)/institution/leaves', color: '#EF4444' },
      { label: 'Timetable', icon: Clock, href: '/(root)/institution/timetable', color: '#F59E0B' },
      { label: 'Exams', icon: ClipboardList, href: '/(root)/institution/exams', color: '#F87171' },
      { label: 'Communication', icon: Bell, href: '/(root)/institution/communication', color: '#F43F5E' },
      { label: 'Staff Assigning', icon: UserCheck, href: '/(root)/institution/faculty/assign', color: '#8B5CF6' },
      { label: 'Analytics', icon: TrendingUp, href: '/(root)/institution/analytics', color: '#0EA5E9' },
      { label: 'Reports', icon: FileText, href: '/(root)/institution/reports', color: '#6366F1' },
      { label: 'Settings', icon: Settings, href: '/(root)/institution/settings', color: '#64748B' },
    ];
  }, [role]);

  const getRoleTitle = () => {
    if (role === 'admission_officer' || role === 'admissions') return 'Admissions Console';
    if (role === 'accountant' || role === 'finance') return 'Fee & Finance Console';
    if (role === 'reports_manager') return 'Reports & Analytics Console';
    return 'Institution Overview';
  };

  const attendanceRate = stats.totalPeople > 0 
    ? Math.round((stats.presentToday / stats.totalPeople) * 100) 
    : 0;

  const currentInstitution = isFinance ? (accountantData.institution || institution) : institution;
  const currentProfile = isFinance ? (accountantData.stats.accountantProfile || profile) : profile;

  if (!isFinance && isLoading && !stats.students) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isFinance && accountantData.isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // FINANCE & ACCOUNTANT DASHBOARD VIEW
  if (isFinance) {
    const accStats = accountantData.stats;
    const totalBilled = accStats.totalRevenue + accStats.outstandingAmount;
    const collectionRate = totalBilled > 0
      ? Math.round((accStats.totalRevenue / totalBilled) * 100)
      : 100;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} onLayout={onLayout}>
        <PageHeader 
          title="Fee & Finance Console" 
          subtitle={`Cash Flow, Ledger Status & Counter Operations • Academic Year ${academicYear}`}
          institutionName={currentInstitution?.name}
          institutionLogo={currentInstitution?.logo_url}
          userRole={role || 'accountant'}
          userAvatar={imageUrl || currentProfile?.image_url || undefined}
          actions={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <NotificationBell />
              <TouchableOpacity style={styles.yearPicker}>
                <Text style={styles.yearText}>{academicYear}</Text>
                <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>
          }
        />

        <EventAdCarousel 
          nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
          adInterval={2}
        />

        {/* Shortcuts - Management Console */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Operations</Text>
          <ShortcutGrid items={shortcuts} />
        </View>

        {/* Financial Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Collections (YTD)" 
            value={`₹${accStats.totalRevenue.toLocaleString('en-IN')}`} 
            icon={TrendingUp} 
            iconColor="#10B981"
            change="Real-time collection"
            changeType="positive"
          />
          <StatCard 
            title="Outstanding Dues" 
            value={`₹${accStats.outstandingAmount.toLocaleString('en-IN')}`} 
            icon={Clock} 
            iconColor="#EF4444"
            change={accStats.outstandingAmount > 0 ? "Pending collection" : "All cleared"}
            changeType={accStats.outstandingAmount > 0 ? "negative" : "positive"}
          />
          <StatCard 
            title="Transactions Recorded" 
            value={accStats.transactionCount.toString()} 
            icon={CreditCard} 
            iconColor="#3B82F6"
            change="Receipts issued"
          />
          <StatCard 
            title="Collection Rate" 
            value={`${collectionRate}%`} 
            icon={CheckCircle} 
            iconColor="#F59E0B"
            change="Realized vs Invoiced"
          />
        </View>

        {/* 7-Day Revenue Collections Trend (Native Responsive Bar Chart) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>7-Day Revenue Collections (₹)</Text>
          <View style={styles.barChartContainer}>
            {accStats.weeklyTrend.map((item, idx) => {
              const maxVal = Math.max(...accStats.weeklyTrend.map(t => t.amount), 1);
              const heightPct = Math.max(8, Math.round((item.amount / maxVal) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barValueText}>
                    {item.amount >= 1000 ? `₹${(item.amount / 1000).toFixed(0)}k` : item.amount > 0 ? `₹${item.amount}` : '-'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: item.amount > 0 ? '#10B981' : '#E2E8F0' }]} />
                  </View>
                  <Text style={styles.barLabelText}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Fee Collection Status Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Fee Collection Status Breakdown</Text>
          <View style={styles.distGrid}>
            {accStats.feeDistribution.map((item, idx) => (
              <View key={idx} style={[styles.distCard, { borderLeftColor: item.color }]}>
                <Text style={styles.distLabel}>{item.name}</Text>
                <Text style={[styles.distCount, { color: item.color }]}>{item.count} Accounts</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Payments & Counter Collections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments & Counter Collections</Text>
            <TouchableOpacity onPress={() => router.push('/(root)/institution/fees/collection' as any)}>
              <Text style={styles.viewAll}>+ Record Payment</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.feedContainer}>
            {accStats.recentPayments.length > 0 ? (
              accStats.recentPayments.map((p: any, idx: number) => (
                <View key={p.id || idx} style={styles.feedItem}>
                  <View style={styles.feedProfile}>
                    <View style={[styles.avatar, { backgroundColor: '#10B98115' }]}>
                      <CreditCard size={18} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.feedName}>{p.students?.name || 'Student'}</Text>
                      <Text style={styles.feedSubtitle}>
                        {p.students?.class_name || 'Class'}{p.students?.section ? ` • Sec ${p.students.section}` : ''} • {p.receipt_number || 'Receipt'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.feedMeta}>
                    <Text style={[styles.feedName, { color: '#10B981' }]}>
                      +₹{Number(p.amount_paid || p.amount || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.feedTime}>
                      {(p.payment_method || 'CASH').toUpperCase()} • {p.payment_date ? format(new Date(p.payment_date), 'MMM d, hh:mm a') : 'Today'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>No fee payments recorded yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Financial Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { flex: 1, backgroundColor: '#FAB75A' }]}
            onPress={() => router.push('/(root)/institution/fees/collection' as any)}
          >
            <TrendingUp size={18} color="#1E293B" />
            <Text style={[styles.actionButtonText, { color: '#1E293B' }]}>Fee Collection Counter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { flex: 1, backgroundColor: '#3B82F6' }]}
            onPress={() => router.push('/(root)/institution/reports' as any)}
          >
            <FileText size={18} color="white" />
            <Text style={[styles.actionButtonText, { color: 'white' }]}>Financial Reports</Text>
          </TouchableOpacity>
        </View>

        <AdBanner type="INSTITUTION" />
      </ScrollView>
    );
  }

  // INSTITUTION OVERVIEW (ADMIN / DEFAULT VIEW)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} onLayout={onLayout}>
      <PageHeader 
        title={getRoleTitle()} 
        subtitle={`Academic Year ${academicYear}`}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || 'institution'}
        userAvatar={imageUrl || profile?.image_url || undefined}
        actions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <TouchableOpacity style={styles.yearPicker}>
              <Text style={styles.yearText}>{academicYear}</Text>
              <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>
        }
      />

      <EventAdCarousel 
        nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
        adInterval={2}
      />

      {/* Shortcuts - Moved to Top */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management Console</Text>
        <ShortcutGrid items={shortcuts} />
      </View>

      {/* Stats Grid */}
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
          change="Across all groups"
        />
      </View>

      {/* Charts Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Enrollment Trend (Cumulative)</Text>
        <LineChart
          data={{
            labels: charts.enrollmentTrend.length > 0 
              ? charts.enrollmentTrend.map((t, i) => i % 2 === 0 ? t.name : "") 
              : ["Jan", "", "Mar", "", "May", "", "Jul", "", "Sep", "", "Nov", ""],
            datasets: [{
              data: charts.enrollmentTrend.length > 0 ? charts.enrollmentTrend.map(t => t.value) : [0,0,0,0,0,0,0,0,0,0,0,0],
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              strokeWidth: 3
            }]
          }}
          width={containerWidth - 36}
          height={200}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#3B82F6" },
            fillShadowGradient: "#3B82F6",
            fillShadowGradientOpacity: 0.1,
            propsForBackgroundLines: {
              strokeDasharray: "5",
              stroke: "rgba(100, 116, 139, 0.1)"
            },
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ ...styles.chartStyle, marginLeft: -10 }}
          withInnerLines={true}
          withOuterLines={false}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          formatYLabel={(val) => Math.floor(Number(val)).toString()}
        />
      </View>

      <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Class Distribution</Text>
          <PieChart
            data={charts.classDistribution.map((c, i) => ({
                name: c.name,
                population: c.value,
                color: ["#3B82F6", "#A855F7", "#10B981", "#F59E0B", "#EF4444"][i % 5],
                legendFontColor: "#64748B",
                legendFontSize: 11
            }))}
            width={containerWidth - 36}
            height={160}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
      </View>

      {/* New Analytics: Daily Attendance Trend */}
      <View style={styles.chartCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.chartTitle}>Daily Attendance Trend (%)</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Real-time</Text>
          </View>
        </View>
        <LineChart
          data={{
            labels: charts.dailyAttendanceTrend.length > 0 ? charts.dailyAttendanceTrend.map(t => t.name) : ["Sun"],
            datasets: [{
              data: charts.dailyAttendanceTrend.length > 0 ? charts.dailyAttendanceTrend.map(t => t.value) : [0]
            }]
          }}
          width={containerWidth - 36}
          height={180}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
            style: { borderRadius: 16 },
          }}
          bezier
          style={styles.chartStyle}
        />
      </View>

      {/* New Analytics: Faculty Daily Attendance Trend (%) */}
      <View style={styles.chartCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.chartTitle}>Faculty Daily Attendance (%)</Text>
          <View style={[styles.badge, { borderColor: 'rgba(168, 85, 247, 0.2)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }]}>
            <Text style={[styles.badgeText, { color: '#A855F7' }]}>Real-time</Text>
          </View>
        </View>
        <LineChart
          data={{
            labels: charts.facultyAttendanceTrend.length > 0 ? charts.facultyAttendanceTrend.map((t: any) => t.name) : ["Sun"],
            datasets: [{
              data: charts.facultyAttendanceTrend.length > 0 ? charts.facultyAttendanceTrend.map((t: any) => t.value) : [0]
            }]
          }}
          width={containerWidth - 36}
          height={180}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Purple
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#A855F7" },
            style: { borderRadius: 16 },
          }}
          bezier
          style={styles.chartStyle}
        />
      </View>

      {/* New Analytics: Faculty Leave Frequency */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Faculty Leave Intensity (Last 7 Days)</Text>
        <LineChart
          data={{
            labels: charts.facultyLeaveTrend.length > 0 ? charts.facultyLeaveTrend.map(t => t.name) : ["Sun"],
            datasets: [{
              data: charts.facultyLeaveTrend.length > 0 ? charts.facultyLeaveTrend.map(t => t.value) : [0]
            }]
          }}
          width={containerWidth - 36}
          height={180}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#EF4444" },
            style: { borderRadius: 16 },
          }}
          style={styles.chartStyle}
        />
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications (Leaves)</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>
        <View style={styles.notificationList}>
            {pendingLeaves.length > 0 ? pendingLeaves.map(notif => (
                <View key={notif.id} style={styles.notifItem}>
                    <View style={styles.notifDot} />
                    <View style={styles.notifContent}>
                        <Text style={styles.notifMessage}>{notif.message}</Text>
                        <Text style={styles.notifTime}>{format(new Date(notif.created_at), 'MMM d • hh:mm a')}</Text>
                    </View>
                </View>
            )) : (
                <Text style={styles.emptyNotif}>No pending leave requests</Text>
            )}
        </View>
      </View>
      
      <AdBanner type="INSTITUTION" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  yearPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  yearText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', width: '100%' },
  chartTitle: { fontSize: theme.metrics.normalize(14), fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chartStyle: { marginLeft: -theme.metrics.normalize(16), borderRadius: 16 },
  section: { marginBottom: 24, width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: theme.metrics.normalize(16), fontWeight: 'bold', color: theme.colors.text },
  badge: { backgroundColor: 'rgba(59, 130, 246, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#3B82F6', textTransform: 'uppercase' },
  feedContainer: { backgroundColor: 'white', borderRadius: 24, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  feedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, backgroundColor: '#F8FAFC' },
  feedProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: '#3B82F6' },
  feedName: { fontSize: theme.metrics.normalize(13), fontWeight: 'bold', color: theme.colors.text },
  feedSubtitle: { fontSize: theme.metrics.normalize(11), color: theme.colors.textMuted },
  feedMeta: { alignItems: 'flex-end' },
  presentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  presentText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  timeWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedTime: { fontSize: 10, color: theme.colors.textMuted },
  animatePulse: { opacity: 0.8 },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 12 },
  emptyText: { fontSize: 12, color: theme.colors.textMuted },
  notificationList: { backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  notifItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginTop: 6 },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: theme.metrics.normalize(13), fontWeight: '600', color: theme.colors.text },
  notifTime: { fontSize: theme.metrics.normalize(11), color: theme.colors.textMuted, marginTop: 2 },
  viewAll: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  emptyNotif: { textAlign: 'center', paddingVertical: 12, fontSize: 12, color: theme.colors.textMuted },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingTop: 24,
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 28,
    height: 120,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  barLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  distGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  distCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  distLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  distCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
