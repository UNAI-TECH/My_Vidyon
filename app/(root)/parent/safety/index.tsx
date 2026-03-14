import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Bell,
  Navigation
} from 'lucide-react-native';

export default function ParentSafety() {
  const contacts = [
    { role: 'School Office', number: '+91 98765 43210', icon: Phone },
    { role: 'Main Guard Deck', number: '+91 98765 00001', icon: ShieldAlert },
    { role: 'Transport Dept', number: '+91 98765 11112', icon: Navigation },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Safety & Security" subtitle="Instant access to emergency school contacts" />

      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <Bell size={20} color="#EF4444" {...({} as any)} />
          <Text style={styles.alertTitle}>Real-time Safety Status</Text>
        </View>
        <Text style={styles.alertText}>Your child (Rahul N.) is currently on campus. Last seen at Main Building (10:30 AM).</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        {contacts.map((contact, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.contactCard}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
          >
            <View style={styles.iconBox}>
              <contact.icon size={20} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.info}>
              <Text style={styles.role}>{contact.role}</Text>
              <Text style={styles.number}>{contact.number}</Text>
            </View>
            <View style={styles.callBtn}>
              <Phone size={16} color="white" {...({} as any)} />
              <Text style={styles.callText}>CALL</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <MapPin size={20} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.locationTitle}>School Location</Text>
        </View>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Interactive Map Component Pending</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  alertCard: { backgroundColor: '#FEF2F2', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#FEE2E2' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#991B1B' },
  alertText: { fontSize: 13, color: '#991B1B', lineHeight: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  contactCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  info: { flex: 1 },
  role: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  number: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  callBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  callText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  locationCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  locationTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  mapPlaceholder: { height: 180, backgroundColor: '#F8FAFC', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
  mapText: { color: theme.colors.textMuted, fontSize: 13 }
});
