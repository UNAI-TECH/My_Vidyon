import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function ParentStats() {
  const attendanceData = {
    labels: ["Math", "Science", "English", "History"],
    datasets: [{ data: [92, 88, 95, 84] }]
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Child Performance" subtitle="Detailed academic analytics and trends" />

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Attendance by Subject (%)</Text>
        <BarChart
          data={attendanceData}
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
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        {[
          { label: 'Overall GPA', value: '3.8 / 4.0', color: '#10B981' },
          { label: 'Class Rank', value: '5th / 45', color: '#3B82F6' },
          { label: 'Assignment Completion', value: '98%', color: '#A855F7' },
        ].map((m, i) => (
          <View key={i} style={styles.statRow}>
            <Text style={styles.statLabel}>{m.label}</Text>
            <View style={[styles.badge, { backgroundColor: m.color + '15' }]}>
              <Text style={[styles.badgeText, { color: m.color }]}>{m.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chart: { marginVertical: 8, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  statsList: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  statLabel: { fontSize: 14, color: theme.colors.text },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: 'bold' }
});
