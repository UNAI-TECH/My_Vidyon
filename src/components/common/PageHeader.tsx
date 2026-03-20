import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Users, GraduationCap, Briefcase, Calculator, Coffee, UserCircle } from 'lucide-react-native';
import { theme } from '../../theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  leftAction?: React.ReactNode;
  institutionName?: string;
  institutionLogo?: string;
  userRole?: string;
  userAvatar?: string;
  userSubtitle?: string;
}

const getRoleIcon = (role?: string) => {
  switch(role) {
    case 'student': return <GraduationCap size={24} color={theme.colors.primary} />;
    case 'faculty': return <Briefcase size={24} color={theme.colors.primary} />;
    case 'parent': return <Users size={24} color={theme.colors.primary} />;
    case 'accountant': return <Calculator size={24} color={theme.colors.primary} />;
    case 'canteen': return <Coffee size={24} color={theme.colors.primary} />;
    default: return <UserCircle size={24} color={theme.colors.primary} />;
  }
};

const getRoleLabel = (role?: string) => {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const PageHeader = ({ title, subtitle, actions, leftAction, institutionName, institutionLogo, userRole, userAvatar, userSubtitle }: PageHeaderProps) => {
  return (
    <View style={styles.outerContainer}>
      {(institutionName || institutionLogo) && (
        <View style={styles.institutionCard}>
          {/* Left side: Institution Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}>
            {institutionLogo ? (
              <Image source={{ uri: institutionLogo }} style={styles.institutionLogoBig} />
            ) : (
              <View style={[styles.institutionLogoBig, { backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontWeight: 'bold', color: theme.colors.primary, fontSize: 20 }}>{institutionName?.substring(0, 1)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.institutionNameBig} numberOfLines={1}>{institutionName || 'Institution'}</Text>
              <Text style={styles.institutionSubtitle}>Powered by My Vidyon</Text>
            </View>
          </View>
          {/* Right side: Role Badge */}
          {userRole && (
            <View style={styles.roleContainer}>
              <View style={styles.roleIconContainer}>
                {userAvatar ? (
                  <Image 
                    source={{ uri: userAvatar }} 
                    style={styles.roleAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  getRoleIcon(userRole)
                )}
              </View>
              <Text style={styles.roleText}>{getRoleLabel(userRole)}</Text>
              {userSubtitle && <Text style={styles.userSubtitle} numberOfLines={1}>{userSubtitle}</Text>}
            </View>
          )}
        </View>
      )}
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
          {leftAction}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 24,
    width: '100%',
  },
  institutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  institutionLogoBig: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  institutionNameBig: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  institutionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  roleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 16,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 100,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
