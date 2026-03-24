import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Award, TrendingUp, BookOpen, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';

const screenWidth = Dimensions.get('window').width;

export default function StudentGrades() {
  const { user, institutionId } = useAuth();

  // 1. Resolve internal student_id
  const { data: student } = useQuery({
    queryKey: ['student-profile-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user?.id || '')
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!user?.id
  });

  // 2. Fetch Results
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['student-results-page', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      
      // Fetch results
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select(`*`)
        .eq('student_id', student.id)
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false });
      
      if (resultsError) throw resultsError;
      if (!resultsData || resultsData.length === 0) return [];

      const resultsList = resultsData as any[];

      // Fetch related data manually since joins are failing due to missing FKs
      const subjectIds = [...new Set(resultsList.map(r => r.subject_id))];
      const examIds = [...new Set(resultsList.map(r => r.exam_id))];

      const [{ data: subjectsData }, { data: examsData }] = await Promise.all([
        supabase.from('subjects').select('id, name').in('id', subjectIds),
        supabase.from('exam_schedules').select('id, exam_display_name, exam_type').in('id', examIds)
      ]);

      const subjectsList = (subjectsData || []) as any[];
      const examsList = (examsData || []) as any[];

      // Map them back
      return resultsList.map(r => ({
        ...r,
        subjects: subjectsList.find(s => s.id === r.subject_id),
        exam_schedules: examsList.find(e => e.id === r.exam_id)
      }));
    },
    enabled: !!student?.id
  });

  const calculateGrade = (score: number, max: number) => {
    const p = (score / max) * 100;
    if (p >= 90) return { label: 'A+', color: '#166534' };
    if (p >= 80) return { label: 'A', color: '#166534' };
    if (p >= 70) return { label: 'B+', color: '#3b82f6' };
    if (p >= 60) return { label: 'C', color: '#854d0e' };
    if (p >= 50) return { label: 'D', color: '#854d0e' };
    return { label: 'F', color: '#991b1b' };
  };

  const processedResults = results.map((r: any) => ({
    ...r,
    gradeInfo: calculateGrade(r.total_marks, r.max_marks)
  }));

  // Group by subject to show trend if multiple scores exist
  // For now, let's just use the latest results to populate the chart
  const chartData = {
    labels: (results || []).slice(0, 5).reverse().map((r: any) => r.subjects?.name.substring(0, 3) || ''),
    datasets: [{
      data: (results || []).slice(0, 5).reverse().map((r: any) => (r.total_marks / r.max_marks) * 100)
    }]
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Grades & Performance" subtitle="Progressive track of your academic journey" />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {results.length > 0 ? (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Latest Performance (Percentage)</Text>
              <BarChart
                data={chartData.labels.length > 0 ? chartData : { labels: ['No Data'], datasets: [{ data: [0] }] }}
                width={screenWidth - 48}
                height={200}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForBackgroundLines: { strokeDasharray: '' }
                }}
                fromZero
                style={styles.chart}
              />
            </View>

            <Text style={styles.sectionTitle}>Detailed Results</Text>
            {processedResults.map((item: any) => (
              <View key={item.id} style={styles.gradeCard}>
                <View style={styles.gradeInfo}>
                  <Text style={styles.examName}>{item.exam_schedules?.exam_display_name}</Text>
                  <Text style={styles.subject}>{item.subjects?.name}</Text>
                  <Text style={styles.marks}>{item.total_marks} / {item.max_marks}</Text>
                </View>
                <View style={styles.gradeBadge}>
                  <Text style={[styles.gradeText, { color: item.gradeInfo.color }]}>{item.gradeInfo.label}</Text>
                  <Text style={styles.typeText}>{item.exam_schedules?.exam_type}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.empty}>
            <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyTitle}>No Grades Available</Text>
            <Text style={styles.emptySub}>Examination results will appear here once they are published.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 100 },
  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  chart: { borderRadius: 16, marginTop: 8, marginLeft: -16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  gradeCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.04, shadowRadius:6 },
  gradeInfo: { flex: 1 },
  examName: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  subject: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  marks: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
  gradeBadge: { alignItems: 'flex-end', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  gradeText: { fontSize: 24, fontWeight: '900' },
  typeText: { fontSize: 9, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }
});
