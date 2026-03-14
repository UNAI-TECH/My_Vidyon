import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../theme';
import { MapPin, Users, GraduationCap, MoreVertical, Edit2, Trash2, Power } from 'lucide-react-native';
import { Badge } from '../common/Badge';

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
  onToggleStatus,
  onDelete
}: InstitutionCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary + '10' }]}>
              <Text style={[styles.logoInitial, { color: theme.colors.primary }]}>{name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.titleInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.code}>{code}</Text>
        </View>
        <Badge 
          variant={status === 'active' ? 'success' : status === 'inactive' ? 'warning' : 'destructive'}
        >
          {status.toUpperCase()}
        </Badge>
      </View>

      <View style={styles.body}>
        <View style={styles.infoRow}>
          <MapPin size={14} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.infoText} numberOfLines={1}>{location}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{type ? type.replace('-', ' ').toUpperCase() : 'UNKNOWN'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Users size={14} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.statValue}>{students}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <GraduationCap size={14} color={theme.colors.secondary} {...({} as any)} />
          <Text style={styles.statValue}>{faculty}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <Edit2 size={16} color={theme.colors.text} {...({} as any)} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleStatus} style={styles.actionBtn}>
          <Power size={16} color={status === 'active' ? '#EF4444' : '#10B981'} {...({} as any)} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <Trash2 size={16} color="#EF4444" {...({} as any)} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
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
  },
  logoInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  code: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  body: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  }
});
