import React, { useState, useMemo, useEffect } from 'react';
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
  ExternalLink,
  Receipt,
  AlertCircle,
  Tag
} from 'lucide-react-native';
import { useInstitutionReports, exportToExcel, useReportHistory, ReportRow } from '../../../../src/hooks/useInstitutionReports';
import { format } from 'date-fns';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

const ALL_REPORT_CATEGORIES = [
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
      { id: 'fin1', name: 'Fee Collection Ledger', description: 'Complete student-wise invoiced, paid, concession and outstanding balance' },
      { id: 'fin2', name: 'Outstanding Defaulters List', description: 'Students with pending or overdue fee balances requiring collection' },
      { id: 'fin3', name: 'Concessions & Waivers Ledger', description: 'List of students with approved merit, sibling or management fee waivers' },
    ]
  }
];

export default function ReportsScreen() {
  const { institutionId, role } = useAuth();
  const isFinanceRole = role === 'accountant' || role === 'finance';

  const categories = useMemo(() => {
    if (isFinanceRole) {
      return ALL_REPORT_CATEGORIES.filter((c) => c.id === 'finances');
    }
    return ALL_REPORT_CATEGORIES;
  }, [isFinanceRole]);

  const [activeCategory, setActiveCategory] = useState(isFinanceRole ? 'finances' : 'students');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (isFinanceRole) {
      setActiveCategory('finances');
    }
  }, [isFinanceRole]);

  const { data: reportsData, isLoading } = useInstitutionReports(institutionId, academicYear);
  const { data: history, refetch: refetchHistory } = useReportHistory(institutionId);

  // Filter exported document history: for finance, strictly show finance/fee documents
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (isFinanceRole) {
      return (history as ReportRow[]).filter((item) => {
        const t = (item.type || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        return t === 'finances' || title.includes('fee') || title.includes('ledger') || title.includes('financ') || title.includes('defaulter') || title.includes('concession');
      });
    }
    return history as ReportRow[];
  }, [history, isFinanceRole]);

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
            'Concession': f.concession_amount || 0,
            'Outstanding Due': f.outstanding !== undefined ? f.outstanding : Math.max(0, f.amount_due - f.amount_paid - (f.concession_amount || 0)),
            'Payment Status': f.status.toUpperCase()
          }));
          fileName = `Fee_Ledger_${academicYear}_${timestamp}`;
          break;

        case 'fin2': // Outstanding Defaulters
          exportData = reportsData.fees
            .filter(f => (f.outstanding !== undefined ? f.outstanding : (f.amount_due - f.amount_paid - (f.concession_amount || 0))) > 0)
            .map(f => ({
              'Student Name': f.student_name,
              'Class': f.class_name,
              'Section': f.section,
              'Total Fee': f.amount_due,
              'Amount Paid': f.amount_paid,
              'Concession': f.concession_amount || 0,
              'Outstanding Balance': f.outstanding !== undefined ? f.outstanding : Math.max(0, f.amount_due - f.amount_paid - (f.concession_amount || 0)),
              'Status': f.status.toUpperCase()
            }));
          fileName = `Fee_Defaulters_${academicYear}_${timestamp}`;
          break;

        case 'fin3': // Concessions & Waivers Ledger
          exportData = reportsData.fees
            .filter(f => (f.concession_amount || 0) > 0)
            .map(f => ({
              'Student Name': f.student_name,
              'Class': f.class_name,
              'Section': f.section,
              'Invoiced Amount': f.amount_due,
              'Concession Granted': f.concession_amount || 0,
              'Net Payable': Math.max(0, f.amount_due - (f.concession_amount || 0)),
              'Amount Paid': f.amount_paid,
              'Remaining Balance': f.outstanding !== undefined ? f.outstanding : Math.max(0, f.amount_due - f.amount_paid - (f.concession_amount || 0)),
              'Status': f.status.toUpperCase()
            }));
          fileName = `Fee_Concessions_${academicYear}_${timestamp}`;
          break;

        default:
          Alert.alert("Notice", "Detailed mapping for this report is in progress.");
          setIsGenerating(null);
          return;
      }

      if (exportData.length === 0) {
        Alert.alert("No Records", `No records found in the database for ${academicYear}.`);
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

  const activeGroup = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <View style={styles.container}>
      <PageHeader 
        title={isFinanceRole ? "Financial Reports & Ledgers" : "Reports"} 
        subtitle={isFinanceRole ? "Download student fee ledgers, defaulters lists, and financial audit spreadsheets" : "Download institutional data from database"} 
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

      {/* Category Tabs: only shown when multiple categories exist (hidden for finance) */}
      {categories.length > 1 && (
        <View style={styles.tabs}>
          {categories.map(cat => (
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
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Fetching data from database...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeGroup?.title || 'Available Reports'}
              </Text>
            </View>

            {activeGroup?.reports.map(report => (
              <TouchableOpacity 
                key={report.id} 
                style={styles.reportCard}
                onPress={() => handleGenerate(report.id)}
                disabled={isGenerating !== null}
              >
                <View style={styles.reportInfo}>
                  <View style={[styles.iconBox, isFinanceRole && { backgroundColor: '#FEF3C7' }]}>
                    {isFinanceRole ? (
                      <IndianRupee size={20} color="#D97706" {...({} as any)} />
                    ) : (
                      <FileText size={20} color={theme.colors.primary} {...({} as any)} />
                    )}
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
              
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
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
                    {isFinanceRole 
                      ? "No recent financial exports. When you click download, the fee ledger records will be formatted into an Excel spreadsheet and stored here."
                      : "No recent exports. When you click download, the database data will be formatted into an Excel document and stored here."}
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
