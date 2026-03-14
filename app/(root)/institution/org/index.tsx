import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Plus, 
  Map, 
  Layers, 
  Users,
  ChevronRight
} from 'lucide-react-native';

export default function InstitutionOrg() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Institution Structure" subtitle="Manage Departments, Classes & Sections" />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Departments</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Plus size={16} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {[ 'Science', 'Commerce', 'Arts', 'Engineering' ].map((dept, i) => (
          <TouchableOpacity key={i} style={styles.itemCard}>
            <View style={styles.itemIcon}>
              <Layers size={18} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>{dept}</Text>
              <Text style={styles.itemMeta}>12 Faculty • 450 Students</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Classes & Sections</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Plus size={16} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.addBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {[ '10-A', '10-B', '11-A', '11-B', '12-A', '12-B' ].map((cls, i) => (
            <TouchableOpacity key={i} style={styles.gridItem}>
              <Text style={styles.gridText}>{cls}</Text>
              <View style={styles.miniBadge}>
                <Users size={8} color="white" {...({} as any)} />
                <Text style={styles.miniBadgeText}>45</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  itemCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  itemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '30%', backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
  gridText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  miniBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  miniBadgeText: { fontSize: 8, color: 'white', fontWeight: 'bold' }
});
