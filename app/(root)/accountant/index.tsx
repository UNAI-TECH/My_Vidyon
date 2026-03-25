import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { AdCard } from '../../../src/components/common/AdCard';
import { useAuth } from '../../../src/hooks/useAuth';
import { useAccountantDashboard } from '../../../src/hooks/useAccountantDashboard';
import {
  CreditCard,
  TrendingUp,
  Clock,
  FileText,
  DollarSign,
  Download,
  Wifi,
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AccountantDashboard() {
  const { institutionId, role } = useAuth();
  const { stats, institution, isLoading } = useAccountantDashboard(institutionId || undefined);

  const welcomeName = stats.accountantProfile?.full_name || 'Accountant';

  if (isLoading) return <View style={styles.container}><Text>Loading Financial Data...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title={`Hello, ${welcomeName}!`}
        subtitle="Financial Control Center"
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || undefined}
        userAvatar={stats.accountantProfile?.image_url || undefined}
        userSubtitle="Financial Head"
        actions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.liveBadge}>
               <Wifi size={10} color="#10B981" {...({} as any)} />
               <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <NotificationBell />
          </View>
        }
      />

      <View style={{ paddingBottom: 16 }}>
        <AdCard 
          title="Streamline Your Finances" 
          description="Explore our automated fee collection and reconciliation tools."
        />
      </View>

      <View style={styles.section2}>
        <Text style={styles.sectionTitle}>Financial Console</Text>
        <ShortcutGrid items={[
          { label: 'Transactions', icon: CreditCard, href: '/(root)/accountant/transactions', color: '#3B82F6' },
          { label: 'Fee Structure', icon: FileText, href: '/(root)/accountant/fees', color: '#F97316' },
          { label: 'Reports', icon: TrendingUp, href: '/(root)/accountant/reports', color: '#10B981' },
          { label: 'Quick Bills', icon: Download, href: '/(root)/accountant/quick-bills', color: '#F59E0B' },
        ]} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Revenue (YTD)"
          value={`₹${(stats.totalRevenue/100000).toFixed(2)}L`}
          icon={TrendingUp}
          iconColor="#10B981"
          change="Real-time collection"
        />
        <StatCard
          title="Outstanding Dues"
          value={`₹${(stats.outstandingAmount/100000).toFixed(2)}L`}
          icon={Clock}
          iconColor="#EF4444"
          change="Pending collection"
        />
        <StatCard
          title="Total Transactions"
          value={stats.transactionCount.toString()}
          icon={CreditCard}
          iconColor="#3B82F6"
        />
        <StatCard
          title="Collection Rate"
          value={`${stats.totalRevenue > 0 ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingAmount)) * 100) : 0}%`}
          icon={FileText}
          iconColor="#F59E0B"
        />
      </View>

      {/* Fee Status Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Fee Collection Status Distribution</Text>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <PieChart
            data={stats.feeDistribution}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>

      <View style={styles.section2}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        <View style={styles.transactionList}>
          {stats.recentPayments.length > 0 ? (
            stats.recentPayments.map((trans, index) => (
              <View key={index} style={styles.transaction}>
                <View style={styles.transIcon}>
                  <DollarSign size={20} color="#10B981" {...({} as any)} />
                </View>
                <View style={styles.transContent}>
                  <Text style={styles.transTitle}>{trans.students?.name || 'Student'}</Text>
                  <Text style={styles.transDate}>
                    {new Date(trans.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.transAmount}>₹{trans.amount_paid?.toLocaleString()}</Text>
                  <Text style={{ fontSize: 9, color: '#10B981', fontWeight: 'bold' }}>SUCCESS</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <TrendingUp size={40} color="#E2E8F0" {...({} as any)} />
              <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>No recent payments found.</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <Download size={20} color="white" {...({} as any)} />
        <Text style={styles.actionButtonText}>Generate Daily Collection Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 40 },
  section2: { marginBottom: 24, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  transactionList: { backgroundColor: 'white', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  transaction: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  transIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  transContent: { flex: 1 },
  transTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  transDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  transAmount: { fontSize: 15, fontWeight: 'bold', color: '#10B981' },
  actionButton: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 },
  actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  liveBadge: { backgroundColor: '#10B98115', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveBadgeText: { fontSize: 8, fontWeight: 'bold', color: '#10B981' },
});
