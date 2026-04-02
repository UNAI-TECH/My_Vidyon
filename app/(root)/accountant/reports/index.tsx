import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { TrendingUp, FileText, Download, Target, Wallet } from 'lucide-react-native';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useAccountantDashboard } from '../../../../src/hooks/useAccountantDashboard';
import { generateFinancialReport } from '../../../../src/utils/reportGenerator';

export default function AccountantReports() {
  const { institutionId } = useAuth();
  const { stats, institution, isLoading } = useAccountantDashboard(institutionId || undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    await generateFinancialReport(stats, institution?.name, institution?.logo_url);
    setIsGenerating(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Financial Reports" 
        subtitle="Strategic collection & revenue analytics"
      />
      
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard 
              title="Total Collected" 
              value={`₹${((stats?.totalRevenue || 0) / 100000).toFixed(2)}L`} 
              icon={TrendingUp} 
              iconColor="#10B981" 
              change="Verified payments" 
            />
            <StatCard 
              title="Outstanding Dues" 
              value={`₹${((stats?.outstandingAmount || 0) / 100000).toFixed(2)}L`} 
              icon={Wallet} 
              iconColor="#F59E0B" 
              change="Pending collection" 
            />
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <View style={styles.iconBox}>
                <Target size={20} color={theme.colors.primary} {...({} as any)}/>
              </View>
              <View>
                <Text style={styles.analyticsTitle}>Collection Rate</Text>
                <Text style={styles.analyticsSubtitle}>Total Revenue vs Target</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { 
                width: `${stats?.totalRevenue > 0 ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingAmount)) * 100) : 0}%` 
              }]} />
            </View>
            <View style={styles.analyticsFooter}>
              <Text style={styles.analyticsValue}>
                {stats?.totalRevenue > 0 ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingAmount)) * 100) : 0}%
              </Text>
              <Text style={styles.analyticsTotal}>of Total Dues ({stats.transactionCount} transactions)</Text>
            </View>
          </View>

          {/* Download Action */}
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              A comprehensive financial summary report containing detailed transaction logs, revenue breakdown, and outstanding dues history is available for your records.
            </Text>
            <TouchableOpacity 
              style={[styles.actionBtn, isGenerating && { opacity: 0.7 }]} 
              onPress={handleDownloadReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Download size={18} color="white" {...({} as any)} />
                  <Text style={styles.actionBtnText}>Export PDF Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' },
  placeholderCard: { backgroundColor: 'white', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  placeholderText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  actionBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  analyticsCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#eff6ff', marginBottom: 24 },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  analyticsTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  analyticsSubtitle: { fontSize: 12, color: theme.colors.textMuted },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  analyticsFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyticsValue: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  analyticsTotal: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
});
