import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useExamTimetable } from '../../../../src/hooks/useExamTimetable';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { PickerSheet } from '../../../../src/components/common/PickerSheet';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../../../src/lib/supabase';
import { useRouter } from 'expo-router';
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Download, Trash2, Calendar, Clock, BookOpen, ChevronRight, AlertCircle, ChevronDown, CheckCircle2, FileUp, X, Plus } from 'lucide-react-native';

export default function InstitutionExams() {
  const { institutionId, user, academicYear } = useAuth();
  const router = useRouter();
  
  const { 
    schedules, 
    isLoadingSchedules, 
    createSchedule, 
    deleteSchedule,
    fetchEntries
  } = useExamTimetable({ institutionId: institutionId || undefined });

  const { classes: rawClasses = [], subjects: rawSubjects = [], isLoading: isDataLoading } = useInstitutionFaculty(institutionId);
  const classes = rawClasses as any[];
  const subjects = rawSubjects as any[];
  
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, { id: string, name: string, sections: string[] }>();
    classes.forEach(c => {
      if (!map.has(c.id)) {
        map.set(c.id, { id: c.id, name: c.name, sections: [c.section] });
      } else {
        const existing = map.get(c.id)!;
        if (c.section && !existing.sections.includes(c.section)) {
          existing.sections.push(c.section);
        }
      }
    });
    return Array.from(map.values());
  }, [classes]);

  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    uniqueClasses.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [uniqueClasses]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const [showCustomType, setShowCustomType] = useState(false);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, any>();
    schedules.forEach(s => {
      const key = `${s.class_id}-${s.exam_type}-${s.exam_display_name}-${s.academic_year}`;
      if (!groups.has(key)) {
        groups.set(key, { ...s, sections: [s.section], ids: [s.id] });
      } else {
        const existing = groups.get(key);
        if (!existing.sections.includes(s.section)) {
          existing.sections.push(s.section);
          existing.ids.push(s.id);
        }
      }
    });
    return Array.from(groups.values());
  }, [schedules]);

  // Form State
  const [formData, setFormData] = useState({
    targetGroups: [] as { classId: string; sections: string[] }[],
    exam_type: 'Midterm',
    exam_display_name: '',
    academic_year: academicYear || '2023-24',
    entries: [] as any[]
  });

  // Keep academic year in sync once it loads from Auth
  React.useEffect(() => {
    if (academicYear && !formData.academic_year) {
      setFormData(prev => ({ ...prev, academic_year: academicYear }));
    }
  }, [academicYear]);
  
  const [showDatePicker, setShowDatePicker] = useState<{ id: string; visible: boolean }>({ id: '', visible: false });
  const [materialsModal, setMaterialsModal] = useState<{ entryId: string; subject: string; classId: string; visible: boolean } | null>(null);
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  const [picker, setPicker] = useState<{ 
    visible: boolean; 
    title: string; 
    options: { label: string; value: any }[]; 
    selectedValue: any;
    onSelect: (val: any) => void;
  } | null>(null);

  const handleCreate = async () => {
    if (formData.targetGroups.length === 0 || !formData.exam_display_name || formData.entries.length === 0) {
      setAlert({
        visible: true,
        title: "Missing Info",
        message: "Please add at least one target class/section and fill all schedule details.",
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      const batchPromises = formData.targetGroups.flatMap(group => 
        group.sections.map(section => 
          createSchedule.mutateAsync({
            class_id: group.classId,
            section: section,
            exam_type: formData.exam_type,
            exam_display_name: formData.exam_display_name,
            academic_year: formData.academic_year,
            entries: formData.entries.map(e => ({
              exam_date: e.exam_date,
              day_of_week: new Date(e.exam_date).toLocaleDateString('en-US', { weekday: 'long' }),
              start_time: e.start_time,
              end_time: e.end_time,
              subject: e.subject,
              syllabus_notes: JSON.stringify({
                text: e.syllabus_notes,
                materials: e.attached_materials || []
              })
            })),
            institution_id: institutionId,
            created_by: user?.id
          })
        )
      );

      await Promise.all(batchPromises);

      setAlert({
        visible: true,
        title: "Success",
        message: "Exam schedules generated for all selected classes and sections.",
        type: 'success'
      });
      setIsModalVisible(false);
      setFormData({
        targetGroups: [],
        exam_type: 'Midterm',
        exam_display_name: '',
        academic_year: academicYear || '2023-24',
        entries: []
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        title: "Error",
        message: err.message || "Failed to create exam schedule",
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupDelete = async (ids: string[]) => {
    try {
      setLoading(true);
      await Promise.all(ids.map(id => deleteSchedule.mutateAsync(id)));
      setAlert({ visible: true, title: "Deleted", message: "Schedules deleted successfully.", type: 'success' });
    } catch (err: any) {
      setAlert({ visible: true, title: "Delete Error", message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, {
        id: Math.random().toString(36).substr(2, 9),
        subject: '',
        exam_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '12:00',
        syllabus_notes: '',
        attached_materials: [] as any[]
      }]
    }));
  };

  const addTargetGroup = (classId: string, section: string) => {
    setFormData(prev => {
      const existingGroup = prev.targetGroups.find(g => g.classId === classId);
      if (existingGroup) {
        if (existingGroup.sections.includes(section)) return prev;
        return {
          ...prev,
          targetGroups: prev.targetGroups.map(g => g.classId === classId 
            ? { ...g, sections: [...g.sections, section] } 
            : g)
        };
      }
      return {
        ...prev,
        targetGroups: [...prev.targetGroups, { classId, sections: [section] }]
      };
    });
  };

  const removeTargetGroup = (classId: string, section: string) => {
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId 
        ? { ...g, sections: g.sections.filter(s => s !== section) } 
        : g).filter(g => g.sections.length > 0)
    }));
  };

  const fetchMaterials = async (classId: string, subject: string) => {
    try {
      setIsLoadingMaterials(true);
      const subObj = subjects.find(s => s.name === subject);
      
      // Try by subject_id first with join for subject naming consistency
      let query = supabase
        .from('subject_materials')
        .select(`
          *,
          profiles:faculty_id(full_name),
          subjects:subject_id(name)
        `)
        .eq('class_id', classId);
      
      if (subObj) {
        query = query.eq('subject_id', subObj.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let results = data || [];
      
      // Fallback: If no matches by ID, try all for class and filter client-side by subject name
      if (results.length === 0 && subject) {
        const { data: allClassMaterials, error: allErr } = await supabase
          .from('subject_materials')
          .select('*, subjects:subject_id(name)')
          .eq('class_id', classId);
        
        if (!allErr && allClassMaterials) {
          results = allClassMaterials.filter((m: any) => 
            m.subjects?.name?.toLowerCase().includes(subject.toLowerCase()) ||
            m.title?.toLowerCase().includes(subject.toLowerCase())
          );
        }
      }

      setAvailableMaterials(results);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const uploadSyllabus = async (entryId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `exam-syllabi/${institutionId}/${fileName}`;

      setLoading(true);
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('assignments') // Reusing assignments bucket or create new
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      updateEntry(entryId, 'attached_materials', [
        ...(formData.entries.find(e => e.id === entryId)?.attached_materials || []),
        { name: file.name, url: publicUrl, type: 'upload' }
      ]);
    } catch (err: any) {
       setAlert({
        visible: true,
        title: "Upload Failed",
        message: err.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== id)
    }));
  };

  const exportTimetable = async (schedule: any) => {
    try {
      setLoading(true);
      const entries = await fetchEntries(schedule.id);
      if (!entries || entries.length === 0) {
        Alert.alert("Notice", "No entries found for this timetable.");
        return;
      }

      // Prepare data for Excel template
      const rows = entries.map((e: any) => ({
        'Date': e.exam_date,
        'Day': e.day_of_week,
        'Start Time': e.start_time,
        'End Time': e.end_time,
        'Subject': e.subject,
        'Syllabus': e.syllabus_notes ? (typeof e.syllabus_notes === 'string' && e.syllabus_notes.startsWith('{') ? JSON.parse(e.syllabus_notes).text : e.syllabus_notes) : ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exam Timetable");
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `exam_timetable_${schedule.exam_display_name.replace(/\s+/g, '_')}_${schedule.class_id}.xlsx`;
      const uri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("Export Error:", error);
      Alert.alert("Error", "Failed to export timetable template.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingSchedules || isDataLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Exam Management" 
        subtitle="Manage institution-wide exam schedules"
        actions={
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => setIsModalVisible(true)}
          >
            <Plus size={20} color="white" {...({} as any)} />
            <Text style={styles.addBtnText}>New Schedule</Text>
          </TouchableOpacity>
        }
      />

      {isModalVisible ? (
        <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
          <Text style={styles.formTitle}>Generate Exam Schedule</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exam Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Annual Exams 2024"
              value={formData.exam_display_name}
              onChangeText={(v) => setFormData(p => ({ ...p, exam_display_name: v }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Classes & Sections</Text>
            <TouchableOpacity 
              style={styles.select}
              onPress={() => setPicker({
                visible: true,
                title: "Add Class",
                options: uniqueClasses.map((c: any) => ({ label: c.name, value: c.id })),
                selectedValue: null,
                onSelect: (val) => {
                  const cls = uniqueClasses.find((c: any) => c.id === val);
                  if (cls && cls.sections) {
                    cls.sections.forEach((s: string) => addTargetGroup(val, s));
                  }
                }
              })}
            >
              <Text style={styles.selectText}>Add Class (Adds all sections)</Text>
              <Plus size={16} color={theme.colors.primary} {...({} as any)} />
            </TouchableOpacity>

            <View style={styles.targetList}>
              {formData.targetGroups.map(group => (
                <View key={group.classId} style={styles.targetItem}>
                  <Text style={styles.targetClassName}>
                    {uniqueClasses.find((c: any) => c.id === group.classId)?.name}
                  </Text>
                  <View style={styles.sectionChips}>
                    {group.sections.map(sec => (
                      <TouchableOpacity 
                        key={sec} 
                        style={styles.chip}
                        onPress={() => removeTargetGroup(group.classId, sec)}
                      >
                        <Text style={styles.chipText}>{sec}</Text>
                        <X size={12} color="white" {...({} as any)} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Exam Type</Text>
              {!showCustomType ? (
                <TouchableOpacity 
                  style={styles.select}
                  onPress={() => setPicker({
                    visible: true,
                    title: "Select Type",
                    options: [
                      { label: 'Unit Test', value: 'Unit Test' },
                      { label: 'First Midterm', value: 'First Midterm' },
                      { label: 'Second Midterm', value: 'Second Midterm' },
                      { label: 'Pre-Quarterly', value: 'Pre-Quarterly' },
                      { label: 'Quarterly', value: 'Quarterly' },
                      { label: 'Half Yearly', value: 'Half Yearly' },
                      { label: 'Pre-Half Yearly', value: 'Pre-Half Yearly' },
                      { label: 'Final', value: 'Final' },
                      { label: 'Custom...', value: 'custom' }
                    ],
                    selectedValue: formData.exam_type,
                    onSelect: (val) => {
                      if (val === 'custom') {
                        setShowCustomType(true);
                      } else {
                        setFormData(p => ({ ...p, exam_type: val }));
                      }
                    }
                  })}
                >
                  <Text style={styles.selectText}>{formData.exam_type}</Text>
                  <ChevronDown size={16} color={theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
              ) : (
                <View style={styles.customRow}>
                  <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    placeholder="Enter custom exam type..."
                    value={formData.exam_type}
                    onChangeText={(v) => setFormData(p => ({ ...p, exam_type: v }))}
                    autoFocus
                  />
                  <TouchableOpacity 
                    style={styles.customBackBtn}
                    onPress={() => setShowCustomType(false)}
                  >
                    <X size={16} color={theme.colors.textMuted} {...({} as any)} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.entriesHeader}>
            <Text style={styles.sectionTitle}>Exam Entries</Text>
            <TouchableOpacity style={styles.addEntryBtn} onPress={addEntry}>
              <Plus size={16} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.addEntryText}>Add Subject</Text>
            </TouchableOpacity>
          </View>

          {formData.entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHead}>
                 <TouchableOpacity 
                  style={[styles.select, { flex: 1 }]}
                  onPress={() => setPicker({
                    visible: true,
                    title: "Select Subject",
                    options: subjects.map((s: any) => ({ label: s.name, value: s.name })),
                    selectedValue: entry.subject,
                    onSelect: (val) => updateEntry(entry.id, 'subject', val)
                  })}
                >
                  <Text style={styles.selectText}>{entry.subject || 'Select Subject'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeEntry(entry.id)}>
                  <Trash2 size={20} color="#EF4444" {...({} as any)} />
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity 
                    style={styles.select}
                    onPress={() => setShowDatePicker({ id: entry.id, visible: true })}
                  >
                    <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.selectText}>{entry.exam_date}</Text>
                  </TouchableOpacity>
                  <CalendarModal
                    visible={showDatePicker.id === entry.id && showDatePicker.visible}
                    onClose={() => setShowDatePicker({ id: '', visible: false })}
                    initialDate={entry.exam_date}
                    onSelect={(date) => {
                      updateEntry(entry.id, 'exam_date', date);
                    }}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Time (S - E)</Text>
                  <View style={styles.row}>
                    <TextInput 
                      style={[styles.input, { flex: 1 }]} 
                      value={entry.start_time}
                      placeholder="09:00"
                      onChangeText={(v) => updateEntry(entry.id, 'start_time', v)}
                    />
                    <TextInput 
                      style={[styles.input, { flex: 1 }]} 
                      value={entry.end_time}
                      placeholder="12:00"
                      onChangeText={(v) => updateEntry(entry.id, 'end_time', v)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.syllabusSection}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  placeholder="Additional syllabus notes..."
                  value={entry.syllabus_notes}
                  onChangeText={(v) => updateEntry(entry.id, 'syllabus_notes', v)}
                />
                <TouchableOpacity 
                  style={styles.materialBtn}
                  onPress={() => {
                    if (formData.targetGroups.length > 0) {
                      setMaterialsModal({ 
                        entryId: entry.id, 
                        subject: entry.subject, 
                        classId: formData.targetGroups[0].classId, 
                        visible: true 
                      });
                      fetchMaterials(formData.targetGroups[0].classId, entry.subject);
                    } else {
                       setAlert({ visible: true, title: "Class Required", message: "Please select at least one class first.", type: 'error' });
                    }
                  }}
                >
                  <BookOpen size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.materialBtnText}>Attach Materials</Text>
                </TouchableOpacity>
              </View>

              {entry.attached_materials?.length > 0 && (
                <View style={styles.attachedContainer}>
                  {entry.attached_materials.map((m: any, idx: number) => (
                    <View key={idx} style={styles.attachedItem}>
                      <FileUp size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.attachedName} numberOfLines={1}>{m.name}</Text>
                      <TouchableOpacity onPress={() => {
                        const newMats = [...entry.attached_materials];
                        newMats.splice(idx, 1);
                        updateEntry(entry.id, 'attached_materials', newMats);
                      }}>
                        <X size={14} color="#EF4444" {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Generate Schedule</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={groupedSchedules}
          keyExtractor={(item) => item.ids.join(',')}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyTitle}>No Schedules Found</Text>
              <Text style={styles.emptySub}>Create your first exam schedule to get started.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View 
              key={item.ids.join(',')}
              style={styles.scheduleCard}
            >
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleName}>{item.exam_display_name}</Text>
                <Text style={styles.scheduleMeta}>
                  {classNameMap[item.class_id] || item.class_id} • Sections: {item.sections.sort().join(', ')} • {item.exam_type}
                </Text>
              </View>
              <View style={styles.scheduleCardActions}>
                <TouchableOpacity 
                  style={styles.exportIconBtn} 
                  onPress={() => exportTimetable(item)}
                >
                  <Download size={20} color={theme.colors.primary} {...({} as any)} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleGroupDelete(item.ids)}>
                  <Trash2 size={20} color="#EF4444" {...({} as any)} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Materials Selection Modal */}
      {materialsModal && materialsModal.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.materialsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Syllabus Materials for {materialsModal.subject}</Text>
              <TouchableOpacity onPress={() => setMaterialsModal(null)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSub}>Choose existing materials or upload a new one.</Text>
              
              <TouchableOpacity 
                style={styles.uploadBox}
                onPress={() => uploadSyllabus(materialsModal.entryId)}
              >
                <FileUp size={24} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.uploadText}>Upload New Note/PDF</Text>
              </TouchableOpacity>

              <Text style={styles.listLabel}>Existing Materials</Text>
              {isLoadingMaterials ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : availableMaterials.length > 0 ? (
                <FlatList
                  data={availableMaterials}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const entry = formData.entries.find(e => e.id === materialsModal.entryId);
                    const isAttached = entry?.attached_materials?.some((m: any) => m.url === item.file_url);
                    
                    return (
                      <TouchableOpacity 
                        style={[styles.materialItem, isAttached && styles.materialItemSelected]}
                        onPress={() => {
                          const currentMats = entry?.attached_materials || [];
                          if (isAttached) {
                             updateEntry(materialsModal.entryId, 'attached_materials', currentMats.filter((m: any) => m.url !== item.file_url));
                          } else {
                             updateEntry(materialsModal.entryId, 'attached_materials', [...currentMats, { name: item.title, url: item.file_url, type: 'existing' }]);
                          }
                        }}
                      >
                        <BookOpen size={18} color={isAttached ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
                        <Text style={[styles.materialName, isAttached && styles.materialNameSelected]}>{item.title}</Text>
                        {isAttached && <CheckCircle2 size={18} color={theme.colors.primary} {...({} as any)} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <Text style={styles.noMaterials}>No existing materials found for this subject.</Text>
              )}
            </View>

            <TouchableOpacity 
              style={styles.modalDoneBtn}
              onPress={() => setMaterialsModal(null)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {picker && (
        <PickerSheet
          visible={picker.visible}
          title={picker.title}
          options={picker.options}
          selectedValue={picker.selectedValue}
          onSelect={picker.onSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {alert && (
        <AlertModal
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  list: { padding: 24 },
  scheduleCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:5 },
  scheduleInfo: { flex: 1 },
  scheduleName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  scheduleMeta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  scheduleCardActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  exportIconBtn: { backgroundColor: theme.colors.primary + '10', padding: 8, borderRadius: 10 },
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
  
  formContainer: { flex: 1, backgroundColor: 'white' },
  formContent: { padding: 24, paddingBottom: 60 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15 },
  select: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: theme.colors.text },
  row: { flexDirection: 'row', gap: 12 },
  entriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  addEntryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addEntryText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  entryCard: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontWeight: 'bold', color: theme.colors.textMuted },
  saveBtn: { flex: 2, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: theme.colors.primary },
  saveBtnText: { fontWeight: 'bold', color: 'white' },

  targetList: { marginTop: 12, gap: 10 },
  targetItem: { padding: 12, backgroundColor: '#F1F5F9', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetClassName: { fontWeight: 'bold', color: theme.colors.text },
  sectionChips: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 11, color: 'white', fontWeight: 'bold' },

  syllabusSection: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  materialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '10', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  materialBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  
  attachedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  attachedItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDF2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: '100%' },
  attachedName: { fontSize: 12, color: theme.colors.textMuted, maxWidth: 100 },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  materialsModal: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  modalBody: { flex: 1 },
  modalSub: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 16 },
  uploadBox: { borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.primary + '40', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, marginBottom: 20 },
  uploadText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  listLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  materialItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  materialItemSelected: { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary },
  materialName: { flex: 1, fontSize: 14, color: theme.colors.text },
  materialNameSelected: { fontWeight: 'bold', color: theme.colors.primary },
  noMaterials: { textAlign: 'center', color: theme.colors.textMuted, marginVertical: 20 },
  modalDoneBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  modalDoneText: { color: 'white', fontWeight: 'bold' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customBackBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 10 }
});
