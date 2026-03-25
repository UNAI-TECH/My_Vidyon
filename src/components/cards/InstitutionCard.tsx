import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../theme';
import { MapPin, Users, GraduationCap, Edit2, Trash2, Power, ShieldCheck } from 'lucide-react-native';

interface InstitutionCardProps {
  name: string;
  code: string;
  location: string;
  students: number;
  faculty: number;
  status: 'active' | 'inactive' | 'deleted';
  type: string;
  logoUrl?: string | null;
  onClick?: () => void;
  onEdit?: () => void;
  onSecurity?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
}

export function InstitutionCard({
  name,
  code,
  location,
  students,
  faculty,
  status,
  type,
  logoUrl,
  onClick,
  onEdit,
  onSecurity,
  onToggleStatus,
  onDelete
}: InstitutionCardProps) {
  const statusConfig = {
    active: { bg: '#ECFDF5', color: '#059669', label: 'Active' },
    inactive: { bg: '#FEF3C7', color: '#D97706', label: 'Inactive' },
    deleted: { bg: '#FEE2E2', color: '#DC2626', label: 'Deleted' },
  };

  const s = statusConfig[status] || statusConfig.active;

  return (
    <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.7}>
      {/* Top Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: s.color + '30' }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[styles.logoInitial, { color: theme.colors.primary }]}>{name.charAt(0)}</Text>
            </View>
          )}
        </View>

        <View style={styles.titleInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.code}>{code}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.locationRow}>
          <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.locationText} numberOfLines={1}>{location || 'No location'}</Text>
        </View>
        <View style={styles.typePill}>
          <Text style={styles.typeText}>{type ? type.replace('-', ' ').toUpperCase() : 'SCHOOL'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Users size={16} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.statValue}>{students}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <GraduationCap size={16} color="#8B5CF6" {...({} as any)} />
          <Text style={styles.statValue}>{faculty}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, styles.editBtn]} activeOpacity={0.7}>
          <Edit2 size={14} color={theme.colors.primary} {...({} as any)} />
          <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSecurity} style={[styles.actionBtn, styles.securityBtn]} activeOpacity={0.7}>
          <ShieldCheck size={14} color="#8B5CF6" {...({} as any)} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleStatus} style={[styles.actionBtn, status === 'active' ? styles.deactivateBtn : styles.activateBtn]} activeOpacity={0.7}>
          <Power size={14} color={status === 'active' ? '#EF4444' : '#10B981'} {...({} as any)} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn]} activeOpacity={0.7}>
          <Trash2 size={14} color="#EF4444" {...({} as any)} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  logoInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  code: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  typePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: theme.colors.primary + '10',
    flex: 1,
    justifyContent: 'center',
  },
  securityBtn: {
    backgroundColor: '#8B5CF620',
  },
  deactivateBtn: {
    backgroundColor: '#FEE2E2',
  },
  activateBtn: {
    backgroundColor: '#D1FAE5',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
});
