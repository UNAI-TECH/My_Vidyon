import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  User,
  ChevronRight,
  Filter
} from 'lucide-react-native';

export default function StudentDirectory() {
  const { user, institutionId } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);

  // 1. Fetch faculty assignments to get list of classes
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['faculty-assignments-dir', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, classes:class_id(name)')
        .eq('faculty_profile_id', user.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  const classes = React.useMemo(() => {
    const unique = new Set();
    return assignments.map(a => ({
      id: a.class_id,
      name: a.classes?.name,
      section: a.section
    })).filter(c => {
      const key = `${c.name}-${c.section}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    });
  }, [assignments]);

  // 2. Fetch students for all/selected classes
  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ['directory-students', user?.id, selectedClass],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('students')
        .select('id, name, register_number, phone_number, parent_phone, class_name, section')
        .eq('institution_id', institutionId as string);

      if (selectedClass) {
        const [className, section] = selectedClass.split('-');
        query = query.eq('class_name', className).eq('section', section);
      } else {
        // If no class selected, fetch all students in faculty's assigned classes
        const classFilters = classes.map(c => `and(class_name.eq.${c.name},section.eq.${c.section})`).join(',');
        if (classFilters) {
          query = query.or(classFilters);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && (classes.length > 0 || !!selectedClass),
  });

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.register_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (phone: string | null) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    // Remove non-numeric characters for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Student Directory" subtitle="Quick contact and student info" />

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={theme.colors.textMuted} {...({} as any)} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or reg number..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, !selectedClass && styles.activeFilterChip]}
              onPress={() => setSelectedClass(null)}
            >
              <Text style={[styles.filterText, !selectedClass && styles.activeFilterText]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map((c, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.filterChip, selectedClass === `${c.name}-${c.section}` && styles.activeFilterChip]}
                onPress={() => setSelectedClass(`${c.name}-${c.section}`)}
              >
                <Text style={[styles.filterText, selectedClass === `${c.name}-${c.section}` && styles.activeFilterText]}>
                  {c.name} {c.section}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.studentList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            filteredStudents.map((student) => (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentMain}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.meta}>{student.class_name} {student.section} • #{student.register_number}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleCall(student.phone_number || student.parent_phone)}
                  >
                    <Phone size={18} color={theme.colors.primary} {...({} as any)} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
                    onPress={() => handleWhatsApp(student.phone_number || student.parent_phone)}
                  >
                    <MessageCircle size={18} color="#166534" {...({} as any)} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  searchSection: { marginBottom: 24, gap: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  filterScroll: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  activeFilterChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  activeFilterText: { color: 'white' },
  studentList: { gap: 12 },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9' },
  studentMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  info: { gap: 2 },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
