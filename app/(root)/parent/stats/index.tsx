import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { BarChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { useAuth } from '../../../../src/hooks/useAuth';
import { AlertCircle, ChevronDown } from 'lucide-react-native';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';

const screenWidth = Dimensions.get('window').width;

export default function ParentStats() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // 1. Fetch Children
  const { data: children = [], isLoading: isChildrenLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name')
        .eq('parent_id', user?.id as string);
      const studentData = (data || []) as any[];
      if (studentData.length > 0 && !selectedChildId) {
        setSelectedChildId(studentData[0].id);
      }
      return studentData;
    },
    enabled: !!user?.id,
  });

  // 2. Fetch Stats for Selected Child(ren)
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['parent-student-stats', selectedChildId, children.map(c => c.id).join(',')],
    queryFn: async () => {
      const activeIds = selectedChildId ? [selectedChildId] : children.map(c => c.id);
      if (activeIds.length === 0) return null;

      // Attendance by month (last 4 months)
      const { data: att } = await supabase
        .from('student_attendance')
        .select('student_id, attendance_date, status')
        .in('student_id', activeIds)
        .order('attendance_date', { ascending: false });
      
      // Group by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData: Record<string, { total: number; present: number }> = {};
      
      ((att || []) as any[]).forEach(a => {
        const month = months[new Date(a.attendance_date).getMonth()];
        if (!monthlyData[month]) monthlyData[month] = { total: 0, present: 0 };
        monthlyData[month].total++;
        if (a.status === 'present') monthlyData[month].present++;
      });

      const labels = Object.keys(monthlyData).slice(-4);
      const values = labels.map(l => Math.round((monthlyData[l].present / monthlyData[l].total) * 100));

      // Key Metrics
      const { data: grades } = await supabase
        .from('grades')
        .select('grade')
        .in('student_id', activeIds);
      
      const { data: fees } = await supabase
        .from('student_fees')
        .select('status')
        .in('student_id', activeIds);

      return {
        chartData: {
          labels: labels.length > 0 ? labels : ["No Data"],
          datasets: [{ data: values.length > 0 ? values : [0] }]
        },
        metrics: [
          { label: 'Avg Grade', value: (grades as any[])?.[0]?.grade || 'N/A', color: '#10B981' },
          { label: 'Attendance', value: values.length > 0 ? `${values[values.length-1]}%` : 'N/A', color: '#3B82F6' },
          { label: 'Fee Status', value: ((fees || []) as any[]).some(f => f.status === 'pending') ? 'Pending' : 'Cleared', color: '#A855F7' },
        ]
      };
    },
    enabled: children.length > 0,
  });

  if (isChildrenLoading || (selectedChildId && isStatsLoading)) {
    return <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Child Performance" subtitle="Real-time academic analytics and trends" />

      {children.length > 1 && (
        <View style={styles.childSelector}>
          <Text style={styles.selectorLabel}>Switch View:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            <TouchableOpacity 
              onPress={() => setSelectedChildId(null)}
              style={[styles.childChip, selectedChildId === null && styles.childChipActive]}
            >
              <Text style={[styles.childChipText, selectedChildId === null && styles.childChipTextActive]}>All Children</Text>
            </TouchableOpacity>
            {children.map((c: any) => (
              <TouchableOpacity 
                key={c.id} 
                onPress={() => setSelectedChildId(c.id)}
                style={[styles.childChip, selectedChildId === c.id && styles.childChipActive]}
              >
                <Text style={[styles.childChipText, selectedChildId === c.id && styles.childChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {stats ? (
        <>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Attendance Trend (%)</Text>
            <BarChart
              data={stats.chartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              }}
              style={styles.chart}
            />
          </View>

          <View style={styles.statsList}>
            <Text style={styles.sectionTitle}>Key Performance Metrics</Text>
            {stats.metrics.map((m, i) => (
              <View key={i} style={styles.statRow}>
                <Text style={styles.statLabel}>{m.label}</Text>
                <View style={[styles.badge, { backgroundColor: m.color + '15' }]}>
                  <Text style={[styles.badgeText, { color: m.color }]}>{m.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <AlertCircle size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No data available for the selected child.</Text>
        </View>
      )}

      <AdBanner type="PARENT" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  childSelector: { marginBottom: 24 },
  selectorLabel: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 },
  selectorScroll: { flexDirection: 'row' },
  childChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  childChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  childChipText: { fontSize: 13, color: theme.colors.text },
  childChipTextActive: { color: 'white', fontWeight: 'bold' },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chart: { marginVertical: 8, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  statsList: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  statLabel: { fontSize: 14, color: theme.colors.text },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: 'bold' },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { marginTop: 12, color: theme.colors.textMuted, textAlign: 'center' }
});
