import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ActivityIndicator,
  Image
} from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionClasses } from '../../../../src/hooks/useInstitutionClasses';
import { useClassStudents } from '../../../../src/hooks/useClassStudents';
import { useFeeStructures } from '../../../../src/hooks/useFeeStructures';
import { useFeeWorkflow } from '../../../../src/hooks/useFeeWorkflow';
import { useClassFeeStatus } from '../../../../src/hooks/useClassFeeStatus';
import { 
  Settings2, 
  Plus,
  Trash2,
  DollarSign,
  ChevronRight,
  X,
  Calendar,
  CreditCard,
  Bell,
  User,
  Search
} from 'lucide-react-native';

export default function AccountantFeeStructure() {
  const { institutionId, institutionUuid } = useAuth();
  const { data: classes = [], isLoading: isClassesLoading } = useInstitutionClasses(institutionId);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const { data: students = [], isLoading: isStudentsLoading } = useClassStudents(institutionId, selectedClass);
  const { structures } = useFeeStructures(institutionId, selectedClass || undefined);
  const { defineFeeStructure, sendIndividualReminder, updateStudentFeeOverride } = useFeeWorkflow();
  const { feeStatuses, isLoading: isFeeStatusLoading } = useClassFeeStatus(institutionId || undefined);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newFeeName, setNewFeeName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [feeComponents, setFeeComponents] = useState<{ title: string; amount: string }[]>([
    { title: 'Tuition Fee', amount: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleAddComponent = () => {
    setFeeComponents([...feeComponents, { title: '', amount: '' }]);
  };

  const handleRemoveComponent = (index: number) => {
    setFeeComponents(feeComponents.filter((_, i) => i !== index));
  };

  const handleUpdateComponent = (index: number, field: 'title' | 'amount', value: string) => {
    const updated = [...feeComponents];
    updated[index][field] = value;
    setFeeComponents(updated);
  };

  const handleSubmit = async () => {
    if (!institutionId || !selectedClass || !selectedStudent) return;
    if (!newFeeName || !dueDate) {
      showAlert('Error', 'Please fill in all required fields', 'error');
      return;
    }

    const totalAmount = feeComponents.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    if (totalAmount <= 0) {
      showAlert('Error', 'Total amount must be greater than zero', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const components = feeComponents.map(c => ({ title: c.title, amount: parseFloat(c.amount) || 0 }));
      
      // 1. Dynamic structure resolution
      let structureId = '';
      const existing = (structures as any[]).find(s => s.name === newFeeName);
      
      if (existing) {
        structureId = existing.id;
      } else {
        // Create a new general structure for this class first
        const { data: newStruct, error: createError } = await defineFeeStructure(
          institutionId || '',
          newFeeName,
          totalAmount,
          selectedClass,
          dueDate,
          components
        );
        if (createError) throw createError;
        structureId = (newStruct as any).id;
      }

      // 2. Apply override to this specific student
      const { error } = await updateStudentFeeOverride(
        institutionId || '',
        selectedStudent.id,
        structureId,
        totalAmount,
        components,
        dueDate
      );

      if (error) throw error;

      setIsModalVisible(false);
      setNewFeeName('');
      setDueDate('');
      setFeeComponents([{ title: 'Tuition Fee', amount: '' }]);
      showAlert('Success', `Fee structure updated for ${selectedStudent.name}`, 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update fee', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = (students as any[]).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.register_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStudentFeeStatusInfo = (studentId: string) => {
    const studentFees = (feeStatuses as any[]).filter(f => f.student_id === studentId);
    if (studentFees.length === 0) return { status: 'none', dueDate: null, totalDue: 0, totalPaid: 0 };
    
    let totalDue = 0;
    let totalPaid = 0;
    let earliestDueDate: Date | null = null;
    let isOverdue = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    studentFees.forEach(fee => {
      totalDue += (fee.amount_due || 0);
      totalPaid += (fee.amount_paid || 0);
      
      if (fee.due_date) {
        const dDate = new Date(fee.due_date);
        if (!earliestDueDate || dDate < earliestDueDate) earliestDueDate = dDate;
        if (fee.amount_due > 0 && dDate < today) isOverdue = true;
      }
    });

    if (totalDue === 0 && totalPaid > 0) return { status: 'paid', dueDate: earliestDueDate, totalDue: 0, totalPaid };
    if (isOverdue) return { status: 'overdue', dueDate: earliestDueDate, totalDue, totalPaid };
    if (totalDue > 0) return { status: 'pending', dueDate: earliestDueDate, totalDue, totalPaid };
    return { status: 'none', dueDate: null, totalDue: 0, totalPaid: 0 };
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Fee Components" subtitle="Individual Student Fee Management" />

        {/* Class Selector */}
        <View style={styles.classSelectorSec}>
          <Text style={styles.sectionTitle}>Select Class</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classTray}>
            {classes.map((cls: any) => (
              <TouchableOpacity 
                key={cls.id} 
                style={[styles.classChip, selectedClass === cls.name && styles.activeClassChip]}
                onPress={() => {
                  setSelectedClass(cls.name);
                  setSelectedStudent(null);
                }}
              >
                <Text style={[styles.classChipText, selectedClass === cls.name && styles.activeClassChipText]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedClass ? (
          <View style={styles.mainBoard}>
            <View style={styles.searchBox}>
              <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search by name or register number..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {isStudentsLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : filteredStudents.length > 0 ? (
              <View style={styles.studentList}>
                <Text style={styles.sectionTitle}>Students in {selectedClass} ({filteredStudents.length})</Text>
                {filteredStudents.map((student: any) => {
                  const feeInfo = getStudentFeeStatusInfo(student.id);
                  let statusColor = '#94A3B8';
                  let statusBg = '#F8FAFC';
                  let statusText = 'NO FES';
                  
                  if (feeInfo.status === 'paid') { 
                    statusColor = '#10B981'; 
                    statusBg = '#ECFDF5';
                    statusText = 'PAID';
                  } else if (feeInfo.status === 'overdue') { 
                    statusColor = '#EF4444'; 
                    statusBg = '#FEF2F2';
                    statusText = 'OVERDUE';
                  } else if (feeInfo.status === 'pending') { 
                    statusColor = '#F59E0B'; 
                    statusBg = '#FFFBEB';
                    statusText = 'DUE';
                  }

                  return (
                  <View key={student.id} style={[styles.studentCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
                    <View style={styles.avatarBox}>
                      {student.image_url ? (
                        <Image source={{ uri: student.image_url }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <User size={20} color={theme.colors.primary} {...({} as any)} />
                        </View>
                      )}
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>REG: {student.register_number}</Text>
                      
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusText}</Text>
                        {feeInfo.status !== 'none' && (
                          <Text style={styles.amountLabel}> • ₹{feeInfo.status === 'paid' ? feeInfo.totalPaid.toLocaleString() : feeInfo.totalDue.toLocaleString()}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.studentActions}>
                      <TouchableOpacity 
                        style={styles.reminderBtn}
                        onPress={async () => {
                          try {
                            await sendIndividualReminder(institutionUuid || '', student.id, student.profile_id, student.name, feeInfo.totalDue);
                            showAlert('Success', `Fee reminder sent to ${student.name} and parent`, 'success');
                          } catch (e: any) {
                            showAlert('Error', 'Failed to send notification', 'error');
                          }
                        }}
                      >
                        <Bell size={16} color="white" {...({} as any)} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.manageBtn}
                        onPress={() => {
                          setSelectedStudent(student);
                          setIsModalVisible(true);
                        }}
                      >
                        <Settings2 size={16} color="white" {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )})}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No students found in this class</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.welcomeBox}>
            <CreditCard size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.welcomeTitle}>Manage Student Fees</Text>
            <Text style={styles.welcomeSubtitle}>Select a class above to list children and manage their individual fee structures</Text>
          </View>
        )}
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Fee Entry for {selectedStudent?.name}</Text>
                <Text style={styles.modalSubtitle}>Individual manual fee definition</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setSelectedStudent(null); }}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Fee Title (e.g. Term 1 Fees)</Text>
              <TextInput 
                style={styles.input}
                placeholder="Name of this fee structure"
                value={newFeeName}
                onChangeText={setNewFeeName}
              />

              <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 2026-06-30"
                value={dueDate}
                onChangeText={setDueDate}
              />

              <View style={styles.compHeader}>
                <Text style={styles.label}>Fee Components</Text>
                <TouchableOpacity onPress={handleAddComponent}>
                  <Text style={styles.addCompLabel}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              {feeComponents.map((comp, idx) => (
                <View key={idx} style={styles.compRow}>
                  <TextInput 
                    style={[styles.input, { flex: 2, marginBottom: 0 }]}
                    placeholder="Component Label"
                    value={comp.title}
                    onChangeText={(val) => handleUpdateComponent(idx, 'title', val)}
                  />
                  <TextInput 
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={comp.amount}
                    onChangeText={(val) => handleUpdateComponent(idx, 'amount', val)}
                  />
                  {feeComponents.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveComponent(idx)}>
                      <Trash2 size={18} color="#EF4444" {...({} as any)} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <View style={styles.totalBoard}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalValue}>₹{feeComponents.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString()}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Update Individual Fee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Themed Success/Error Modal */}
      <AlertModal 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type as any}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 40 },
  classSelectorSec: { marginBottom: 32 },
  classTray: { flexDirection: 'row', marginTop: 12 },
  classChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#eff6ff', marginRight: 10 },
  activeClassChip: { backgroundColor: theme.colors.primary },
  classChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeClassChipText: { color: 'white' },
  mainBoard: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24, height: 56 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: theme.colors.text },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  studentList: { gap: 12 },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12 },
  avatarBox: { marginRight: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  studentMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusLabel: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  amountLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  studentActions: { flexDirection: 'row', gap: 8 },
  reminderBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EA580C', justifyContent: 'center', alignItems: 'center' },
  manageBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  welcomeBox: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginTop: 16 },
  welcomeSubtitle: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 260 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  modalForm: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, fontSize: 15 },
  compHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addCompLabel: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  totalBoard: { marginTop: 20, padding: 20, borderRadius: 16, backgroundColor: '#fdf2f8' },
  totalLabel: { fontSize: 12, color: '#be185d', fontWeight: 'bold', textTransform: 'uppercase' },
  totalValue: { fontSize: 28, fontWeight: '800', color: '#be185d', marginTop: 4 },
  modalFooter: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});


