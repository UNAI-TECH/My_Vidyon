import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { useAuth } from '../../../src/hooks/useAuth';
import { useAccountantDashboard } from '../../../src/hooks/useAccountantDashboard';
import {
  CreditCard,
  TrendingUp,
  Clock,
  FileText,
  DollarSign,
  Download,
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../src/components/common/ShortcutGrid';

export default function AccountantDashboard() {
  const { institutionId } = useAuth();
  const { stats, isLoading } = useAccountantDashboard(institutionId || undefined);

  if (isLoading) return <View style={styles.container}><Text>Loading Financial Data...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="Financial Management"
        subtitle="Accountant Control Center"
        actions={<NotificationBell />}
      />

      <View style={styles.section}>
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
          value={`₹${(stats.totalRevenue/100000).toFixed(1)}L`}
          icon={TrendingUp}
          iconColor="#10B981"
        />
        <StatCard
          title="Outstanding"
          value={`₹${(stats.outstandingAmount/100000).toFixed(1)}L`}
          icon={Clock}
          iconColor="#EF4444"
        />
        <StatCard
          title="Transactions"
          value={stats.transactionCount.toString()}
          icon={CreditCard}
          iconColor="#3B82F6"
        />
        <StatCard
          title="Recent Pay"
          value={stats.recentPayments.length.toString()}
          icon={FileText}
          iconColor="#F59E0B"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        <View style={styles.transactionList}>
          {stats.recentPayments.length > 0 ? (
            stats.recentPayments.map((trans, index) => (
              <View key={index} style={styles.transaction}>
                <View style={styles.transIcon}>
                  <DollarSign size={20} color="#10B981" {...({} as any)} />
                </View>
                <View style={styles.transContent}>
                  <Text style={styles.transTitle}>{trans.students?.name || 'Unknown Student'}</Text>
                  <Text style={styles.transDate}>{new Date(trans.payment_date).toLocaleDateString()} • {trans.status}</Text>
                </View>
                <Text style={styles.transAmount}>₹{trans.amount_paid?.toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textMuted }}>No recent payments found.</Text>
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
  content: { padding: 24 },
  section: { marginBottom: 24, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
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
});
