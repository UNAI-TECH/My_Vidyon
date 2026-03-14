import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { BarChart } from 'react-native-chart-kit';
import { Award, TrendingUp, BookOpen } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function StudentGrades() {
  const grades = [
    { subject: 'Mathematics', grade: 'A+', marks: '94/100', trend: '+2%' },
    { subject: 'Physics', grade: 'A', marks: '88/100', trend: '-1%' },
    { subject: 'Chemistry', grade: 'B+', marks: '79/100', trend: '+5%' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Grades & Performance" subtitle="Progressive track of your academic journey" />
      
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>GPA Progression</Text>
        <BarChart
          data={{
            labels: ['Unit 1', 'Unit 2', 'Mid-Term', 'Unit 3'],
            datasets: [{ data: [3.2, 3.5, 3.8, 4.0] }]
          }}
          width={screenWidth - 80}
          height={180}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(250, 183, 90, ${opacity})`,
          }}
          style={styles.chart}
        />
      </View>

      <FlatList
        data={grades}
        keyExtractor={item => item.subject}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.gradeCard}>
            <View style={styles.gradeInfo}>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text style={styles.marks}>{item.marks}</Text>
            </View>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{item.grade}</Text>
              <Text style={[styles.trendText, { color: item.trend.startsWith('+') ? '#10B981' : '#EF4444' }]}>{item.trend}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chart: { borderRadius: 16 },
  list: { paddingBottom: 24 },
  gradeCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  gradeInfo: { flex: 1 },
  subject: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  marks: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  gradeBadge: { alignItems: 'flex-end' },
  gradeText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  trendText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 }
});
