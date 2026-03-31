import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useSuperAdminDashboard } from '../../../../src/hooks/useSuperAdminDashboard';
import { CreditCard, TrendingUp, DollarSign, Activity, Users, Building2 } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function AdminRevenue() {
  const { stats, isLoading } = useSuperAdminDashboard();
  
  if (isLoading) return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  const lineData = {
    labels: stats.revenueTrend.labels,
    datasets: [{
      data: stats.revenueTrend.data,
      color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const pieData = [
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
      <PageHeader title="Platform Insights" subtitle="Global performance metrics and growth trends" />

      <View style={styles.statsGrid}>
        <StatCard title="Annual Revenue" value={`₹${(stats.totalRevenue/10000000).toFixed(2)}Cr`} icon={DollarSign} iconColor="#10B981" change="+12% YoY" changeType="positive" />
        <StatCard title="Active Nodes" value={stats.totalInstitutions.toString()} icon={Building2} iconColor="#3B82F6" change="Online" />
        <StatCard title="Global Users" value={(stats.totalUsers/1000).toFixed(1) + 'k'} icon={Users} iconColor="#A855F7" change="Live" />
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
  grid: { flexDirection: 'row', marginTop: 16 }
});
