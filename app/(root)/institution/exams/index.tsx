import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useExamTimetable } from '../../../../src/hooks/useExamTimetable';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { useQuery } from '@tanstack/react-query';
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
import { generateAndDownloadTimetablePdf, TimetableClassPageData } from '../../../../src/utils/timetablePdfGenerator';

interface ClassExamEntry {
  id: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  syllabus_notes: string;
  attached_materials: any[];
}

interface ClassTargetGroup {
  classId: string;
  className: string;
  sections: string[];
  entries: ClassExamEntry[];
  isExpanded?: boolean;
}

export default function InstitutionExams() {
  const { institutionId, institutionUuid, institutionName, institutionLogo, user, academicYear } = useAuth();
  const router = useRouter();
  
  const { 
    schedules, 
    isLoadingSchedules, 
    createSchedule, 
    deleteSchedule,
    fetchEntries
  } = useExamTimetable({ institutionId: institutionId || undefined });

  const { classes: rawClasses = [], subjects: rawSubjects = [], assignments = [], isLoading: isDataLoading } = useInstitutionFaculty(institutionId);
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

  // Fetch materials across classes to discover subjects with faculty-uploaded materials
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['institution-materials-all', institutionUuid, institutionId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('subject_materials')
          .select(`
            id,
            class_id,
            subject_id,
            title,
            file_name,
            file_url,
            subjects:subject_id(id, name, code, class_name)
          `);

        if (institutionUuid) {
          query = query.eq('institution_id', institutionUuid);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('Error querying subject_materials by institutionUuid:', error);
          if (uniqueClasses.length > 0) {
            const classIds = uniqueClasses.map(c => c.id);
            const { data: byClassData } = await supabase
              .from('subject_materials')
              .select(`
                id,
                class_id,
                subject_id,
                title,
                file_name,
                file_url,
                subjects:subject_id(id, name, code, class_name)
              `)
              .in('class_id', classIds);
            return byClassData || [];
          }
          return [];
        }
        return data || [];
      } catch (e) {
        console.warn('Failed to query materials:', e);
        return [];
      }
    },
    enabled: !!(institutionId || institutionUuid),
  });

  // Deduplicated unique subjects across the institution
  const uniqueSubjectNames = useMemo(() => {
    const seen = new Set<string>();
    return (rawSubjects as any[])
      .filter(s => {
        const key = s.name?.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rawSubjects]);

  // Context-aware subject getter for any particular class
  // Integrates:
  // 1. Subjects that have materials uploaded by faculties for this class (clearly highlighted)
  // 2. Subjects assigned to faculty for this class in faculty_subjects
  // 3. Subjects registered in subjects table for this class_name
  // 4. Other institution subjects (so no subject is ever excluded)
  const getSubjectsForClass = (classId: string, className: string) => {
    const normClassName = (className || '').trim().toLowerCase();

    // 1. Identify subjects with uploaded materials for this specific class
    const materialsForClass = (rawMaterials as any[]).filter(m => m.class_id === classId);
    const materialSubjectNames = new Set<string>();
    materialsForClass.forEach(m => {
      const name = m.subjects?.name || (rawSubjects as any[]).find((s: any) => s.id === m.subject_id)?.name;
      if (name && name.trim()) {
        materialSubjectNames.add(name.trim());
      }
    });

    // 2. Identify subjects assigned to faculty for this specific class
    const assignmentsForClass = (assignments as any[]).filter((a: any) => a.class_id === classId && a.subject_id);
    const assignedSubjectNames = new Set<string>();
    assignmentsForClass.forEach((a: any) => {
      const name = a.subjects?.name || (rawSubjects as any[]).find((s: any) => s.id === a.subject_id)?.name;
      if (name && name.trim()) {
        assignedSubjectNames.add(name.trim());
      }
    });

    // 3. Registered subjects in subjects table matching class_name
    const registeredClassSubjects = (rawSubjects as any[]).filter((s: any) => 
      s.class_name && s.class_name.trim().toLowerCase() === normClassName
    );
    const registeredSubjectNames = new Set<string>();
    registeredClassSubjects.forEach((s: any) => {
      if (s.name && s.name.trim()) {
        registeredSubjectNames.add(s.name.trim());
      }
    });

    // Combine primary subjects for this class (materials + assigned + registered)
    const primaryClassSubjectNames = new Set<string>([
      ...materialSubjectNames,
      ...assignedSubjectNames,
      ...registeredSubjectNames
    ]);

    const resultOptions: { label: string; value: string }[] = [];
    const addedValues = new Set<string>();

    // Add primary class subjects first (with materials highlighted)
    const sortedPrimary = Array.from(primaryClassSubjectNames).sort((a, b) => a.localeCompare(b));
    sortedPrimary.forEach(name => {
      const lower = name.toLowerCase();
      if (!addedValues.has(lower)) {
        addedValues.add(lower);
        const hasMaterials = materialSubjectNames.has(name);
        resultOptions.push({
          label: hasMaterials ? `${name} (Materials Available)` : name,
          value: name,
        });
      }
    });

    // Also include any other unique institution subjects below so the user is never blocked
    uniqueSubjectNames.forEach((s: any) => {
      const lower = (s.name || '').trim().toLowerCase();
      if (lower && !addedValues.has(lower)) {
        addedValues.add(lower);
        resultOptions.push({
          label: s.name,
          value: s.name,
        });
      }
    });

    return resultOptions;
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);
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

  // Form State: each targetGroup contains its own class-specific exam entries
  const [formData, setFormData] = useState({
    targetGroups: [] as ClassTargetGroup[],
    exam_type: 'Midterm',
    exam_display_name: '',
    academic_year: academicYear || '2026-27',
  });

  // Check if all classes are currently selected
  const isAllClassesSelected = useMemo(() => {
    if (uniqueClasses.length === 0) return false;
    if (formData.targetGroups.length !== uniqueClasses.length) return false;
    return uniqueClasses.every(c => formData.targetGroups.some(g => g.classId === c.id));
  }, [uniqueClasses, formData.targetGroups]);

  const addAllClasses = () => {
    const allGroups: ClassTargetGroup[] = uniqueClasses.map(c => ({
      classId: c.id,
      className: c.name,
      sections: [...c.sections],
      entries: [],
      isExpanded: true,
    }));
    setFormData(prev => ({
      ...prev,
      targetGroups: allGroups
    }));
  };

  const clearAllClasses = () => {
    setFormData(prev => ({
      ...prev,
      targetGroups: []
    }));
  };

  const removeClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.filter(g => g.classId !== classId)
    }));
  };

  const addTargetGroup = (classId: string, section: string) => {
    const cls = uniqueClasses.find(c => c.id === classId);
    const className = cls?.name || classNameMap[classId] || 'Class';
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
        targetGroups: [...prev.targetGroups, {
          classId,
          className,
          sections: [section],
          entries: [],
          isExpanded: true,
        }]
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

  const toggleClassExpanded = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId
        ? { ...g, isExpanded: g.isExpanded === false ? true : false }
        : g)
    }));
  };

  const addEntryForClass = (classId: string) => {
    const newEntry: ClassExamEntry = {
      id: Math.random().toString(36).substr(2, 9),
      subject: '',
      exam_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '12:00',
      syllabus_notes: '',
      attached_materials: [],
    };
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId
        ? { ...g, entries: [...g.entries, newEntry], isExpanded: true }
        : g)
    }));
  };

  const updateEntryForClass = (classId: string, entryId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId
        ? {
            ...g,
            entries: g.entries.map(e => e.id === entryId ? { ...e, [field]: value } : e)
          }
        : g)
    }));
  };

  const removeEntryForClass = (classId: string, entryId: string) => {
    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId
        ? {
            ...g,
            entries: g.entries.filter(e => e.id !== entryId)
          }
        : g)
    }));
  };

  const autoPopulateClassSubjects = (classId: string, className: string) => {
    const subOptions = getSubjectsForClass(classId, className);
    if (subOptions.length === 0) {
      setAlert({
        visible: true,
        title: "No Registered Subjects",
        message: `No specific subjects registered for ${className}. You can add subjects manually using the "+ Add Subject" button.`,
        type: 'info'
      });
      return;
    }

    const normClassName = (className || '').trim().toLowerCase();
    const materialsForClass = (rawMaterials as any[]).filter(m => m.class_id === classId);
    const materialSubjectNames = new Set<string>();
    materialsForClass.forEach(m => {
      const name = m.subjects?.name || (rawSubjects as any[]).find((s: any) => s.id === m.subject_id)?.name;
      if (name && name.trim()) materialSubjectNames.add(name.trim());
    });

    const assignmentsForClass = (assignments as any[]).filter((a: any) => a.class_id === classId && a.subject_id);
    const assignedSubjectNames = new Set<string>();
    assignmentsForClass.forEach((a: any) => {
      const name = a.subjects?.name || (rawSubjects as any[]).find((s: any) => s.id === a.subject_id)?.name;
      if (name && name.trim()) assignedSubjectNames.add(name.trim());
    });

    const registeredClassSubjects = (rawSubjects as any[]).filter((s: any) => 
      s.class_name && s.class_name.trim().toLowerCase() === normClassName
    );
    const registeredSubjectNames = new Set<string>();
    registeredClassSubjects.forEach((s: any) => {
      if (s.name && s.name.trim()) registeredSubjectNames.add(s.name.trim());
    });

    const primaryNames = Array.from(new Set([
      ...materialSubjectNames,
      ...assignedSubjectNames,
      ...registeredSubjectNames
    ])).sort((a, b) => a.localeCompare(b));

    const targetList = primaryNames.length > 0 ? primaryNames : subOptions.map(o => o.value);

    const generatedEntries: ClassExamEntry[] = targetList.map((subjectName, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + idx);

      return {
        id: Math.random().toString(36).substr(2, 9),
        subject: subjectName,
        exam_date: d.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '12:00',
        syllabus_notes: '',
        attached_materials: [], // Only attach materials when explicitly selected by the user
      };
    });

    setFormData(prev => ({
      ...prev,
      targetGroups: prev.targetGroups.map(g => g.classId === classId
        ? { ...g, entries: generatedEntries, isExpanded: true }
        : g)
    }));
  };

  // Keep academic year in sync once it loads from Auth
  React.useEffect(() => {
    if (academicYear) {
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

  const [exportModal, setExportModal] = useState<{
    visible: boolean;
    schedule: any;
    scope: 'all' | 'single';
    academicYear: string;
    signatories: string[];
    newSignatoryText: string;
    instructions: string;
    isGenerating: boolean;
  } | null>(null);

  const handleCreate = async () => {
    if (formData.targetGroups.length === 0) {
      setAlert({
        visible: true,
        title: "Missing Info",
        message: "Please add at least one target class/section.",
        type: 'error'
      });
      return;
    }

    if (!formData.exam_display_name) {
      setAlert({
        visible: true,
        title: "Missing Info",
        message: "Please enter an Exam Name.",
        type: 'error'
      });
      return;
    }

    const emptyClasses = formData.targetGroups.filter(g => g.entries.length === 0);
    if (emptyClasses.length > 0) {
      setAlert({
        visible: true,
        title: "Subjects Required",
        message: `Please add exam subjects for: ${emptyClasses.map(c => c.className).join(', ')}.`,
        type: 'error'
      });
      return;
    }

    const missingSubject = formData.targetGroups.some(g => g.entries.some(e => !e.subject));
    if (missingSubject) {
      setAlert({
        visible: true,
        title: "Missing Subject Name",
        message: "Please ensure all exam entries have a subject selected.",
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
            entries: group.entries.map(e => ({
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
        academic_year: academicYear || '2026-27',
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

  const fetchMaterials = async (subject: string, selectedClassIds: string[] = []) => {
    try {
      setIsLoadingMaterials(true);
      setAvailableMaterials([]);

      let query = supabase
        .from('subject_materials')
        .select(`
          *,
          profiles:faculty_id(full_name),
          subjects:subject_id(name)
        `);

      if (selectedClassIds.length > 0) {
        query = query.in('class_id', selectedClassIds);
      } else if (institutionUuid) {
        query = query.eq('institution_id', institutionUuid);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching materials:', error);
      }

      let matched = (data || []).filter((m: any) => {
        const subName = m.subjects?.name || m.title || '';
        return subName.toLowerCase().includes(subject.toLowerCase()) || subject.toLowerCase().includes(subName.toLowerCase());
      });

      // Fallback: If no direct matches with class_id, query institution-wide using institutionUuid or known class IDs
      if (matched.length === 0) {
        let fallbackQuery = supabase
          .from('subject_materials')
          .select(`
            *,
            profiles:faculty_id(full_name),
            subjects:subject_id(name)
          `);

        if (institutionUuid) {
          fallbackQuery = fallbackQuery.eq('institution_id', institutionUuid);
        } else if (uniqueClasses.length > 0) {
          fallbackQuery = fallbackQuery.in('class_id', uniqueClasses.map(c => c.id));
        }

        const { data: instData } = await fallbackQuery;

        matched = (instData || []).filter((m: any) => {
          const subName = m.subjects?.name || m.title || '';
          return subName.toLowerCase().includes(subject.toLowerCase()) || subject.toLowerCase().includes(subName.toLowerCase());
        });
      }

      // Deduplicate materials by file_url or id
      const uniqueMats: any[] = [];
      const seen = new Set<string>();
      matched.forEach((m: any) => {
        const key = m.file_url || m.id;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMats.push(m);
        }
      });

      setAvailableMaterials(uniqueMats);
    } catch (err) {
      console.error("[ExamMgmt] Error fetching materials:", err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const uploadSyllabus = async (classId: string, entryId: string) => {
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
        .from('assignments')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      const targetGroup = formData.targetGroups.find(g => g.classId === classId);
      const targetEntry = targetGroup?.entries.find(e => e.id === entryId);
      const existingMats = targetEntry?.attached_materials || [];

      updateEntryForClass(classId, entryId, 'attached_materials', [
        ...existingMats,
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

  const exportTimetable = (schedule: any) => {
    const activeYear = academicYear || '2026-27';
    const scheduleYear = schedule.academic_year && schedule.academic_year !== '2023-24' 
      ? schedule.academic_year 
      : activeYear;

    setExportModal({
      visible: true,
      schedule: schedule,
      scope: 'all',
      academicYear: scheduleYear,
      signatories: ['Class Teacher', 'Exam Controller', 'Principal', 'Subject Faculty'],
      newSignatoryText: '',
      instructions: 'Students must be seated 15 minutes before the exam commences. Bring all required stationery and admit card. Electronic devices are strictly prohibited.',
      isGenerating: false,
    });
  };

  const handleExecuteExportPdf = async () => {
    if (!exportModal) return;
    try {
      setExportModal(prev => prev ? { ...prev, isGenerating: true } : null);

      const targetSchedule = exportModal.schedule;
      let targetGroups: any[] = [];

      if (exportModal.scope === 'all') {
        // Collect all grouped schedules that share the same exam display name
        targetGroups = groupedSchedules.filter(g => 
          g.exam_display_name === targetSchedule.exam_display_name
        );
        if (targetGroups.length === 0) {
          targetGroups = [targetSchedule];
        }
      } else {
        targetGroups = [targetSchedule];
      }

      // Sort classes in order
      const sortedClasses = [...targetGroups].sort((a, b) => {
        const nameA = classNameMap[a.class_id] || a.class_id || '';
        const nameB = classNameMap[b.class_id] || b.class_id || '';
        return nameA.localeCompare(nameB);
      });

      const classPagesData: TimetableClassPageData[] = [];

      for (const group of sortedClasses) {
        const allEntriesMap = new Map<string, any>();
        for (const id of group.ids) {
          const entries = await fetchEntries(id);
          (entries || []).forEach((e: any) => {
            const key = `${e.exam_date}_${e.subject}`;
            if (!allEntriesMap.has(key)) {
              // Also find matching materials from rawMaterials for this class & subject
              const matchingMats = (rawMaterials as any[]).filter(m => 
                (m.class_id === group.class_id || !m.class_id) &&
                (m.subjects?.name?.toLowerCase() === e.subject?.toLowerCase() || m.title?.toLowerCase().includes(e.subject?.toLowerCase()))
              );

              allEntriesMap.set(key, {
                ...e,
                attached_materials: [
                  ...((e as any).attached_materials || []),
                  ...matchingMats.map(m => ({
                    id: m.id,
                    name: m.file_name || m.title || 'Attachment',
                    title: m.title || m.file_name,
                    url: m.file_url
                  }))
                ]
              });
            }
          });
        }

        classPagesData.push({
          className: classNameMap[group.class_id] || group.class_id,
          sections: group.sections || [],
          examType: group.exam_type || 'Exam',
          entries: Array.from(allEntriesMap.values()),
        });
      }

      const signatories = exportModal.signatories;
      const instructions = exportModal.instructions;
      const chosenYear = exportModal.academicYear || targetSchedule.academic_year || academicYear || '2026-27';
      const cleanAcademicYear = chosenYear === '2023-24' ? (academicYear || '2026-27') : chosenYear;

      setExportModal(null);
      // Wait for modal to cleanly unmount from the DOM tree before opening print dialog
      await new Promise(r => setTimeout(r, 250));

      await generateAndDownloadTimetablePdf({
        institutionName: institutionName || 'Institution',
        institutionLogo: institutionLogo,
        examDisplayName: targetSchedule.exam_display_name || 'Exam Timetable',
        academicYear: cleanAcademicYear,
        classes: classPagesData,
        signatories: signatories,
        instructions: instructions,
      });
    } catch (err: any) {
      console.error('Export PDF error:', err);
      Alert.alert('Error', 'Failed to generate timetable PDF: ' + (err.message || 'Unknown error'));
      setExportModal(null);
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
          
          {/* 1. Exam Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exam Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Annual Exams 2026"
              value={formData.exam_display_name}
              onChangeText={(v) => setFormData(p => ({ ...p, exam_display_name: v }))}
            />
          </View>

          {/* 2. Exam Type & Academic Year */}
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

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Academic Year</Text>
              <TextInput 
                style={styles.input}
                placeholder="2026-27"
                value={formData.academic_year}
                onChangeText={(v) => setFormData(p => ({ ...p, academic_year: v }))}
              />
            </View>
          </View>

          {/* 3. Targeted Classes & Per-Class Subject Timetable */}
          <View style={styles.inputGroup}>
            <View style={styles.targetHeaderRow}>
              <Text style={styles.label}>Targeted Classes & Subject Timetable</Text>
              {formData.targetGroups.length > 0 && (
                <TouchableOpacity onPress={clearAllClasses}>
                  <Text style={styles.clearClassesText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Action Selection Bar */}
            <View style={styles.classSelectorRow}>
              <TouchableOpacity 
                style={[
                  styles.classModeBtn, 
                  isAllClassesSelected && styles.classModeBtnActive
                ]}
                onPress={addAllClasses}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color={isAllClassesSelected ? 'white' : theme.colors.primary} {...({} as any)} />
                <Text style={[styles.classModeBtnText, isAllClassesSelected && styles.classModeBtnTextActive]}>
                  All Classes ({uniqueClasses.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.classModeBtnSecondary}
                onPress={() => setPicker({
                  visible: true,
                  title: "Select Particular Class",
                  options: uniqueClasses.map((c: any) => ({ 
                    label: `${c.name} (${c.sections.join(', ')})`, 
                    value: c.id 
                  })),
                  selectedValue: null,
                  onSelect: (val) => {
                    const cls = uniqueClasses.find((c: any) => c.id === val);
                    if (cls && cls.sections) {
                      cls.sections.forEach((s: string) => addTargetGroup(val, s));
                    }
                  }
                })}
                activeOpacity={0.8}
              >
                <Plus size={16} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.classModeBtnTextSecondary}>Add Particular Class</Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown Selector */}
            <TouchableOpacity 
              style={[styles.select, { marginTop: 10 }]}
              onPress={() => setPicker({
                visible: true,
                title: "Select the Classes",
                options: [
                  { label: `All Classes (Auto-adds all ${uniqueClasses.length} classes)`, value: 'ALL' },
                  ...uniqueClasses.map((c: any) => ({ 
                    label: `${c.name} (Sections: ${c.sections.join(', ')})`, 
                    value: c.id 
                  }))
                ],
                selectedValue: isAllClassesSelected ? 'ALL' : null,
                onSelect: (val) => {
                  if (val === 'ALL') {
                    addAllClasses();
                  } else {
                    const cls = uniqueClasses.find((c: any) => c.id === val);
                    if (cls && cls.sections) {
                      cls.sections.forEach((s: string) => addTargetGroup(val, s));
                    }
                  }
                }
              })}
            >
              <Text style={styles.selectText}>
                {formData.targetGroups.length === 0 
                  ? "Select the Classes..." 
                  : isAllClassesSelected
                    ? `All Classes Selected (${uniqueClasses.length} classes)`
                    : `${formData.targetGroups.length} Class(es) Selected`}
              </Text>
              <ChevronDown size={16} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>

            {/* Target Classes List: Each class card embeds its own subject timetable */}
            {formData.targetGroups.length > 0 && (
              <View style={styles.targetList}>
                {formData.targetGroups.map(group => {
                  const className = group.className || uniqueClasses.find((c: any) => c.id === group.classId)?.name || classNameMap[group.classId] || 'Class';
                  const classSubjectOptions = getSubjectsForClass(group.classId, className);
                  const isExpanded = group.isExpanded !== false;

                  return (
                    <View key={group.classId} style={styles.classAccordionCard}>
                      {/* Class Header */}
                      <TouchableOpacity 
                        style={styles.classAccordionHead}
                        onPress={() => toggleClassExpanded(group.classId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.classHeaderLeft}>
                          <ChevronRight 
                            size={18} 
                            color={theme.colors.primary} 
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                            {...({} as any)} 
                          />
                          <Text style={styles.targetClassName}>{className}</Text>
                          <View style={styles.subjectCountBadge}>
                            <Text style={styles.subjectCountText}>
                              {group.entries.length} Subject{group.entries.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.classHeaderRight}>
                          <View style={styles.sectionChips}>
                            {group.sections.map(sec => (
                              <TouchableOpacity 
                                key={sec} 
                                style={styles.chip}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  removeTargetGroup(group.classId, sec);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.chipText}>{sec}</Text>
                                <X size={12} color="white" {...({} as any)} />
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TouchableOpacity 
                            style={styles.removeClassBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              removeClass(group.classId);
                            }}
                          >
                            <Trash2 size={16} color="#EF4444" {...({} as any)} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      {/* Class Subjects Box (Expanded) */}
                      {isExpanded && (
                        <View style={styles.classSubjectsContainer}>
                          {/* Subject Actions Header inside this class */}
                          <View style={styles.classSubjectsToolbar}>
                            <TouchableOpacity 
                              style={styles.autoPopulateBtn}
                              onPress={() => autoPopulateClassSubjects(group.classId, className)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.autoPopulateText}>Load {className} Subjects</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.addSubjectBtnSmall}
                              onPress={() => addEntryForClass(group.classId)}
                              activeOpacity={0.8}
                            >
                              <Plus size={14} color={theme.colors.primary} {...({} as any)} />
                              <Text style={styles.addSubjectTextSmall}>Add Subject</Text>
                            </TouchableOpacity>
                          </View>

                          {/* List of Subject Entries for this class */}
                          {group.entries.length === 0 ? (
                            <View style={styles.emptySubjectCard}>
                              <Text style={styles.emptySubjectText}>
                                No subjects added for {className} yet.
                              </Text>
                              <TouchableOpacity 
                                style={styles.quickAddBtn}
                                onPress={() => addEntryForClass(group.classId)}
                              >
                                <Text style={styles.quickAddBtnText}>+ Add First Subject</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            group.entries.map((entry) => (
                              <View key={entry.id} style={styles.entryCardInsideClass}>
                                <View style={styles.entryHead}>
                                  <TouchableOpacity 
                                    style={[styles.select, { flex: 1, backgroundColor: 'white' }]}
                                    onPress={() => setPicker({
                                      visible: true,
                                      title: `Select Subject for ${className}`,
                                      options: classSubjectOptions,
                                      selectedValue: entry.subject,
                                      onSelect: (val) => updateEntryForClass(group.classId, entry.id, 'subject', val)
                                    })}
                                  >
                                    <Text style={[styles.selectText, !entry.subject && { color: theme.colors.textMuted }]}>
                                      {entry.subject || `Select ${className} Subject`}
                                    </Text>
                                    <ChevronDown size={16} color={theme.colors.textMuted} {...({} as any)} />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={{ padding: 8 }}
                                    onPress={() => removeEntryForClass(group.classId, entry.id)}
                                  >
                                    <Trash2 size={18} color="#EF4444" {...({} as any)} />
                                  </TouchableOpacity>
                                </View>

                                <View style={styles.row}>
                                  <View style={[styles.inputGroup, { flex: 1, marginBottom: 10 }]}>
                                    <Text style={styles.label}>Date</Text>
                                    <TouchableOpacity 
                                      style={[styles.select, { backgroundColor: 'white' }]}
                                      onPress={() => setShowDatePicker({ id: `${group.classId}_${entry.id}`, visible: true })}
                                    >
                                      <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                                      <Text style={styles.selectText}>{entry.exam_date}</Text>
                                    </TouchableOpacity>
                                    <CalendarModal
                                      visible={showDatePicker.id === `${group.classId}_${entry.id}` && showDatePicker.visible}
                                      onClose={() => setShowDatePicker({ id: '', visible: false })}
                                      initialDate={entry.exam_date}
                                      onSelect={(date) => {
                                        updateEntryForClass(group.classId, entry.id, 'exam_date', date);
                                      }}
                                    />
                                  </View>

                                  <View style={[styles.inputGroup, { flex: 1, marginBottom: 10 }]}>
                                    <Text style={styles.label}>Time (S - E)</Text>
                                    <View style={styles.row}>
                                      <TextInput 
                                        style={[styles.input, { flex: 1, backgroundColor: 'white' }]} 
                                        value={entry.start_time}
                                        placeholder="09:00"
                                        onChangeText={(v) => updateEntryForClass(group.classId, entry.id, 'start_time', v)}
                                      />
                                      <TextInput 
                                        style={[styles.input, { flex: 1, backgroundColor: 'white' }]} 
                                        value={entry.end_time}
                                        placeholder="12:00"
                                        onChangeText={(v) => updateEntryForClass(group.classId, entry.id, 'end_time', v)}
                                      />
                                    </View>
                                  </View>
                                </View>

                                <View style={styles.syllabusSection}>
                                  <TextInput 
                                    style={[styles.input, { flex: 1, backgroundColor: 'white' }]} 
                                    placeholder="Additional syllabus notes..."
                                    value={entry.syllabus_notes}
                                    onChangeText={(v) => updateEntryForClass(group.classId, entry.id, 'syllabus_notes', v)}
                                  />
                                  <TouchableOpacity 
                                    style={styles.materialBtn}
                                    onPress={() => {
                                      if (!entry.subject) {
                                        setAlert({ visible: true, title: "Subject Required", message: "Please select a subject first.", type: 'error' });
                                        return;
                                      }
                                      setMaterialsModal({ 
                                        entryId: entry.id, 
                                        subject: entry.subject, 
                                        classId: group.classId, 
                                        visible: true 
                                      });
                                      fetchMaterials(entry.subject, [group.classId]);
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
                                        <Text style={styles.attachedName} numberOfLines={1}>{m.title || m.name}</Text>
                                        <TouchableOpacity onPress={() => {
                                          const newMats = [...entry.attached_materials];
                                          newMats.splice(idx, 1);
                                          updateEntryForClass(group.classId, entry.id, 'attached_materials', newMats);
                                        }}>
                                          <X size={14} color="#EF4444" {...({} as any)} />
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

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
                onPress={() => uploadSyllabus(materialsModal.classId, materialsModal.entryId)}
              >
                <FileUp size={24} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.uploadText}>Upload New Note/PDF</Text>
              </TouchableOpacity>

              <Text style={styles.listLabel}>Existing Materials</Text>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              {isLoadingMaterials ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
              ) : availableMaterials.length > 0 ? (
                availableMaterials.map((item: any) => {
                  const targetGroup = formData.targetGroups.find(g => g.classId === materialsModal.classId);
                  const entry = targetGroup?.entries.find(e => e.id === materialsModal.entryId);
                  const isAttached = entry?.attached_materials?.some((m: any) => (m.url || m.file_url) === item.file_url);
                  
                  return (
                    <TouchableOpacity 
                      key={item.id}
                      style={[styles.materialItem, isAttached && styles.materialItemSelected]}
                      onPress={() => {
                        const currentMats = entry?.attached_materials || [];
                        if (isAttached) {
                          updateEntryForClass(materialsModal.classId, materialsModal.entryId, 'attached_materials', currentMats.filter((m: any) => (m.url || m.file_url) !== item.file_url));
                        } else {
                          updateEntryForClass(materialsModal.classId, materialsModal.entryId, 'attached_materials', [
                            ...currentMats, 
                            { 
                              id: item.id, 
                              name: item.title || item.file_name || 'Material', 
                              url: item.file_url, 
                              file_url: item.file_url, 
                              type: 'existing' 
                            }
                          ]);
                        }
                      }}
                    >
                      <BookOpen size={18} color={isAttached ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.materialName, isAttached && styles.materialNameSelected]}>{item.title}</Text>
                        {item.profiles?.full_name && (
                          <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>by {item.profiles.full_name}</Text>
                        )}
                      </View>
                      {isAttached && <CheckCircle2 size={18} color={theme.colors.primary} {...({} as any)} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noMaterials}>No existing materials found for this subject.</Text>
              )}
            </ScrollView>
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

      {/* Export / Download PDF Modal */}
      {exportModal && exportModal.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle}>Download Exam Timetable</Text>
                <Text style={styles.modalSub}>
                  {exportModal.schedule?.exam_display_name || 'Timetable'} • PDF Format
                </Text>
              </View>
              <TouchableOpacity onPress={() => setExportModal(null)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Scope Selection */}
              <Text style={styles.exportFieldLabel}>Classes to Include</Text>
              <View style={styles.exportScopeRow}>
                <TouchableOpacity 
                  style={[styles.exportScopeBtn, exportModal.scope === 'all' && styles.exportScopeBtnActive]}
                  onPress={() => setExportModal(prev => prev ? { ...prev, scope: 'all' } : null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exportScopeText, exportModal.scope === 'all' && styles.exportScopeTextActive]}>
                    All Classes in this Exam
                  </Text>
                  <Text style={[styles.exportScopeSubText, exportModal.scope === 'all' && { color: 'rgba(255,255,255,0.85)' }]}>
                    1 Page Per Class
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.exportScopeBtn, exportModal.scope === 'single' && styles.exportScopeBtnActive]}
                  onPress={() => setExportModal(prev => prev ? { ...prev, scope: 'single' } : null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exportScopeText, exportModal.scope === 'single' && styles.exportScopeTextActive]}>
                    This Class Only
                  </Text>
                  <Text style={[styles.exportScopeSubText, exportModal.scope === 'single' && { color: 'rgba(255,255,255,0.85)' }]}>
                    {classNameMap[exportModal.schedule?.class_id] || 'Selected Class'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Academic Year */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.exportFieldLabel}>Academic Year</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: theme.colors.text }]}
                  value={exportModal.academicYear}
                  onChangeText={(txt) => setExportModal(prev => prev ? { ...prev, academicYear: txt } : null)}
                  placeholder="e.g. 2026-27"
                />
              </View>

              {/* Signatures Configuration */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.exportFieldLabel}>Signature Placeholders</Text>
                <Text style={styles.exportFieldHelper}>
                  These title placeholders will appear at the bottom of each class's timetable page for authorization.
                </Text>

                <View style={styles.signatoriesChipsRow}>
                  {exportModal.signatories.map((sig, idx) => (
                    <View key={idx} style={styles.signatoryChip}>
                      <Text style={styles.signatoryChipText}>{sig}</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          setExportModal(prev => prev ? {
                            ...prev,
                            signatories: prev.signatories.filter((_, i) => i !== idx)
                          } : null);
                        }}
                        style={{ padding: 2 }}
                      >
                        <X size={13} color="#EF4444" {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Add Custom Signatory Row */}
                <View style={styles.addSignatoryRow}>
                  <TextInput 
                    style={[styles.input, { flex: 1, backgroundColor: '#F8FAFC' }]}
                    placeholder="Add title (e.g., Dean, Invigilator, Headmaster)..."
                    value={exportModal.newSignatoryText}
                    onChangeText={(txt) => setExportModal(prev => prev ? { ...prev, newSignatoryText: txt } : null)}
                    onSubmitEditing={() => {
                      if (exportModal.newSignatoryText.trim()) {
                        setExportModal(prev => prev ? {
                          ...prev,
                          signatories: [...prev.signatories, prev.newSignatoryText.trim()],
                          newSignatoryText: '',
                        } : null);
                      }
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.addSignatoryBtn}
                    onPress={() => {
                      if (exportModal.newSignatoryText.trim()) {
                        setExportModal(prev => prev ? {
                          ...prev,
                          signatories: [...prev.signatories, prev.newSignatoryText.trim()],
                          newSignatoryText: '',
                        } : null);
                      }
                    }}
                  >
                    <Plus size={16} color="white" {...({} as any)} />
                    <Text style={styles.addSignatoryBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Instructions Text */}
              <View style={{ marginTop: 14, marginBottom: 6 }}>
                <Text style={styles.exportFieldLabel}>General Student Instructions</Text>
                <TextInput 
                  style={[styles.input, { height: 60, textAlignVertical: 'top', backgroundColor: '#F8FAFC', paddingTop: 8 }]}
                  multiline
                  value={exportModal.instructions}
                  onChangeText={(txt) => setExportModal(prev => prev ? { ...prev, instructions: txt } : null)}
                  placeholder="Enter exam instructions for students..."
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.exportModalActions}>
              <TouchableOpacity 
                style={styles.exportCancelBtn}
                onPress={() => setExportModal(null)}
                disabled={exportModal.isGenerating}
              >
                <Text style={styles.exportCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.exportDownloadBtn, exportModal.isGenerating && { opacity: 0.7 }]}
                onPress={handleExecuteExportPdf}
                disabled={exportModal.isGenerating}
              >
                {exportModal.isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Download size={18} color="white" {...({} as any)} />
                    <Text style={styles.exportDownloadText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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

  targetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clearClassesText: { fontSize: 13, fontWeight: 'bold', color: '#EF4444' },
  classSelectorRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  classModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.colors.primary + '15', borderWidth: 1, borderColor: theme.colors.primary + '30' },
  classModeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  classModeBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  classModeBtnTextActive: { color: 'white' },
  classModeBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  classModeBtnTextSecondary: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },

  targetList: { marginTop: 12, gap: 10 },
  targetItem: { padding: 12, backgroundColor: '#F1F5F9', borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetClassName: { fontWeight: 'bold', color: theme.colors.text, fontSize: 14 },
  sectionChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 11, color: 'white', fontWeight: 'bold' },
  removeClassBtn: { padding: 6, marginLeft: 8 },

  classAccordionCard: { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 8 },
  classAccordionHead: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9' },
  classHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  classHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectCountBadge: { backgroundColor: theme.colors.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 4 },
  subjectCountText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
  classSubjectsContainer: { padding: 14, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  classSubjectsToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 },
  autoPopulateBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: theme.colors.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14, 
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  autoPopulateText: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    letterSpacing: 0.2 
  },
  addSubjectBtnSmall: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    backgroundColor: 'white', 
    paddingHorizontal: 14, 
    paddingVertical: 9, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  addSubjectTextSmall: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  emptySubjectCard: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', gap: 8 },
  emptySubjectText: { fontSize: 13, color: theme.colors.textMuted },
  quickAddBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primary + '15' },
  quickAddBtnText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  entryCardInsideClass: { padding: 14, backgroundColor: 'white', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },

  syllabusSection: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  materialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '10', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  materialBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  
  attachedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  attachedItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDF2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: '100%' },
  attachedName: { fontSize: 12, color: theme.colors.textMuted, maxWidth: 100 },

  modalOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  materialsModal: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 5, flexDirection: 'column' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, flex: 1, marginRight: 10 },
  modalBody: { minHeight: 200 },
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
  customBackBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 10 },

  /* PDF Export Modal Styles */
  exportModalContent: {
    width: '92%',
    maxWidth: 580,
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  exportFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  exportFieldHelper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  exportScopeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  exportScopeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportScopeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  exportScopeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  exportScopeTextActive: {
    color: 'white',
  },
  exportScopeSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  signatoriesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  signatoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  signatoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  addSignatoryRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSignatoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addSignatoryBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
  },
  exportModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  exportCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  exportCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  exportDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  exportDownloadText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
