import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { useAuth } from '../../../src/hooks/useAuth';
import { useInstitutionDashboard } from '../../../src/hooks/useInstitutionDashboard';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  Shield, 
  BarChart3,
  TrendingUp,
  FileText,
  MessageSquare,
  CalendarRange,
  Megaphone
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { EventAdCarousel } from '../../../src/components/common/EventAdCarousel';
import { ProgressChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

import { useSuperAdminDashboard } from '../../../src/hooks/useSuperAdminDashboard';

export default function AdminDashboard() {
  const { role, imageUrl } = useAuth();
  const { stats, profile, isLoading } = useSuperAdminDashboard();

  if (isLoading) return <View style={styles.container}><Text>Loading SaaS Metrics...</Text></View>;

  const data = {
    labels: ["Institutions", "Revenue", "Users"],
    data: stats.performanceRatios
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="Super Admin (SaaS)"
        subtitle="Global Network Oversight & Onboarding"
        userRole={role || 'super_admin'}
        userAvatar={imageUrl || profile?.image_url || undefined}
        actions={<NotificationBell />}
      />

      <EventAdCarousel 
        nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
        adInterval={2}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ShortcutGrid items={[
          { label: 'Add Institution', icon: Building2, href: '/(root)/admin/onboarding', color: '#3B82F6' },
          { label: 'Broadcast', icon: MessageSquare, href: '/(root)/admin/communication', color: '#10B981' },
          { label: 'View Reports', icon: BarChart3, href: '/(root)/admin/revenue', color: '#F97316' },
          { label: 'Ad Management', icon: Megaphone, href: '/(root)/admin/ads', color: '#EF4444' },
          { label: 'Promotions', icon: CalendarRange, href: '/(root)/admin/promotions', color: '#EAB308' },
          { label: 'Config', icon: Shield, href: '/(root)/admin/settings', color: '#A855F7' },
        ]} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Inst."
          value={stats.totalInstitutions.toString()}
          icon={Building2}
          iconColor="#3B82F6"
          change="+2 this month"
          changeType="positive"
        />
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue >= 10000000 
            ? `₹${(stats.totalRevenue / 10000000).toFixed(2)}Cr` 
            : stats.totalRevenue >= 100000 
              ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L` 
              : `₹${(stats.totalRevenue || 0).toLocaleString()}`}
          icon={CreditCard}
          iconColor="#10B981"
          change="On track"
          changeType="positive"
        />
        <StatCard
          title="Ad Sponsor Rev"
          value={stats.adRevenue >= 100000 
            ? `₹${(stats.adRevenue / 100000).toFixed(1)}L` 
            : `₹${(stats.adRevenue || 0).toLocaleString()}`}
          icon={Megaphone}
          iconColor="#F59E0B"
          change={`₹${(stats.adRevenueEarned || 0).toLocaleString()} earned`}
          changeType="positive"
        />
        <StatCard
          title="Total Users"
          value={(stats.totalUsers/1000).toFixed(1) + 'k'}
          icon={Users}
          iconColor="#A855F7"
          change="Across network"
        />
        <StatCard
          title="Server Health"
          value={stats.serverHealth}
          icon={Activity}
          iconColor="#10B981"
          change="Operational"
          changeType="positive"
        />
      </View>

      {/* Pending Requests Section */}
      {stats.pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending onboarding ({stats.pendingRequests.length})</Text>
          <View style={styles.card}>
            {stats.pendingRequests.map((request, index) => (
              <TouchableOpacity key={request.id} style={styles.requestItem}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.name}</Text>
                  <Text style={styles.requestMeta}>{request.city}, {request.state}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDING</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Platform Performance</Text>
        <ProgressChart
          data={data}
          width={screenWidth - 64}
          height={200}
          strokeWidth={12}
          radius={28}
          chartConfig={chartConfig}
          hideLegend={false}
          style={styles.chart}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Activity</Text>
        <View style={styles.card}>
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((item, index) => (
              <View key={index} style={[styles.activityItem, index === stats.recentActivity.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.activityDot, { backgroundColor: item.role === 'admin' ? '#10B981' : '#3B82F6' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>
                    <Text style={{ fontWeight: 'bold' }}>{item.full_name || 'User'}</Text> ({item.role}) joined <Text style={{ color: theme.colors.primary }}>{item.institutions?.name || 'Network'}</Text>
                  </Text>
                  <Text style={styles.activityTime}>{new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textMuted }}>No activity records found.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
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
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, marginTop: 6 },
  activityText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  activityTime: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  requestMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  pendingBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pendingText: { fontSize: 9, fontWeight: 'bold', color: '#F59E0B' },
});
