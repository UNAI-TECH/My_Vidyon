import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Printer, Search, CreditCard, Send, User, Check, X, DollarSign, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useAccountantDashboard } from '../../../../src/hooks/useAccountantDashboard';
import { useInstitutionClasses } from '../../../../src/hooks/useInstitutionClasses';
import { useClassStudents } from '../../../../src/hooks/useClassStudents';
import { useFeeWorkflow } from '../../../../src/hooks/useFeeWorkflow';
import { generateInvoice } from '../../../../src/utils/invoiceGenerator';
import { AlertModal } from '../../../../src/components/common/AlertModal';

export default function AccountantQuickBills() {
  const { institutionId } = useAuth();
  const { stats, institution } = useAccountantDashboard(institutionId || undefined);
  const { data: classes = [] } = useInstitutionClasses(institutionId);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const { data: students = [], isLoading: isStudentsLoading } = useClassStudents(institutionId, selectedClass);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Miscellaneous Fees');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' as any });

  const { processQuickBill } = useFeeWorkflow();

  const filteredStudents = (students as any[]).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.register_number && s.register_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleGenerateBill = async () => {
    if (!institutionId || !selectedStudent || !amountStr || parseFloat(amountStr) <= 0) {
      showAlert('Error', 'Please select a student and enter a valid amount.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const amount = parseFloat(amountStr);
      const transactionId = await processQuickBill(institutionId, selectedStudent.id, amount, category);
      
      await generateInvoice(
        selectedStudent.name,
        selectedStudent.register_number,
        amount,
        category,
        transactionId,
        institution?.name,
        institution?.logo_url
      );

      // Reset
      setAmountStr('');
      setSelectedStudent(null);
      showAlert('Success', 'Quick bill recorded and invoice generated.', 'success');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to process quick bill', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Quick Billing" subtitle="Generate and print ad-hoc invoices instantly" />

      <View style={styles.card}>
        <Text style={styles.label}>Select Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {classes.map((cls: any) => (
            <TouchableOpacity 
              key={cls.id} 
              style={[styles.classChip, selectedClass === cls.name && styles.activeClassChip]}
              onPress={() => { setSelectedClass(cls.name); setSelectedStudent(null); setSearchQuery(''); }}
            >
              <Text style={[styles.classChipText, selectedClass === cls.name && styles.activeClassChipText]}>
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedClass && !selectedStudent && (
          <>
            <Text style={styles.label}>Select Student</Text>
            <View style={styles.searchBar}>
              <Search size={20} color={theme.colors.textMuted} {...({} as any)} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Name or Reg Number" 
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <View style={{ maxHeight: 200, marginBottom: 16 }}>
              {isStudentsLoading ? <ActivityIndicator /> : filteredStudents.map((s: any) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={styles.studentListItem}
                  onPress={() => setSelectedStudent(s)}
                >
                  <Text style={styles.studentName}>{s.name} <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>({s.register_number})</Text></Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {selectedStudent && (
          <View style={styles.selectedStudentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedStudentTitle}>Selected Student</Text>
              <Text style={styles.selectedStudentName}>{selectedStudent.name}</Text>
              <Text style={styles.selectedStudentReg}>{selectedStudent.register_number}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.clearBtn}>
              <X size={16} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Bill Category</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Miscellaneous Fees / Fine" 
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter amount" 
          keyboardType="numeric" 
          value={amountStr}
          onChangeText={setAmountStr}
        />

        <TouchableOpacity 
          style={[styles.generateBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleGenerateBill}
          disabled={isSubmitting || !selectedStudent || !amountStr}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Printer size={20} color="white" {...({} as any)} />
              <Text style={styles.generateBtnText}>Generate & Print Bill</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        <View style={styles.transactionList}>
          {stats.recentPayments.length > 0 ? (
            stats.recentPayments.map((trans: any, index: number) => (
              <View key={index} style={styles.transaction}>
                <View style={styles.transIcon}>
                  <DollarSign size={20} color="#10B981" {...({} as any)} />
                </View>
                <View style={styles.transContent}>
                  <Text style={styles.transTitle}>{trans.students?.name || 'Student'}</Text>
                  <Text style={styles.transDate}>
                    {new Date(trans.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.transAmount}>₹{trans.amount_paid?.toLocaleString()}</Text>
                  <Text style={{ fontSize: 9, color: '#10B981', fontWeight: 'bold' }}>SUCCESS</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textMuted }}>No recent payments found.</Text>
            </View>
          )}
        </View>
      </View>
      <AlertModal 
        visible={alertConfig.visible} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        type={alertConfig.type} 
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  label: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, marginTop: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8 },
  selector: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { color: theme.colors.text },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  generateBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  generateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  transactionList: { backgroundColor: 'white', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  transaction: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  transIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  transContent: { flex: 1 },
  transTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  transDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  transAmount: { fontSize: 15, fontWeight: 'bold', color: '#10B981' },
  classChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  activeClassChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  classChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeClassChipText: { color: 'white' },
  studentListItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  studentName: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  selectedStudentCard: { backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  selectedStudentTitle: { fontSize: 11, color: '#059669', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  selectedStudentName: { fontSize: 16, fontWeight: 'bold', color: '#065F46' },
  selectedStudentReg: { fontSize: 12, color: '#047857' },
  clearBtn: { padding: 4, backgroundColor: 'white', borderRadius: 20 }
});
