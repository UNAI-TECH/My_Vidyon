import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Modal, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Plus, 
  FileEdit, 
  Send,
  Users,
  Clock,
  ChevronRight,
  ChevronDown,
  X,
  ClipboardList,
  BookOpen,
  Calendar,
  Info,
  Check
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { format } from 'date-fns';
import { useFacultyDashboard, resolveInstitutionIds } from '../../../../src/hooks/useFacultyDashboard';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { sortClasses, sortSections, compareClasses, compareSections } from '../../../../src/utils/classUtils';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';

export default function FacultyAssignments() {
  const { user, institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const { 
    assignedSubjects, 
    deleteAssignment, 
    myAssignments: assignments = [], 
    loadingStates,
    isLoading: loadingDashboard,
    refetchAssignments: refetch 
  } = useFacultyDashboard(user?.id, (institutionUuid || institutionId) || undefined);
  
  const isLoading = loadingStates?.isAssignmentsLoading || loadingDashboard;
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectionMode, setSelectionMode] = React.useState<'assigned' | 'all'>('assigned');
  const [selectedClassName, setSelectedClassName] = React.useState('');
  const [selectedSubjectName, setSelectedSubjectName] = React.useState('');

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    subject_id: '',
    class_id: '',
    section: 'A',
    due_date: new Date().toISOString().split('T')[0],
    total_marks: '100',
  });

  const targetInstId = institutionUuid || institutionId;

  // Fallback: Fetch all institution classes in case assignedSubjects is empty or faculty needs another class
  const { data: institutionClasses = [], isLoading: isLoadingClasses } = useQuery<any[]>({
    queryKey: ['faculty-all-institution-classes', targetInstId],
    queryFn: async () => {
      if (!targetInstId) return [];
      const validInstIds = await resolveInstitutionIds(targetInstId);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, sections, stage, class_order')
        .in('institution_id', validInstIds.length > 0 ? validInstIds : [targetInstId]);
      if (error) {
        console.error('Error fetching institution classes:', error);
        return [];
      }
      return sortClasses(data || []);
    },
    enabled: !!targetInstId,
  });

  // Fallback: Fetch all institution subjects in case assignedSubjects is empty
  const { data: institutionSubjects = [], isLoading: isLoadingSubjects } = useQuery<any[]>({
    queryKey: ['faculty-all-institution-subjects', targetInstId],
    queryFn: async () => {
      if (!targetInstId) return [];
      const validInstIds = await resolveInstitutionIds(targetInstId);
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .in('institution_id', validInstIds.length > 0 ? validInstIds : [targetInstId])
        .order('name');
      if (error) {
        console.error('Error fetching institution subjects:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!targetInstId,
  });

  // Available sections for the currently selected class in manual mode
  const selectedClassObj = institutionClasses.find((c: any) => c.id === formData.class_id);
  const availableSections: string[] = React.useMemo(() => {
    if (!selectedClassObj) return ['A'];
    if (Array.isArray(selectedClassObj.sections) && selectedClassObj.sections.length > 0) {
      return sortSections(selectedClassObj.sections);
    }
    return ['A', 'B', 'C'];
  }, [selectedClassObj]);

  const sortedAssignedSubjects = React.useMemo(() => {
    return [...assignedSubjects].sort((a: any, b: any) => {
      const classCmp = compareClasses(a.classes?.name || '', b.classes?.name || '');
      if (classCmp !== 0) return classCmp;
      const secCmp = compareSections(a.section || '', b.section || '');
      if (secCmp !== 0) return secCmp;
      return (a.subjects?.name || '').localeCompare(b.subjects?.name || '');
    });
  }, [assignedSubjects]);

  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', buttons?: any[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject_id: '',
      class_id: '',
      section: 'A',
      due_date: new Date().toISOString().split('T')[0],
      total_marks: '100',
    });
    setSelectedClassName('');
    setSelectedSubjectName('');
    setIsEditing(false);
    setEditId(null);
  };

  const handleCreateAssignment = async () => {
    if (!formData.title || !formData.title.trim()) {
      showAlert('Missing Title', 'Please enter an assignment title.', 'warning');
      return;
    }

    if (!formData.class_id) {
      showAlert('Missing Class', 'Please select a class for this assignment.', 'warning');
      return;
    }

    if (!formData.subject_id) {
      showAlert('Missing Subject', 'Please select a subject for this assignment.', 'warning');
      return;
    }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!isUUID(formData.subject_id) || !isUUID(formData.class_id)) {
      showAlert('Data Error', 'One of the selected items has an invalid internal ID. Please select a valid subject/class.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the selected subject/class names to fill required text columns
      const selected = assignedSubjects.find((s: any) => 
        s.subject_id === formData.subject_id && 
        s.class_id === formData.class_id && 
        s.section === formData.section
      );
      const matchedClass = institutionClasses.find((c: any) => c.id === formData.class_id);
      const matchedSubject = institutionSubjects.find((s: any) => s.id === formData.subject_id);

      const finalClassName = selected?.classes?.name || matchedClass?.name || selectedClassName || 'Class';
      const finalSubjectName = selected?.subjects?.name || matchedSubject?.name || selectedSubjectName || 'Subject';

      const payload = {
        institution_id: institutionUuid || institutionId,
        teacher_id: user?.id,
        created_by: user?.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject_id: formData.subject_id,
        class_id: formData.class_id,
        subject: finalSubjectName,
        class_name: finalClassName,
        section: formData.section || 'A',
        due_date: formData.due_date,
        total_marks: parseInt(formData.total_marks || '100', 10) || 100,
      };

      const query = isEditing 
        ? (supabase.from('assignments') as any).update(payload).eq('id', editId as string).select()
        : (supabase.from('assignments') as any).insert(payload).select();

      console.log(`UI: Performing ${isEditing ? 'UPDATE' : 'INSERT'} on assignment:`, editId || 'NEW');
      const { data: affectedRows, error } = await query;

      if (error) {
        console.error('UI: Supabase write error:', error);
        throw error;
      }

      if (isEditing && (!affectedRows || affectedRows.length === 0)) {
        console.warn('UI: UPDATE executed but NO rows were affected. RLS likely blocking write.');
        showAlert('Warning', 'Assignment was not updated. You might not have permission to edit this record.', 'warning');
        setIsSubmitting(false);
        return;
      }

      console.log('UI: Write successful, rows affected:', affectedRows?.length);

      showAlert('Success', `Assignment ${isEditing ? 'updated' : 'created'} successfully`, 'success');
      setShowCreateModal(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      showAlert('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: any) => {
    console.log('UI: handleEdit called for assignment:', JSON.stringify(assignment, null, 2));
    setIsEditing(true);
    setEditId(assignment.id);
    console.log('UI: Setting form data for edit...', assignment.title);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      subject_id: assignment.subject_id,
      class_id: assignment.class_id,
      section: assignment.section,
      due_date: assignment.due_date,
      total_marks: (assignment.total_marks || 100).toString(),
    });
    setShowCreateModal(true);
  };

  const handleDelete = (assignment: any) => {
    showAlert(
      'Delete Assignment',
      `Are you sure you want to delete "${assignment.title}"? All submissions will also be deleted.`,
      'warning',
      [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('UI: Initiating deletion for:', assignment.id);
              const result = await deleteAssignment(assignment.id);
              console.log('UI: Delete operation result:', result);
              if (result) {
                showAlert('Success', 'Assignment and all its data deleted successfully', 'success');
                refetch();
              } else {
                console.warn('UI: Deletion returned false, possibly no rows affected');
                showAlert('Info', 'Assignment might already be deleted or permission denied', 'info');
              }
            } catch (error: any) {
              console.error('UI: Deletion error caught:', error);
              showAlert('Error', error.message || 'Failed to delete assignment', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Assignment Control" subtitle="Create and manage class tasks" />

        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => {
            setIsEditing(false);
            setEditId(null);
            setFormData({
              title: '',
              description: '',
              subject_id: '',
              class_id: '',
              section: '',
              due_date: new Date().toISOString().split('T')[0],
              total_marks: '100',
            });
            setShowCreateModal(true);
          }}
        >
          <Plus size={20} color="white" {...({} as any)} />
          <Text style={styles.createBtnText}>Create New Assignment</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Assignments</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : assignments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No assignments created yet.</Text>
            </View>
          ) : (
            assignments.map((assignment: any) => (
              <View key={assignment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{assignment.title}</Text>
                    <Text style={styles.subjectSub}>
                      {assignment.subjects?.name} • {assignment.classes?.name} - {assignment.section}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={styles.editIcon}
                      onPress={() => handleEdit(assignment)}
                    >
                      <FileEdit size={16} color={theme.colors.primary} {...({} as any)} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.editIcon, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => handleDelete(assignment)}
                    >
                      <Trash2 size={16} color="#EF4444" {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: '#F0F9FF' }]}>
                    <Users size={12} color="#0369A1" {...({} as any)} />
                    <Text style={[styles.statText, { color: '#0369A1' }]}>{assignment.submissionCount} Submissions</Text>
                  </View>
                  {assignment.pendingCount > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#FEF2F2' }]}>
                      <ClipboardList size={12} color="#B91C1C" {...({} as any)} />
                      <Text style={[styles.statText, { color: '#B91C1C' }]}>{assignment.pendingCount} Pending</Text>
                    </View>
                  )}
                </View>

                <View style={styles.meta}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.metaText}>
                      Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No due date'}
                    </Text>
                  </View>
                  <Text style={styles.marksText}>{assignment.total_marks} Marks</Text>
                </View>

                <TouchableOpacity 
                  style={styles.reviewBtn}
                  onPress={() => router.push(`/faculty/assignments/${assignment.id}`)}
                >
                  <Send size={14} color="white" {...({} as any)} />
                  <Text style={styles.reviewBtnText}>Review Submissions</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        <AdBanner type="FACULTY" />
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Assignment' : 'New Assignment'}</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
                  <X size={24} color={theme.colors.text} {...({} as any)} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={true}
                contentContainerStyle={{ paddingBottom: 60 }}
              >
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Assignment Title"
                  placeholderTextColor="#94A3B8"
                  value={formData.title}
                  onChangeText={(text) => setFormData({...formData, title: text})}
                />

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.inputLabel}>
                    {assignedSubjects.length > 0 && selectionMode === 'assigned'
                      ? 'Your Assigned Subjects (as Subject Teacher) *'
                      : 'Select Subject & Class *'}
                  </Text>
                  {assignedSubjects.length > 0 && institutionClasses.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setSelectionMode(selectionMode === 'assigned' ? 'all' : 'assigned')}
                      style={styles.modeToggleBtn}
                    >
                      <Text style={styles.modeToggleText}>
                        {selectionMode === 'assigned' ? 'Browse all school classes' : 'Show my assigned subjects'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                 {/* Option A: Fast chips from Faculty's subject teacher assignments */}
                {selectionMode === 'assigned' && sortedAssignedSubjects.length > 0 ? (
                  <View style={styles.subjectsGrid}>
                    {sortedAssignedSubjects.map((s: any, i: number) => {
                      const isSelected = 
                        formData.subject_id === s.subject_id && 
                        formData.class_id === s.class_id && 
                        formData.section === s.section;
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={[
                            styles.subjectOption,
                            isSelected && styles.subjectOptionSelected
                          ]}
                          onPress={() => {
                            setFormData({
                              ...formData, 
                              subject_id: s.subject_id, 
                              class_id: s.class_id, 
                              section: s.section || 'A'
                            });
                            setSelectedClassName(s.classes?.name || '');
                            setSelectedSubjectName(s.subjects?.name || '');
                          }}
                        >
                          <Text style={[
                            styles.subjectOptionText,
                            isSelected && styles.subjectOptionTextSelected
                          ]}>
                            {s.subjects?.name || 'Subject'} ({s.classes?.name || 'Class'}-{s.section || 'A'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  /* Option B: Fallback directly from institution classes & subjects */
                  <View style={styles.fallbackBox}>
                    {assignedSubjects.length === 0 && (
                      <View style={styles.infoBanner}>
                        <Info size={16} color="#0369A1" {...({} as any)} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoBannerTitle}>
                            No subjects have been assigned to you
                          </Text>
                          <Text style={styles.infoBannerText}>
                            You have not been assigned as a subject teacher to any class yet. You can choose a class and subject from the school directory below, or contact your school administrator to assign your subjects.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* 1. Class Selection */}
                    <Text style={styles.subInputLabel}>1. Target Class</Text>
                    {institutionClasses.length === 0 ? (
                      <Text style={styles.emptyNotice}>
                        {isLoadingClasses ? 'Loading classes...' : 'No classes found for this institution.'}
                      </Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        {institutionClasses.map((c: any) => {
                          const isSelected = formData.class_id === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.chip, isSelected && styles.chipSelected]}
                              onPress={() => {
                                const sections = Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ['A'];
                                setFormData({
                                  ...formData,
                                  class_id: c.id,
                                  section: sections[0] || 'A'
                                });
                                setSelectedClassName(c.name || '');
                              }}
                            >
                              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}

                    {/* 2. Section Selection */}
                    {formData.class_id ? (
                      <>
                        <Text style={styles.subInputLabel}>2. Section</Text>
                        <View style={styles.sectionRow}>
                          {availableSections.map((sec: string) => {
                            const isSecSelected = formData.section === sec;
                            return (
                              <TouchableOpacity
                                key={sec}
                                style={[styles.sectionChip, isSecSelected && styles.sectionChipSelected]}
                                onPress={() => setFormData({ ...formData, section: sec })}
                              >
                                <Text style={[styles.sectionChipText, isSecSelected && styles.sectionChipTextSelected]}>
                                  Section {sec}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}

                    {/* 3. Subject Selection */}
                    <Text style={styles.subInputLabel}>3. Subject</Text>
                    {institutionSubjects.length === 0 ? (
                      <Text style={styles.emptyNotice}>
                        {isLoadingSubjects ? 'Loading subjects...' : 'No subjects found for this institution.'}
                      </Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        {institutionSubjects.map((sub: any) => {
                          const isSubSelected = formData.subject_id === sub.id;
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[styles.chip, isSubSelected && styles.chipSelected]}
                              onPress={() => {
                                setFormData({ ...formData, subject_id: sub.id });
                                setSelectedSubjectName(sub.name || '');
                              }}
                            >
                              <Text style={[styles.chipText, isSubSelected && styles.chipTextSelected]}>
                                {sub.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Due Date *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <CalendarIcon size={18} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.dateText}>
                        {format(new Date(formData.due_date), 'MMM d, yyyy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Total Marks (max 100)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={formData.total_marks}
                      onChangeText={(text) => setFormData({...formData, total_marks: text})}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Instructions for students..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                />

                <TouchableOpacity 
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleCreateAssignment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isEditing ? 'Update Assignment' : 'Create Assignment'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unified Calendar Picker for Due Date */}
      <CalendarModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(selectedDate: string) => {
          setFormData({ ...formData, due_date: selectedDate });
          setShowDatePicker(false);
        }}
        initialDate={formData.due_date}
      />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  createBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  subjectSub: { fontSize: 12, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
  editIcon: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statText: { fontSize: 11, fontWeight: 'bold' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  marksText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text },
  reviewBtn: { backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  reviewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 24, 
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: theme.colors.text,
    letterSpacing: -0.5
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: theme.colors.text, 
    marginBottom: 8, 
    marginTop: 16,
    marginLeft: 4
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    fontSize: 15, 
    color: theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  row: { flexDirection: 'row', marginTop: 8 },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  subjectOption: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: '#F1F5F9', 
    borderWidth: 1.5, 
    borderColor: 'transparent' 
  },
  subjectOptionSelected: { 
    backgroundColor: theme.colors.primary + '15', 
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subjectOptionText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  subjectOptionTextSelected: { color: theme.colors.primary, fontWeight: '800' },
  
  // Fallback Selector Styles
  fallbackBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 3,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
    lineHeight: 17,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: 'white',
    fontWeight: '800',
  },
  sectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  sectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  sectionChipSelected: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  sectionChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  sectionChipTextSelected: {
    color: 'white',
    fontWeight: '800',
  },
  emptyNotice: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginVertical: 4,
  },

  submitBtn: { 
    backgroundColor: theme.colors.primary, 
    borderRadius: 18, 
    padding: 20, 
    alignItems: 'center', 
    marginTop: 32, 
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  
  dateInput: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  dateText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
});
