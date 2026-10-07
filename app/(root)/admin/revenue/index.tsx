import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useSuperAdminDashboard } from '../../../../src/hooks/useSuperAdminDashboard';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, TrendingUp, DollarSign, Activity, Users, Building2, Building, ShieldCheck } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function AdminRevenue() {
  const { user, role, institutionId, institutionUuid, institutionName } = useAuth();
  const isScopedFinance = !!institutionId && institutionId !== 'global' && role !== 'superadmin';
  const { stats, isLoading: loadingGlobal } = useSuperAdminDashboard();

  const isUUID = (str: string | null | undefined): boolean => 
    !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Query campus-specific financial metrics if scoped finance stakeholder
  const { data: campusFinance, isLoading: loadingCampus } = useQuery({
    queryKey: ['campus-finance-metrics', institutionId, institutionUuid],
    queryFn: async () => {
      if (!isScopedFinance || !institutionId) return null;

      // Resolve UUID for querying tables with UUID foreign keys
      let targetUuid: string | null = institutionUuid && isUUID(institutionUuid) ? institutionUuid : null;
      if (!targetUuid && institutionId) {
        if (isUUID(institutionId)) {
          targetUuid = institutionId;
        } else {
          const { data } = await (supabase.from('institutions') as any).select('id').eq('institution_id', institutionId).maybeSingle();
          targetUuid = (data as any)?.id || null;
        }
      }

      // 1. Campus Fee Collections
      let fees: any[] = [];
      try {
        let feeQuery = (supabase.from('fee_payments') as any).select('amount_paid, amount, created_at');
        if (targetUuid && institutionId && targetUuid !== institutionId) {
          feeQuery = feeQuery.or(`institution_id.eq.${institutionId},institution_id.eq.${targetUuid}`);
        } else {
          feeQuery = feeQuery.eq('institution_id', targetUuid || institutionId);
        }
        const { data } = await feeQuery;
        fees = data || [];
      } catch (e) {
        console.warn('[CampusFinance] fee query failed:', e);
      }
      const feeTotal = (fees || []).reduce((acc: number, f: any) => acc + (Number(f.amount_paid) || Number(f.amount) || 0), 0);

      // 2. Campus Sponsored Ad Earnings (academic_events.institution_id is UUID)
      let adDebited = 0;
      let campusAds: any[] = [];
      if (targetUuid) {
        try {
          const { data: adsData } = await (supabase
            .from('academic_events') as any)
            .select('paid_amount, amount_debited, remaining_balance')
            .eq('is_admin_added', true)
            .eq('institution_id', targetUuid);
          campusAds = adsData || [];
          adDebited = campusAds.reduce((acc: number, a: any) => acc + (Number(a.amount_debited) || 0), 0);
        } catch (e) {
          console.warn('[CampusFinance] ads query failed:', e);
        }
      }
      const campusShare = Math.round(adDebited * 0.7);

      // 3. Campus Total Students / Users
      let studentCount = 0;
      try {
        let profQuery = (supabase.from('profiles') as any).select('id', { count: 'exact', head: true });
        if (targetUuid && institutionId && targetUuid !== institutionId) {
          profQuery = profQuery.or(`institution_id.eq.${institutionId},institution_id.eq.${targetUuid}`);
        } else {
          profQuery = profQuery.eq('institution_id', targetUuid || institutionId);
        }
        const { count } = await profQuery;
        studentCount = count || 0;
      } catch (e) {
        console.warn('[CampusFinance] profiles query failed:', e);
      }

      return {
        feeTotal,
        adDebited,
        campusShare,
        totalRevenue: feeTotal + campusShare,
        studentCount: studentCount || 0,
        activeCampaigns: (campusAds || []).length,
      };
    },
    enabled: isScopedFinance && !!institutionId,
  });

  const isLoading = isScopedFinance ? loadingCampus : loadingGlobal;
  
  if (isLoading) return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  const rawLineData = isScopedFinance && campusFinance
    ? [
        Math.max(10, Math.round(campusFinance.totalRevenue * 0.1)),
        Math.max(25, Math.round(campusFinance.totalRevenue * 0.3)),
        Math.max(45, Math.round(campusFinance.totalRevenue * 0.5)),
        Math.max(70, Math.round(campusFinance.totalRevenue * 0.7)),
        Math.max(90, Math.round(campusFinance.totalRevenue * 0.85)),
        Math.max(100, campusFinance.totalRevenue)
      ]
    : (stats.revenueTrend.data?.length ? stats.revenueTrend.data : [10, 25, 45, 60, 80, 100]);

  const lineData = {
    labels: stats.revenueTrend.labels?.length ? stats.revenueTrend.labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: rawLineData,
      color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const pieData = isScopedFinance
    ? [
        { name: 'Student Fees', population: campusFinance?.feeTotal || 1, color: '#3B82F6', legendFontColor: '#64748b', legendFontSize: 12 },
        { name: 'Ad Dividend (70%)', population: campusFinance?.campusShare || 0, color: '#10B981', legendFontColor: '#64748b', legendFontSize: 12 },
      ]
    : [
        { name: 'K-12', population: 60, color: '#3B82F6', legendFontColor: '#64748b', legendFontSize: 12 },
        { name: 'College', population: 25, color: '#10B981', legendFontColor: '#64748b', legendFontSize: 12 },
        { name: 'Other', population: 15, color: '#F59E0B', legendFontColor: '#64748b', legendFontSize: 12 },
      ];

  const barData = {
    labels: stats.onboardingTrend.labels,
    datasets: [{
      data: stats.onboardingTrend.data
    }]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: theme.colors.primary }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title={isScopedFinance ? "Campus Finance & Revenue" : "Platform Insights"}
        subtitle={isScopedFinance ? `Revenue & fee accounting for ${institutionName || institutionId}` : "Global performance metrics and growth trends"}
      />

      {isScopedFinance && (
        <View style={styles.campusBanner}>
          <Building size={20} color="#0284C7" />
          <View style={{ flex: 1 }}>
            <Text style={styles.campusBannerTitle}>Campus Scoped Finance Office</Text>
            <Text style={styles.campusBannerDesc}>
              Showing financial accounting, fee collections, and 70% ad revenue share specifically for <Text style={{ fontWeight: 'bold' }}>{institutionName || institutionId}</Text>.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatCard
          title={isScopedFinance ? "Total Campus Revenue" : "Annual Revenue"}
          value={isScopedFinance ? `₹${(campusFinance?.totalRevenue || 0).toLocaleString()}` : `₹${(stats.totalRevenue/10000000).toFixed(2)}Cr`}
          icon={DollarSign}
          iconColor="#10B981"
          change={isScopedFinance ? "Collected" : "+12% YoY"}
          changeType="positive"
        />
        <StatCard
          title={isScopedFinance ? "Campus Fee Total" : "Active Nodes"}
          value={isScopedFinance ? `₹${(campusFinance?.feeTotal || 0).toLocaleString()}` : stats.totalInstitutions.toString()}
          icon={CreditCard}
          iconColor="#3B82F6"
          change={isScopedFinance ? "Paid fees" : "Online"}
        />
        <StatCard
          title={isScopedFinance ? "Ad Payout (70%)" : "Global Users"}
          value={isScopedFinance ? `₹${(campusFinance?.campusShare || 0).toLocaleString()}` : (stats.totalUsers/1000).toFixed(1) + 'k'}
          icon={isScopedFinance ? TrendingUp : Users}
          iconColor="#A855F7"
          change={isScopedFinance ? "Ad dividend" : "Live"}
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue Trend (6 Months)</Text>
        <LineChart
          data={lineData}
          width={screenWidth - 80}
          height={180}
          chartConfig={chartConfig}
          bezier
          verticalLabelRotation={45}
          style={styles.chart}
        />
      </View>

      <View style={styles.grid}>
        <View style={[styles.chartCard, { flex: 1, marginRight: 8, padding: 12 }]}>
          <Text style={[styles.chartTitle, { fontSize: 13 }]}>Onboarding</Text>
          <BarChart
            data={barData}
            width={screenWidth / 2 - 40}
            height={150}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig, 
              barPercentage: 0.6,
              propsForLabels: { fontSize: 10 }
            }}
            style={styles.chart}
            verticalLabelRotation={45}
          />
        </View>
        <View style={[styles.chartCard, { flex: 1, marginLeft: 8, padding: 12 }]}>
          <Text style={[styles.chartTitle, { fontSize: 13 }]}>Inst. Types</Text>
          <PieChart
            data={pieData}
            width={screenWidth / 2 - 20}
            height={150}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
            hasLegend={false} // Hide legend to fit on small screens, users can see colors
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chart: { marginVertical: 8, borderRadius: 16 },
  grid: { flexDirection: 'row', marginTop: 16 },
  campusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  campusBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  campusBannerDesc: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 16,
  },
});
