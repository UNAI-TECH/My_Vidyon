import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { TrendingUp, FileText, Download } from 'lucide-react-native';

export default function AccountantReports() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Financial Reports" 
        subtitle="Strategic collection & revenue analytics"
      />
      
      <View style={styles.statsGrid}>
        <StatCard title="Daily Target" value="₹85k / ₹1L" icon={TrendingUp} iconColor="#3B82F6" />
        <StatCard title="Total Collected" value="₹12.4Cr" icon={FileText} iconColor="#10B981" />
      </View>

      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>Detailed financial reports for the current fiscal year will be populated here as soon as transactions are finalized.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  placeholderCard: { backgroundColor: 'white', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  placeholderText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
