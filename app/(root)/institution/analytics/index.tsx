import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionAnalytics } from '../../../../src/hooks/useInstitutionAnalytics';
import { 
  TrendingUp, 
  IndianRupee,
  CreditCard,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart2,
  PieChart as PieIcon,
  Calendar
} from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';

export default function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const chartWidth = isDesktop ? Math.min(width - 320, 960) : width - 36;

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

  const totalInvoiced = analytics.fees.totalDue || 0;
  const totalCollected = analytics.fees.totalRevenue || 0;
  const totalConcessions = analytics.fees.totalConcessions || 0;
  const outstandingBal = analytics.fees.outstandingBalance ?? Math.max(0, totalInvoiced - totalCollected - totalConcessions);
  const collectionRate = analytics.fees.collectionRate || 0;

  // 7-day revenue trend calculations
  const revenueDays: { date: string; amount: number }[] = analytics.fees.revenueTrend || [];
  const sevenDayTotal = revenueDays.reduce((sum, d) => sum + (d.amount || 0), 0);
  const maxDailyRevenue = Math.max(...revenueDays.map((d) => d.amount || 0), 0);

  // Fee Status Distribution
  const feeDist = analytics.fees.distribution || [
    { name: 'Paid', value: 0 },
    { name: 'Pending', value: 0 },
    { name: 'Overdue', value: 0 },
  ];

  const paidCount = feeDist[0]?.value || 0;
  const pendingCount = feeDist[1]?.value || 0;
  const overdueCount = feeDist[2]?.value || 0;
  const totalSchedules = paidCount + pendingCount + overdueCount;

  const paidPct = totalSchedules > 0 ? Math.round((paidCount / totalSchedules) * 100) : 0;
  const pendingPct = totalSchedules > 0 ? Math.round((pendingCount / totalSchedules) * 100) : 0;
  const overduePct = totalSchedules > 0 ? Math.max(0, 100 - paidPct - pendingPct) : 0;

  const safePieData = [
    { name: 'Paid', population: paidCount, color: '#10B981', legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Pending', population: pendingCount, color: '#F59E0B', legendFontColor: '#64748b', legendFontSize: 12 },
    { name: 'Overdue', population: overdueCount, color: '#EF4444', legendFontColor: '#64748b', legendFontSize: 12 },
  ].filter((p) => p.population > 0);

  const pieChartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Financial Analytics" 
        subtitle="Revenue realization, collections velocity, and outstanding fee breakdown" 
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Metric Cards */}
        <View style={styles.grid}>
          {/* Card 1: Total Invoiced */}
          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Total Invoiced</Text>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <CreditCard size={18} color="#2563EB" {...({} as any)} />
              </View>
            </View>
            <Text style={styles.cardValue}>₹{totalInvoiced.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>Total Student Fee Demand</Text>
            </View>
          </View>

          {/* Card 2: Total Collected */}
          <View style={[styles.card, styles.metricCard, { borderColor: '#BBF7D0' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Total Collected</Text>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <IndianRupee size={18} color="#10B981" {...({} as any)} />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#047857' }]}>₹{totalCollected.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <TrendingUp size={12} color="#10B981" {...({} as any)} />
              <Text style={[styles.trendText, { color: '#10B981', fontWeight: 'bold' }]}>
                {collectionRate}% Realized
              </Text>
            </View>
          </View>

          {/* Card 3: Concessions */}
          <View style={[styles.card, styles.metricCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Concessions Given</Text>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Tag size={18} color="#D97706" {...({} as any)} />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#B45309' }]}>₹{totalConcessions.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <Text style={styles.trendText}>Approved Discounts & Waivers</Text>
            </View>
          </View>

          {/* Card 4: Outstanding Balance */}
          <View style={[styles.card, styles.metricCard, { borderColor: outstandingBal > 0 ? '#FECACA' : '#F1F5F9' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Outstanding Balance</Text>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                <AlertCircle size={18} color="#DC2626" {...({} as any)} />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#B91C1C' }]}>₹{outstandingBal.toLocaleString('en-IN')}</Text>
            <View style={styles.trendRow}>
              <Text style={[styles.trendText, { color: '#DC2626' }]}>Pending collections</Text>
            </View>
          </View>
        </View>

        {/* Daily Revenue Collections Trend (Native Responsive Bar Chart) */}
        <View style={styles.chartSection}>
          <View style={styles.chartSectionHeader}>
            <BarChart2 size={18} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.sectionTitle}>Daily Fee Collections (Last 7 Days)</Text>
          </View>
          <View style={styles.card}>
            {/* Summary Header Strip */}
            <View style={styles.chartSummaryStrip}>
              <View>
                <Text style={styles.chartSummaryLabel}>Past 7 Days Realized</Text>
                <Text style={styles.chartSummaryValue}>₹{sevenDayTotal.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.chartSummaryLabel}>Peak Daily Collection</Text>
                <Text style={[styles.chartSummaryValue, { color: '#047857' }]}>
                  ₹{maxDailyRevenue.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Custom Responsive Vertical Bars */}
            <View style={styles.barChartContainer}>
              {revenueDays.map((item, idx) => {
                const heightPct = maxDailyRevenue > 0 ? Math.round((item.amount / maxDailyRevenue) * 100) : 0;
                const barHeight = Math.max(8, Math.round((heightPct / 100) * 130));
                const isPeak = item.amount > 0 && item.amount === maxDailyRevenue;

                return (
                  <View key={item.date || idx} style={styles.barCol}>
                    <Text style={[styles.barAmountText, isPeak && { color: '#047857', fontWeight: 'bold' }]}>
                      {item.amount > 0 ? (item.amount >= 1000 ? `₹${(item.amount / 1000).toFixed(0)}k` : `₹${item.amount}`) : '—'}
                    </Text>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            height: barHeight,
                            backgroundColor: isPeak ? '#10B981' : item.amount > 0 ? '#FAB75A' : '#E2E8F0'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.barDateLabel, isPeak && { fontWeight: '700', color: theme.colors.text }]}>
                      {item.date}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Fee Payment Status Breakdown */}
        <View style={styles.chartSection}>
          <View style={styles.chartSectionHeader}>
            <PieIcon size={18} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.sectionTitle}>Fee Schedule Status Breakdown</Text>
          </View>
          <View style={styles.card}>
            {/* Visual Multi-segment Progress Bar */}
            <View style={styles.segmentBar}>
              <View 
                style={[
                  styles.segment, 
                  { 
                    flex: Math.max(paidCount, totalSchedules === 0 ? 1 : 0), 
                    backgroundColor: totalSchedules === 0 ? '#E2E8F0' : '#10B981' 
                  }
                ]} 
              />
              <View 
                style={[
                  styles.segment, 
                  { 
                    flex: Math.max(pendingCount, 0), 
                    backgroundColor: '#F59E0B' 
                  }
                ]} 
              />
              <View 
                style={[
                  styles.segment, 
                  { 
                    flex: Math.max(overdueCount, 0), 
                    backgroundColor: '#EF4444' 
                  }
                ]} 
              />
            </View>

            {/* Status Breakdown Legend & Counts */}
            <View style={styles.legendGrid}>
              <View style={[styles.legendBox, { borderLeftColor: '#10B981' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="#10B981" {...({} as any)} />
                  <Text style={styles.legendTitle}>Paid in Full</Text>
                </View>
                <Text style={styles.legendCount}>{paidCount} Schedules</Text>
                <Text style={styles.legendPct}>{paidPct}% of total</Text>
              </View>

              <View style={[styles.legendBox, { borderLeftColor: '#F59E0B' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#F59E0B" {...({} as any)} />
                  <Text style={styles.legendTitle}>Pending / Partial</Text>
                </View>
                <Text style={styles.legendCount}>{pendingCount} Schedules</Text>
                <Text style={styles.legendPct}>{pendingPct}% of total</Text>
              </View>

              <View style={[styles.legendBox, { borderLeftColor: '#EF4444' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} color="#EF4444" {...({} as any)} />
                  <Text style={styles.legendTitle}>Overdue</Text>
                </View>
                <Text style={styles.legendCount}>{overdueCount} Schedules</Text>
                <Text style={styles.legendPct}>{overduePct}% of total</Text>
              </View>
            </View>

            {/* Safe PieChart if data exists */}
            {safePieData.length > 0 && (
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <PieChart
                  data={safePieData}
                  width={chartWidth}
                  height={190}
                  chartConfig={pieChartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  center={[10, 0]}
                  absolute
                />
              </View>
            )}
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
  scrollContent: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  metricCard: { flex: 1, minWidth: 200, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 11, color: theme.colors.textMuted },
  chartSection: { marginBottom: 24 },
  chartSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  chartSummaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chartSummaryLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  chartSummaryValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 190,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barAmountText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textAlign: 'center',
  },
  barTrack: {
    width: 28,
    height: 130,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barDateLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  segmentBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#F1F5F9',
  },
  segment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  legendCount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 4,
  },
  legendPct: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
