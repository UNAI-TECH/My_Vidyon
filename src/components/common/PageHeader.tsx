import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, GraduationCap, Briefcase, Calculator, Coffee, UserCircle } from 'lucide-react-native';
import { theme } from '../../theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

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
  switch(role?.toLowerCase()) {
    case 'student': return <GraduationCap size={24} color={theme.colors.primary} />;
    case 'faculty': 
    case 'teacher':
    case 'staff':
      return <Briefcase size={24} color={theme.colors.primary} />;
    case 'parent': return <Users size={24} color={theme.colors.primary} />;
    case 'accountant': return <Calculator size={24} color={theme.colors.primary} />;
    case 'canteen': 
    case 'canteen_manager':
      return <Coffee size={24} color={theme.colors.primary} />;
    default: return <UserCircle size={24} color={theme.colors.primary} />;
  }
};

const getRoleLabel = (role?: string) => {
  if (!role) return 'User';
  // Standardize labels
  if (role.toLowerCase() === 'canteen_manager') return 'Canteen';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const PageHeader = ({ title, subtitle, actions, leftAction, institutionName, institutionLogo, userRole, userAvatar, userSubtitle }: PageHeaderProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role: authRole, fullName: authName, imageUrl: authAvatar, institutionLogo: authInstLogo, institutionName: authInstName } = useAuth();

  const displayRole = (userRole || authRole || '') as string;
  const effectiveInstLogo = institutionLogo || authInstLogo;
  const effectiveInstName = institutionName || authInstName;
  const displayUserName = title || (authName ? `Hello, ${authName}!` : 'Welcome!');
  const displayUserAvatar = (userAvatar?.trim() || authAvatar?.trim()) || undefined;

  const handleProfilePress = () => {
    const activeRole = userRole || authRole;
    if (!activeRole) return;
    
    // Normalize role for routing
    const roleSlug = activeRole.toLowerCase().split('_')[0]; // e.g., canteen_manager -> canteen
    
    router.push(`/(root)/${roleSlug}/settings`);
  };

  const [logoFailed, setLogoFailed] = React.useState(false);

  React.useEffect(() => {
    setLogoFailed(false);
  }, [effectiveInstLogo]);

  const isValidLogo = Boolean(
    effectiveInstLogo &&
    typeof effectiveInstLogo === 'string' &&
    effectiveInstLogo.startsWith('http') &&
    !logoFailed
  );
  const initialLetters = effectiveInstName 
    ? effectiveInstName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() 
    : 'MV';

  const showInstitutionCard = !!userRole || !!effectiveInstName || !!effectiveInstLogo || !!authRole;
  
  return (
    <View style={[styles.outerContainer, { paddingTop: Math.max(insets.top, theme.spacing.s) }]}>
      {showInstitutionCard && (
        <View style={styles.institutionCard}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}
            activeOpacity={0.7}
            onPress={handleProfilePress}
          >
            {isValidLogo ? (
              <Image 
                source={{ uri: effectiveInstLogo! }} 
                style={styles.institutionLogoBig} 
                resizeMode="cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <View style={[styles.institutionLogoBig, { backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontWeight: 'bold', color: theme.colors.primary, fontSize: 18 }}>{initialLetters}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.institutionNameBig} numberOfLines={1}>{effectiveInstName || 'My Vidyon ERP'}</Text>
              <Text style={styles.institutionSubtitle}>{displayRole ? `${getRoleLabel(displayRole)} Portal` : 'Powered by My Vidyon'}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={handleProfilePress}
            style={styles.roleContainer}
          >
            <View style={[styles.roleIconContainer, { borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
              {displayUserAvatar ? (
                <Image 
                  source={{ uri: displayUserAvatar }} 
                  style={styles.roleAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ transform: [{ scale: 0.8 }] }}>
                  {getRoleIcon(displayRole)}
                </View>
              )}
            </View>
            <Text style={styles.roleText}>{getRoleLabel(displayRole)}</Text>
            {userSubtitle && <Text style={styles.userSubtitle} numberOfLines={1}>{userSubtitle}</Text>}
          </TouchableOpacity>
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
    marginBottom: theme.spacing.l,
    width: '100%',
  },
  institutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.l,
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
    opacity: 0.8,
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
