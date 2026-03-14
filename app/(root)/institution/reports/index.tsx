import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  FileText, 
  Users, 
  GraduationCap, 
  IndianRupee, 
  Download, 
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react-native';

const REPORT_CATEGORIES = [
  {
    id: 'students',
    title: 'Student Reports',
    icon: Users,
    reports: [
      { id: 's1', name: 'Enrollment Summary', description: 'New students joined this academic year' },
      { id: 's2', name: 'Attendance Record', description: 'Daily and monthly attendance trends' },
      { id: 's3', name: 'Academic Results', description: 'Consolidated performance overview' }
    ]
  },
  {
    id: 'faculty',
    title: 'Faculty Reports',
    icon: GraduationCap,
    reports: [
      { id: 'f1', name: 'Duty Rosters', description: 'Assigned classes and subjects summary' },
      { id: 'f2', name: 'Performance Review', description: 'Faculty-wise results and attendance' }
    ]
  },
  {
    id: 'finances',
    title: 'Financial Reports',
    icon: IndianRupee,
    reports: [
      { id: 'fin1', name: 'Fee Collection', description: 'Paid vs Pending fee summaries' },
      { id: 'fin2', name: 'Expense Logs', description: 'Institution maintenance and bills' }
    ]
  }
];

export default function ReportsScreen() {
  const { institutionId } = useAuth();
  const [activeCategory, setActiveCategory] = useState('students');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleGenerate = (reportId: string) => {
    setIsGenerating(reportId);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(null);
      alert("Report generated successfully and ready for download.");
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Reports" 
        subtitle="Manage & export institutional data" 
      />

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {REPORT_CATEGORIES.map(cat => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.tab, activeCategory === cat.id && styles.activeTab]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <cat.icon size={18} color={activeCategory === cat.id ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
            <Text style={[styles.tabText, activeCategory === cat.id && styles.activeTabText]}>
              {cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.title}
          </Text>
        </View>

        {REPORT_CATEGORIES.find(c => c.id === activeCategory)?.reports.map(report => (
          <TouchableOpacity 
            key={report.id} 
            style={styles.reportCard}
            onPress={() => handleGenerate(report.id)}
          >
            <View style={styles.reportInfo}>
              <View style={styles.iconBox}>
                <FileText size={20} color={theme.colors.primary} {...({} as any)} />
              </View>
              <View style={styles.textDetails}>
                <Text style={styles.reportName}>{report.name}</Text>
                <Text style={styles.reportDesc}>{report.description}</Text>
              </View>
            </View>
            
            <View style={styles.actionBtn}>
              {isGenerating === report.id ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.downloadIcon}>
                  <Download size={16} color={theme.colors.primary} {...({} as any)} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.recentExports}>
          <View style={styles.recentHeader}>
            <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.recentTitle}>Recently Exported</Text>
          </View>
          <View style={styles.recentItem}>
            <Text style={styles.recentName}>Attendance_Mar_14.pdf</Text>
            <Text style={styles.recentDate}>2 hours ago</Text>
          </View>
          <View style={styles.recentItem}>
            <Text style={styles.recentName}>Fee_Collection_Summary.xlsx</Text>
            <Text style={styles.recentDate}>Yesterday</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  activeTab: { backgroundColor: '#3B82F615' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  reportCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  reportInfo: { flex: 1, flexDirection: 'row', gap: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  textDetails: { flex: 1, gap: 2 },
  reportName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  reportDesc: { fontSize: 12, color: theme.colors.textMuted },
  actionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  downloadIcon: { padding: 8 },
  recentExports: { marginTop: 32, gap: 12 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  recentTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  recentName: { fontSize: 14, color: theme.colors.text },
  recentDate: { fontSize: 12, color: theme.colors.textMuted }
});
