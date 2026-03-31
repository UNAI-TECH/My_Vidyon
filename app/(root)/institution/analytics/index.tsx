import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionAnalytics } from '../../../../src/hooks/useInstitutionAnalytics';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  IndianRupee,
  Activity,
  ArrowUpRight,
  School
} from 'lucide-react-native';
import { 
  LineChart, 
  BarChart, 
  PieChart 
} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#3B82F6"
  },
  verticalLabelRotation: 60,
  formatXLabel: (label: string) => label
};

export default function AnalyticsScreen() {
  const { institutionId } = useAuth();
  const { data: analytics, isLoading } = useInstitutionAnalytics(institutionId);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!analytics) return null;

  const pieData = [
    { name: 'Paid', population: analytics.fees.distribution[0].value, color: '#10b981', legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Pending', population: analytics.fees.distribution[1].value, color: '#f59e0b', legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Overdue', population: analytics.fees.distribution[2].value, color: '#ef4444', legendFontColor: '#64748b', legendFontSize: 12 },
  ];

  const lineData = {
    labels: analytics.attendance.trend.map((d, i) => i % 2 === 0 ? d.date : ''),
    datasets: [{
      data: analytics.attendance.trend.map(d => d.percentage),
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      strokeWidth: 2
    }]
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Analytics" 
        subtitle="Institution performance insights" 
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Metric Cards */}
        <View style={styles.grid}>
          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Students</Text>
              <Users size={16} color={theme.colors.textMuted} {...({} as any)} />
            </View>
            <Text style={styles.cardValue}>{analytics.counts.students}</Text>
            <View style={styles.trendRow}>
              <ArrowUpRight size={12} color="#10b981" {...({} as any)} />
              <Text style={styles.trendText}>+0% Active</Text>
            </View>
          </View>

          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Faculty</Text>
              <GraduationCap size={16} color={theme.colors.textMuted} {...({} as any)} />
            </View>
            <Text style={styles.cardValue}>{analytics.counts.staff}</Text>
            <View style={styles.trendRow}>
              <Activity size={12} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.trendText}>On Duty</Text>
            </View>
          </View>

          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Revenue</Text>
              <IndianRupee size={16} color={theme.colors.textMuted} {...({} as any)} />
            </View>
            <Text style={styles.cardValue}>₹{(analytics.fees.totalRevenue / 1000).toFixed(1)}k</Text>
            <View style={styles.trendRow}>
              <TrendingUp size={12} color="#10b981" {...({} as any)} />
              <Text style={styles.trendText}>{analytics.fees.collectionRate}% Rate</Text>
            </View>
          </View>

          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Attendance</Text>
              <Activity size={16} color={theme.colors.textMuted} {...({} as any)} />
            </View>
            <Text style={styles.cardValue}>{analytics.attendance.overallPercentage}%</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>Avg This Week</Text>
            </View>
          </View>
        </View>

        {/* Attendance Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Attendance Trend</Text>
          <View style={styles.card}>
            <LineChart
              data={lineData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
              fromZero
              yAxisSuffix="%"
            />
          </View>
        </View>

        {/* Fee Distribution */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Fee Payment Status</Text>
          <View style={styles.card}>
            <PieChart
              data={pieData}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  metricCard: { width: '48%', gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  cardValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 10, color: theme.colors.textMuted },
  chartSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, marginLeft: 4 },
  chartStyle: { marginVertical: 8, borderRadius: 16 }
});
