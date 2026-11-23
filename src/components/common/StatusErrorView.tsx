// ============================================================
// File: src/components/common/StatusErrorView.tsx
// Purpose: User-friendly ERP status, 404, offline, and error screen
// matching the exact Vidyon campus 3D design system.
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  ArrowLeft,
  HelpCircle,
  RefreshCw,
  LucideIcon,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardRouteForRole } from '../../utils/navigationHelper';

export type StatusErrorType = 'not-found' | 'offline' | 'error' | 'forbidden' | 'generic';

export interface StatusErrorViewProps {
  type?: StatusErrorType;
  code?: string | number; // e.g. 404, 500, 'ERR_OFFLINE', 403
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showHelpNotice?: boolean;
  referenceCode?: string;
}

interface ResolvedConfig {
  badgeLabel: string;
  badgeDotColor: string;
  badgeTextColor: string;
  badgeBg: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryIcon: LucideIcon;
  illustration: any;
}

export const StatusErrorView: React.FC<StatusErrorViewProps> = ({
  type,
  code,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  showHomeButton = true,
  showBackButton = true,
  showHelpNotice = true,
  referenceCode,
}) => {
  const { role } = useAuth();
  const dashboardRoute = getDashboardRouteForRole(role);

  // Infer status type from code if not explicitly given
  const resolvedType: StatusErrorType = React.useMemo(() => {
    if (type) return type;
    const strCode = String(code || '').toLowerCase();
    if (strCode === '404' || strCode.includes('not-found') || strCode.includes('notfound')) {
      return 'not-found';
    }
    if (strCode === 'offline' || strCode.includes('network') || strCode.includes('internet') || strCode === 'err_offline') {
      return 'offline';
    }
    if (strCode === '403' || strCode.includes('forbidden') || strCode.includes('unauthorized')) {
      return 'forbidden';
    }
    if (strCode === '500' || strCode.includes('server') || strCode.includes('error')) {
      return 'error';
    }
    return 'not-found';
  }, [type, code]);

  // Configurations based on resolved type
  const config: ResolvedConfig = React.useMemo(() => {
    switch (resolvedType) {
      case 'offline':
        return {
          badgeLabel: 'OFFLINE',
          badgeDotColor: '#EA580C',
          badgeTextColor: '#C2410C',
          badgeBg: '#FEF3C7',
          title: title || "You're Offline",
          description:
            description ||
            "Unable to reach the campus server right now. Please check your Wi-Fi or mobile data connection and try again.",
          primaryLabel: primaryActionLabel || 'Try Reconnecting',
          primaryIcon: RefreshCw,
          illustration: require('../../../assets/images/error_offline_illustration.png'),
        };

      case 'error':
        return {
          badgeLabel: 'ERROR 500',
          badgeDotColor: '#DC2626',
          badgeTextColor: '#B91C1C',
          badgeBg: '#FEE2E2',
          title: title || 'Something Went Wrong',
          description:
            description ||
            'Our campus servers encountered an unexpected hiccup. Please try again or head back to your dashboard.',
          primaryLabel: primaryActionLabel || 'Return to Dashboard',
          primaryIcon: Home,
          illustration: require('../../../assets/images/error_500_illustration.png'),
        };

      case 'forbidden':
        return {
          badgeLabel: 'ERROR 403',
          badgeDotColor: '#B45309',
          badgeTextColor: '#92400E',
          badgeBg: '#FEF3C7',
          title: title || 'Access Restricted',
          description:
            description ||
            "You don't have the institutional credentials required to access this department or confidential campus record.",
          primaryLabel: primaryActionLabel || 'Return to Dashboard',
          primaryIcon: Home,
          illustration: require('../../../assets/images/error_403_illustration.png'),
        };

      case 'not-found':
      case 'generic':
      default:
        return {
          badgeLabel: 'ERROR 404',
          badgeDotColor: '#D97706',
          badgeTextColor: '#B45309',
          badgeBg: '#FEF3C7',
          title: title || 'Page Not Found',
          description:
            description ||
            "Looks like you took a detour into uncharted campus territory. The classroom or record you're looking for doesn't exist or has moved.",
          primaryLabel: primaryActionLabel || 'Return to Dashboard',
          primaryIcon: Home,
          illustration: require('../../../assets/images/error_404_illustration.png'),
        };
    }
  }, [resolvedType, title, description, primaryActionLabel]);

  const handlePrimaryPress = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      router.replace(dashboardRoute as any);
    }
  };

  const handleBackPress = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(dashboardRoute as any);
    }
  };

  const PrimaryIcon = config.primaryIcon;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF9F4" />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
            <View style={[styles.badgeDot, { backgroundColor: config.badgeDotColor }]} />
            <Text style={[styles.badgeText, { color: config.badgeTextColor }]}>
              {config.badgeLabel}
            </Text>
          </View>
        </View>

        {/* Center Campus Illustration */}
        <View style={styles.illustrationWrapper}>
          <Image
            source={config.illustration}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Text Content */}
        <Text style={styles.titleText}>{config.title}</Text>
        <Text style={styles.descriptionText}>{config.description}</Text>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {showHomeButton && (
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={handlePrimaryPress}
            >
              <LinearGradient
                colors={['#FAB75A', '#F59E0B']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <PrimaryIcon size={17} color="#1E293B" style={{ marginRight: 8 }} {...({} as any)} />
                <Text style={styles.primaryButtonText}>{config.primaryLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {showBackButton && (
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={handleBackPress}
            >
              <ArrowLeft size={16} color="#1E293B" style={{ marginRight: 8 }} {...({} as any)} />
              <Text style={styles.secondaryButtonText}>
                {secondaryActionLabel || 'Go Back'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Help Notice */}
        {showHelpNotice && (
          <View style={styles.helpBox}>
            <HelpCircle size={14} color="#94A3B8" style={{ marginRight: 6 }} {...({} as any)} />
            <Text style={styles.helpText}>
              Need assistance? Contact your institution administrator.
            </Text>
          </View>
        )}

        {referenceCode && (
          <Text style={styles.refCodeText}>Ref: {referenceCode}</Text>
        )}
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const illustrationWidth = Math.min(width * 0.85, 360);
const illustrationHeight = Math.min(illustrationWidth * 0.9, 320);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F4', // Exact matching warm light cream background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  topBar: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  logo: {
    width: 105,
    height: 34,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  illustrationWrapper: {
    width: illustrationWidth,
    height: illustrationHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  titleText: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
    marginBottom: 28,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  refCodeText: {
    marginTop: 8,
    fontSize: 11,
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
});
