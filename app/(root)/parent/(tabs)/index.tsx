import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { NotificationBell } from '../../../../src/components/common/NotificationBell';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  ShieldAlert, 
  Phone,
  ArrowRight,
  ChevronRight
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../../src/components/common/ShortcutGrid';
import { Link, useRouter } from 'expo-router';

import { useParentDashboard } from '../../../../src/hooks/useParentDashboard';

export default function ParentDashboard() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { children, pendingFees, institution, parentProfile, isLoading } = useParentDashboard(user?.id);

  const welcomeName = parentProfile?.full_name || user?.email?.split('@')[0] || 'Parent';

  if (isLoading) return <View style={styles.container}><Text>Loading Children Data...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={`Hello, ${welcomeName}!`} 
        subtitle={institution ? `Staying connected with ${institution.name}` : "Staying connected to your child's progress"}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || undefined}
        userAvatar={parentProfile?.image_url || undefined}
        userSubtitle={`${children.length} Children Enrolled`}
        actions={<NotificationBell />}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Child Services</Text>
        <ShortcutGrid items={[
          { label: 'Fee Gateway', icon: CreditCard, href: '/(root)/parent/fee-gateway', color: '#3B82F6' },
          { label: 'Safety Hub', icon: ShieldAlert, href: '/(root)/parent/safety', color: '#EF4444' },
          { label: 'Leave Apply', icon: Calendar, href: '/(root)/parent/leaves', color: '#A855F7' },
          { label: 'Child Stats', icon: Users, href: '/(root)/parent/stats', color: '#10B981' },
        ]} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Children</Text>
        {children.length > 0 ? (
          children.map((child, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.childCard, { marginBottom: 12 }]}
              onPress={() => router.push({
                pathname: "/(root)/parent/student/[id]",
                params: { id: child.id, name: child.name }
              })}
            >
              <View style={styles.childInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{child.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
                  <Text style={styles.childMeta} numberOfLines={1} ellipsizeMode="tail">
                    Class {child.class_name} • Roll #{child.register_number}
                  </Text>
                </View>
              </View>
              <View style={styles.childStats}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>ATTENDANCE</Text>
                  <Text style={[styles.miniStatValue, { color: '#10B981' }]}>{child.attendance}</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>GRADES</Text>
                  <Text style={[styles.miniStatValue, { color: '#FAB75A' }]}>{child.grade || 'N/A'}</Text>
                </View>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.childCard}>
            <Text style={styles.childMeta}>No linked children found.</Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Pending Fees" 
          value={`₹${pendingFees.toLocaleString()}`} 
          icon={CreditCard} 
          iconColor="#EF4444"
          change="Pay Now"
          changeType="negative"
        />
        <StatCard 
          title="Overview" 
          value={`${children.length} Enrolled`} 
          icon={Calendar} 
          iconColor="#10B981"
          change="Real-time Sync"
        />
      </View>

      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <ShieldAlert size={20} color="#F59E0B" {...({} as any)} />
          <Text style={styles.safetyTitle}>Safety & Security</Text>
        </View>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactButton}>
            <Phone size={16} color="white" {...({} as any)} />
            <Text style={styles.contactText}>School Office</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: '#EF4444' }]}>
            <Phone size={16} color="white" {...({} as any)} />
            <Text style={styles.contactText}>Main Guard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  childCard: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  childInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontWeight: 'bold', color: theme.colors.primary },
  childName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  childMeta: { fontSize: 12, color: theme.colors.textMuted },
  childStats: { flexDirection: 'row', gap: 16, marginRight: 12 },
  miniStat: { alignItems: 'flex-end' },
  miniStatLabel: { fontSize: 8, fontWeight: 'bold', color: theme.colors.textMuted },
  miniStatValue: { fontSize: 14, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  safetyCard: { backgroundColor: '#FFFBEB', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#FEF3C7' },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  safetyTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400E' },
  contactRow: { flexDirection: 'row', gap: 12 },
  contactButton: { flex: 1, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  contactText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});
