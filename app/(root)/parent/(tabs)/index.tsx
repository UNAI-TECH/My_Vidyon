import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../../../../src/components/common/NotificationBell';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { StatCard } from '../../../../src/components/common/StatCard';
import { EventAdCarousel } from '../../../../src/components/common/EventAdCarousel';
import { useAuth } from '../../../../src/hooks/useAuth';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  ShieldAlert, 
  Phone,
  ArrowRight,
  ChevronRight,
  Megaphone,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react-native';
import { ShortcutGrid } from '../../../../src/components/common/ShortcutGrid';
import { Link, useRouter } from 'expo-router';

import { useParentDashboard } from '../../../../src/hooks/useParentDashboard';

export default function ParentDashboard() {
  const insets = useSafeAreaInsets();
  const { user, role, imageUrl } = useAuth();
  const { width } = useWindowDimensions();
  const isSmall = width < 420;
  const router = useRouter();
  const { 
    children, 
    pendingFees, 
    totalPaid, 
    upcomingFees, 
    nextDueFee, 
    institution, 
    parentProfile, 
    isLoading 
  } = useParentDashboard(user?.id);

  const welcomeName = parentProfile?.full_name || user?.email?.split('@')[0] || 'Parent';

  if (isLoading) return <View style={styles.container}><Text style={{ padding: 20 }}>Loading Children Data...</Text></View>;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.content, 
        { paddingBottom: insets.bottom + theme.spacing.xl }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader 
        title={`Hello, ${welcomeName}!`} 
        subtitle={institution ? `Staying connected with ${institution.name}` : "Staying connected to your child's progress"}
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || 'parent'}
        userAvatar={imageUrl || undefined}
        userSubtitle={children.length > 0 ? `${children.length} Children Enrolled` : undefined}
        actions={<NotificationBell />}
      />

      <EventAdCarousel 
        nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
        adInterval={2}
      />

      {/* Child Services Shortcuts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Child Services</Text>
        <ShortcutGrid items={[
          { label: 'Fee Gateway', icon: CreditCard, href: '/(root)/parent/fee-gateway', color: '#3B82F6' },
          { label: 'Fee Ledger', icon: Receipt, href: '/(root)/parent/fees', color: '#10B981' },
          { label: 'Safety Hub', icon: ShieldAlert, href: '/(root)/parent/safety', color: '#EF4444' },
          { label: 'Leave Apply', icon: Calendar, href: '/(root)/parent/leaves', color: '#F59E0B' },
        ]} />
      </View>

      {/* Fees & Due Payments Hub */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fees & Due Payments</Text>
          <TouchableOpacity onPress={() => router.push('/(root)/parent/fees' as any)}>
            <Text style={styles.viewAllText}>View All Fees ›</Text>
          </TouchableOpacity>
        </View>

        {pendingFees > 0 || nextDueFee ? (
          <View style={styles.feeBannerCard}>
            <View style={styles.feeBannerTop}>
              <View style={[styles.feeIconCircle, { backgroundColor: (nextDueFee?.isOverdue ? '#FEE2E2' : '#FEF3C7') }]}>
                <CreditCard size={22} color={nextDueFee?.isOverdue ? '#EF4444' : '#D97706'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.feeTitleRow}>
                  <Text style={styles.feeBannerStudent} numberOfLines={1}>
                    {nextDueFee?.studentName || 'Student Due'}
                  </Text>
                  <View style={[styles.dueBadge, nextDueFee?.isOverdue ? styles.overdueBadge : styles.pendingBadge]}>
                    <Text style={[styles.dueBadgeText, nextDueFee?.isOverdue ? styles.overdueBadgeText : styles.pendingBadgeText]}>
                      {nextDueFee?.isOverdue ? 'OVERDUE' : 'DUE SOON'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.feeBannerDetails} numberOfLines={1}>
                  {nextDueFee?.termName || 'Academic Term'} • {nextDueFee?.feeName || 'Tuition Fee'}
                </Text>
              </View>
            </View>

            <View style={styles.feeBannerDivider} />

            <View style={styles.feeBannerBottom}>
              <View>
                <Text style={styles.feeAmountLabel}>Outstanding Balance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={styles.feeAmountVal}>
                    ₹{(nextDueFee?.remainingDue ?? pendingFees).toLocaleString('en-IN')}
                  </Text>
                  {Boolean(nextDueFee?.concessionAmount && nextDueFee.concessionAmount > 0) ? (
                    <Text style={styles.feeConcessionTag}>
                      -₹{nextDueFee!.concessionAmount.toLocaleString('en-IN')} waiver
                    </Text>
                  ) : null}
                </View>
                {Boolean(nextDueFee?.dueDate) ? (
                  <Text style={styles.feeDueDateText}>
                    Due Date: {new Date(nextDueFee!.dueDate!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => router.push({
                  pathname: '/(root)/parent/fee-gateway' as any,
                  params: { studentId: nextDueFee?.studentId || '' }
                })}
              >
                <CreditCard size={15} color="white" />
                <Text style={styles.payNowBtnText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.feeClearCard}>
            <View style={styles.feeClearIconBox}>
              <CheckCircle2 size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.feeClearTitle}>All Fees Cleared</Text>
              <Text style={styles.feeClearSub}>No pending dues or upcoming fee schedules for your children.</Text>
            </View>
            <TouchableOpacity 
              style={styles.receiptsBtn}
              onPress={() => router.push('/(root)/parent/fees' as any)}
            >
              <Text style={styles.receiptsBtnText}>Receipts</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Your Children */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Children</Text>
        {children.length > 0 ? (
          children.map((child, index) => (
              <TouchableOpacity
              key={index}
              style={[
                styles.childCard,
                { marginBottom: 12 },
                isSmall && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }
              ]}
              onPress={() => router.push({
                pathname: "/(root)/parent/student/[id]",
                params: { id: child.id, name: child.name }
              })}
            >
              <View style={styles.childInfo}>
                <View style={styles.avatar}>
                  {child.image_url ? (
                    <Image source={{ uri: child.image_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{child.name.substring(0, 2).toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
                  <Text style={styles.childMeta} numberOfLines={1} ellipsizeMode="tail">
                    Class {child.class_name} • Roll #{child.register_number}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.childStats,
                isSmall && { width: '100%', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }
              ]}>
                <View style={[styles.miniStat, isSmall && { alignItems: 'flex-start' }]}>
                  <Text style={styles.miniStatLabel}>ATTENDANCE</Text>
                  <Text style={[styles.miniStatValue, { color: '#10B981' }]}>{child.attendance}</Text>
                </View>
                <View style={[styles.miniStat, isSmall && { alignItems: 'flex-start' }]}>
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
        {/* Ad integration within children section */}
        {children.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <AdBanner type="PARENT" />
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Pending Fees" 
          value={`₹${pendingFees.toLocaleString('en-IN')}`} 
          icon={CreditCard} 
          iconColor="#EF4444"
          change={pendingFees > 0 ? "Pay Now" : "Cleared"}
          changeType={pendingFees > 0 ? "negative" : "positive"}
          onPress={() => router.push('/(root)/parent/fee-gateway')}
        />
        <StatCard 
          title="Paid This Year" 
          value={`₹${totalPaid.toLocaleString('en-IN')}`} 
          icon={Receipt} 
          iconColor="#10B981"
          change="View Receipts"
          onPress={() => router.push('/(root)/parent/fees')}
        />
      </View>

      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <ShieldAlert size={20} color="#F59E0B" {...({} as any)} />
          <Text style={styles.safetyTitle}>Safety & Security</Text>
        </View>
        <View style={styles.contactRow}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => (institution?.office_phone || institution?.phone) && Linking.openURL(`tel:${institution.office_phone || institution.phone}`)}
          >
            <Phone size={16} color="white" {...({} as any)} />
            <Text style={styles.contactText}>School Office</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: '#EF4444' }]}
            onPress={() => (institution?.guard_phone || institution?.phone) && Linking.openURL(`tel:${institution.guard_phone || institution.phone}`)}
          >
            <Phone size={16} color="white" {...({} as any)} />
            <Text style={styles.contactText}>Main Guard</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <AdBanner type="PARENT" />

      <View style={{ alignItems: 'center', marginVertical: 40, opacity: 0.4 }}>
        <Image source={require('../../../../assets/logo.png')} style={{ width: 100, height: 30, resizeMode: 'contain' }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.m },
  section: { marginBottom: theme.spacing.l },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  feeBannerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  feeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeBannerStudent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  feeBannerDetails: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pendingBadgeText: {
    color: '#B45309',
  },
  overdueBadgeText: {
    color: '#B91C1C',
  },
  feeBannerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  feeBannerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  feeAmountLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  feeAmountVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  feeConcessionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feeDueDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAB75A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#FAB75A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  feeClearCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  feeClearIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeClearTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  feeClearSub: {
    fontSize: 11.5,
    color: '#15803D',
    marginTop: 2,
  },
  receiptsBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  receiptsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
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
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontWeight: 'bold', color: theme.colors.primary },
  childName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  childMeta: { fontSize: 12, color: theme.colors.textMuted },
  childStats: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 12,
  },
  miniStat: { alignItems: 'flex-end' },
  miniStatLabel: { fontSize: 8, fontWeight: 'bold', color: theme.colors.textMuted },
  miniStatValue: { fontSize: 14, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  safetyCard: { backgroundColor: '#FFFBEB', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 20 },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  safetyTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400E' },
  contactRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  contactButton: { 
    flex: 1, 
    minWidth: 140,
    backgroundColor: '#F59E0B', 
    borderRadius: 12, 
    paddingVertical: 12, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  contactText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});
