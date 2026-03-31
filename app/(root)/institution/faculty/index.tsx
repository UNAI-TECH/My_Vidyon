import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  UserPlus, 
  MoreVertical, 
  BookOpen, 
  MapPin,
  Mail
} from 'lucide-react-native';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';

export default function InstitutionFaculty() {
  const faculty = [
    { id: '1', name: 'Dr. Sarah Smith', dept: 'Science', subjects: ['Physics', 'Maths'], status: 'active' },
    { id: '2', name: 'Prof. John Doe', dept: 'Commerce', subjects: ['Accounts', 'Eco'], status: 'on_leave' },
    { id: '3', name: 'Dr. Anita Roy', dept: 'Arts', subjects: ['History'], status: 'active' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Staff Management" subtitle="Faculty assignment & performance tracking" />
      
      <TouchableOpacity style={styles.addBtn}>
        <UserPlus size={20} color="white" {...({} as any)} />
        <Text style={styles.addBtnText}>Onboard New Faculty</Text>
      </TouchableOpacity>

      <FlatList
        data={faculty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.dept}>{item.dept} Department</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#10B981' : '#F59E0B' }]} />
            </View>

            <View style={styles.subjectRow}>
              {item.subjects.map((sub, i) => (
                <View key={i} style={styles.subjectBadge}>
                  <Text style={styles.subjectText}>{sub}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerAction}>
                <Mail size={14} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.footerText}>Contact</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.footerAction}>
                <BookOpen size={14} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.footerText}>Assign Subjects</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.footerAction}>
                <MoreVertical size={14} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={<AdBanner type="INSTITUTION" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: 'bold', color: theme.colors.primary, fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  dept: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  subjectBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  subjectText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 16 },
  footerAction: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted },
  divider: { width: 1, height: 16, backgroundColor: '#F1F5F9' }
});
