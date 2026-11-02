import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { 
  X, 
  CheckCircle2, 
  UserPlus, 
  Trash2, 
  AlertCircle,
  GraduationCap,
  Briefcase,
  Building,
  Shield,
  Users as UsersIcon,
  CreditCard,
  User as UserIcon,
  Building2,
  Megaphone,
} from 'lucide-react-native';
import { theme } from '../../theme';
import { SavedAccount } from '../../hooks/useQuickLogin';

interface AccountSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string | null;
  savedAccounts: SavedAccount[];
  switchingAccountId: string | null;
  switchError: string | null;
  onSelectAccount: (account: SavedAccount) => Promise<boolean>;
  onRemoveAccount: (id: string) => Promise<void>;
  onAddAccount: () => void;
}

export const getRoleDetails = (role: string) => {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'student':
      return { 
        label: 'Student', 
        bg: '#DCFCE7', 
        text: '#16A34A', 
        border: '#BBF7D0',
        icon: GraduationCap 
      };
    case 'faculty':
    case 'teacher':
    case 'staff':
      return { 
        label: 'Faculty', 
        bg: '#EDE9FE', 
        text: '#7C3AED', 
        border: '#DDD6FE',
        icon: Briefcase 
      };
    case 'parent':
      return { 
        label: 'Parent', 
        bg: '#FEF3C7', 
        text: '#D97706', 
        border: '#FDE68A',
        icon: UsersIcon 
      };
    case 'admin':
    case 'superadmin':
      return { 
        label: 'Super Admin', 
        bg: '#FEE2E2', 
        text: '#DC2626', 
        border: '#FECACA',
        icon: Shield 
      };
    case 'institution':
      return { 
        label: 'Institution', 
        bg: '#E0F2FE', 
        text: '#0284C7', 
        border: '#BAE6FD',
        icon: Building 
      };
    case 'accountant':
    case 'finance':
    case 'finance_manager':
      return { 
        label: 'Finance', 
        bg: '#D1FAE5', 
        text: '#059669', 
        border: '#A7F3D0',
        icon: CreditCard 
      };
    case 'ad_manager':
    case 'ads':
      return { 
        label: 'Ad Manager', 
        bg: '#FFEDD5', 
        text: '#EA580C', 
        border: '#FED7AA',
        icon: Megaphone 
      };
    case 'institution_stakeholder':
      return { 
        label: 'Stakeholder', 
        bg: '#F3E8FF', 
        text: '#9333EA', 
        border: '#E9D5FF',
        icon: Building2 
      };
    default:
      return { 
        label: role ? role.replace(/_/g, ' ') : 'User', 
        bg: '#F1F5F9', 
        text: '#475569', 
        border: '#E2E8F0',
        icon: UserIcon 
      };
  }
};

const AccountAvatar: React.FC<{
  imageUrl?: string | null;
  initials: string;
  roleBg: string;
  roleText: string;
}> = ({ imageUrl, initials, roleBg, roleText }) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const isValid = Boolean(
    imageUrl &&
    !imageError &&
    typeof imageUrl === 'string' &&
    (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:'))
  );

  if (isValid) {
    return (
      <Image
        source={{ uri: imageUrl! }}
        style={styles.avatarImage}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View style={[styles.avatarFallback, { backgroundColor: roleBg }]}>
      <Text style={[styles.avatarInitial, { color: roleText }]}>
        {initials}
      </Text>
    </View>
  );
};

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  visible,
  onClose,
  currentUserId,
  savedAccounts,
  switchingAccountId,
  switchError,
  onSelectAccount,
  onRemoveAccount,
  onAddAccount,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheetContainer}>
              {/* Instagram-style Drag Handle */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Switch Accounts</Text>
                  <Text style={styles.subtitle}>
                    Hold icon to switch anytime without logging out
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={18} color="#64748B" {...({} as any)} />
                </TouchableOpacity>
              </View>

              {/* Error banner if session expired or failed */}
              {switchError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} {...({} as any)} />
                  <Text style={styles.errorText}>{switchError}</Text>
                </View>
              )}

              {/* Account List */}
              <ScrollView 
                style={styles.accountsList} 
                contentContainerStyle={styles.accountsListContent}
                showsVerticalScrollIndicator={false}
              >
                {savedAccounts.map((account) => {
                  const isActive = currentUserId === account.id;
                  const isSwitchingThis = switchingAccountId === account.id;
                  const roleInfo = getRoleDetails(account.role);
                  const RoleIcon = roleInfo.icon;

                  const initials = (account.full_name || account.email || 'U')
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.accountCard,
                        isActive && styles.accountCardActive,
                        isSwitchingThis && styles.accountCardSwitching,
                      ]}
                      onPress={() => onSelectAccount(account)}
                      disabled={isSwitchingThis}
                      activeOpacity={0.75}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrap}>
                        <AccountAvatar
                          imageUrl={account.image_url}
                          initials={initials}
                          roleBg={roleInfo.bg}
                          roleText={roleInfo.text}
                        />
                      </View>

                      {/* User Info */}
                      <View style={styles.accountInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.accountName, isActive && styles.accountNameActive]} numberOfLines={1}>
                            {account.full_name || account.email.split('@')[0]}
                          </Text>
                        </View>

                        <View style={styles.roleEmailRow}>
                          <View style={[styles.rolePill, { backgroundColor: roleInfo.bg, borderColor: roleInfo.border }]}>
                            <Text style={[styles.rolePillText, { color: roleInfo.text }]}>
                              {roleInfo.label}
                            </Text>
                          </View>
                          <Text style={styles.accountEmail} numberOfLines={1}>
                            {account.email}
                          </Text>
                        </View>
                      </View>

                      {/* Right Status Indicator */}
                      <View style={styles.statusCol}>
                        {isSwitchingThis ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : isActive ? (
                          <View style={styles.activeCheckWrap}>
                            <CheckCircle2 size={22} color={theme.colors.primary} {...({} as any)} />
                            <Text style={styles.activeLabel}>Active</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              onRemoveAccount(account.id);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={15} color="#94A3B8" {...({} as any)} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {savedAccounts.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No additional accounts saved yet.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Actions Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.addAccountBtn}
                  onPress={onAddAccount}
                  activeOpacity={0.8}
                >
                  <UserPlus size={18} color={theme.colors.primary} style={{ marginRight: 10 }} {...({} as any)} />
                  <Text style={styles.addAccountBtnText}>Add Another Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTabletOrDesktop = Platform.OS === 'web' && SCREEN_WIDTH > 640;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: isTabletOrDesktop ? 'center' : 'flex-end',
    alignItems: isTabletOrDesktop ? 'center' : 'stretch',
    padding: isTabletOrDesktop ? 20 : 0,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: isTabletOrDesktop ? 28 : 0,
    borderBottomRightRadius: isTabletOrDesktop ? 28 : 0,
    maxHeight: '85%',
    width: isTabletOrDesktop ? 440 : '100%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12.5,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },
  accountsList: {
    maxHeight: 360,
  },
  accountsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  accountCardActive: {
    backgroundColor: '#FAB75A0E',
    borderColor: theme.colors.primary,
  },
  accountCardSwitching: {
    opacity: 0.7,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniRoleBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  accountNameActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  roleEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  accountEmail: {
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
  },
  statusCol: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addAccountBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
