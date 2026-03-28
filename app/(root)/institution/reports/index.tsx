import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  FileText, 
  Users, 
  GraduationCap, 
  IndianRupee, 
  Download, 
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink
} from 'lucide-react-native';
import { useInstitutionReports, exportToExcel, useReportHistory, ReportRow } from '../../../../src/hooks/useInstitutionReports';
import { format } from 'date-fns';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const REPORT_CATEGORIES = [
  {
    id: 'students',
    title: 'Student Reports',
    icon: Users,
    reports: [
      { id: 's1', name: 'Enrollment Directory', description: 'Full student list with parent contact details' },
    ]
  },
  {
    id: 'faculty',
    title: 'Faculty Reports',
    icon: GraduationCap,
    reports: [
      { id: 'f1', name: 'Staff Directory', description: 'Detailed list of all faculty and staff' },
    ]
  },
  {
    id: 'finances',
    title: 'Financial Reports',
    icon: IndianRupee,
    reports: [
      { id: 'fin1', name: 'Fee Collection Ledger', description: 'Student-wise paid vs due amounts' },
    ]
  }
];

export default function ReportsScreen() {
  const { institutionId } = useAuth();
  const [activeCategory, setActiveCategory] = useState('students');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const { data: reportsData, isLoading } = useInstitutionReports(institutionId, academicYear);
  const { data: history, refetch: refetchHistory } = useReportHistory(institutionId);

  const handleGenerate = async (reportId: string) => {
    if (!reportsData || !institutionId) {
      Alert.alert("Wait", "Report data is still loading from the database...");
      return;
    }
    
    setIsGenerating(reportId);
    
    try {
      let exportData: any[] = [];
      let fileName = "";
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');

      switch (reportId) {
        case 's1': // Enrollment Directory
          exportData = reportsData.enrollment.map(s => ({
            'Register No': s.register_number,
            'Student Name': s.name,
            'Class': s.class_name,
            'Section': s.section,
            'Parent Name': s.parent_name,
            'Parent Contact': s.parent_phone,
            'Status': s.is_active ? 'Active' : 'Inactive'
          }));
          fileName = `Student_Directory_${academicYear}_${timestamp}`;
          break;
        case 'f1': // Staff Directory
          exportData = reportsData.faculty.map(f => ({
            'Staff ID': f.staff_id || 'N/A',
            'Full Name': f.full_name || 'Unnamed Staff',
            'Department': f.department || 'General',
            'Role': f.role ? f.role.charAt(0).toUpperCase() + f.role.slice(1) : 'Staff',
            'Contact': f.phone || 'N/A'
          }));
          fileName = `Staff_Directory_${timestamp}`;
          break;
        case 'fin1': // Fee Ledger
          exportData = reportsData.fees.map(f => ({
            'Student Name': f.student_name,
            'Class': f.class_name,
            'Section': f.section,
            'Amount Due': f.amount_due,
            'Amount Paid': f.amount_paid,
            'Outstanding': f.amount_due - f.amount_paid,
            'Payment Status': f.status.toUpperCase()
          }));
          fileName = `Fee_Ledger_${academicYear}_${timestamp}`;
          break;
        default:
          Alert.alert("Coming Soon", "Detailed mapping for this report is in progress.");
          setIsGenerating(null);
          return;
      }

      if (exportData.length === 0) {
        Alert.alert("No Data", "No records found in the database for this academic year.");
      } else {
        await exportToExcel(exportData, fileName, institutionId, activeCategory);
        refetchHistory();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to process database records. Please try again.");
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Reports" 
        subtitle="Download institutional data from database" 
      />

      {/* Academic Year Selector */}
      <View style={styles.yearSelector}>
        <View style={styles.yearHeader}>
          <Calendar size={16} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.yearTitle}>Select Academic Year</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
          {ACADEMIC_YEARS.map(year => (
            <TouchableOpacity 
              key={year} 
              style={[styles.yearChip, academicYear === year && styles.activeYearChip]}
              onPress={() => setAcademicYear(year)}
            >
              <Text style={[styles.yearChipText, academicYear === year && styles.activeYearChipText]}>{year}</Text>
              {academicYear === year && <CheckCircle2 size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} {...({} as any)} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {REPORT_CATEGORIES.map(cat => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.tab, activeCategory === cat.id && styles.activeTab]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <cat.icon size={18} color={activeCategory === cat.id ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
            <Text style={[styles.tabText, activeCategory === cat.id && styles.activeTabText]} numberOfLines={1}>
              {cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Fetching data from database...</Text>
          </View>
        ) : (
          <>
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
                disabled={isGenerating !== null}
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
                      <Download size={18} color={theme.colors.primary} {...({} as any)} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.recentExports}>
              <View style={styles.recentHeader}>
                <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.recentTitle}>Exported Documents (.xlsx)</Text>
              </View>
              
              {(history || []).length > 0 ? (
                (history as ReportRow[]).map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.historyItem}
                    onPress={() => Linking.openURL(item.url)}
                  >
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.historyDate}>{format(new Date(item.generated_at), 'MMM dd, yyyy HH:mm')}</Text>
                    </View>
                    <ExternalLink size={14} color={theme.colors.primary} {...({} as any)} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    No recent exports. When you click download, the database data will be formatted into an Excel document and stored here.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  yearSelector: { backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  yearTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  yearScroll: { gap: 10 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  activeYearChip: { backgroundColor: '#3B82F610', borderColor: theme.colors.primary },
  yearChipText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  activeYearChipText: { color: theme.colors.primary, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  activeTab: { backgroundColor: '#3B82F615' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loaderText: { marginTop: 12, fontSize: 14, color: theme.colors.textMuted },
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
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyInfo: { flex: 1, gap: 2 },
  historyName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  historyDate: { fontSize: 12, color: theme.colors.textMuted },
  infoBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, marginTop: 12 },
  infoText: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 20 }
});
