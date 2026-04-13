import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { theme } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { Lock, Mail, ChevronRight, User as UserIcon, X, Phone, ShieldAlert } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuickLogin } from '../../src/hooks/useQuickLogin';
import { useAuth } from '../../src/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Linking } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedContact, setBlockedContact] = useState<{name: string, phone: string} | null>(null);
  const { savedAccounts, saveAccount, switchToAccount, removeAccount, switchingAccount } = useQuickLogin();
  
  const { session, role, loading: authLoading } = useAuth();
  const [instLogoUrl, setInstLogoUrl] = useState<string | null>(null);
  
  // Animation state
  const [animatingAccount, setAnimatingAccount] = useState<any>(null);
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  // Auto-recovery: If we are show-stopped on the animation overlay but the background
  // auth state is now truthy, force a navigation to home.
  // Final redirection handler: Wait for role to be ready before removing overlay and navigating
  React.useEffect(() => {
    if (session && role && !authLoading && animatingAccount && !switchingAccount) {
      console.log('[Login] Session and Role ready, final transition...');
      
      // Stop the 'Logging in...' spinner from showing above the zoom-out if we're done
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 20, // Zoom to fill screen
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        })
      ]).start(() => {
        setAnimatingAccount(null);
        router.replace('/');
      });
    }
  }, [session, role, authLoading, animatingAccount, switchingAccount]);
  
  // Sync missing images for saved accounts
  React.useEffect(() => {
    const syncImages = async () => {
      const accountsToUpdate = savedAccounts.filter(a => !a.image_url);
      if (accountsToUpdate.length === 0) return;

      for (const account of accountsToUpdate) {
        try {
          let foundImg = null;
          // 1. Try profiles table
          const { data: profile } = await supabase.from('profiles').select('image_url, profile_image_url, avatar_url, role, institution_id').eq('id', account.id).maybeSingle() as any;
          if (profile) foundImg = profile.image_url || profile.profile_image_url || profile.avatar_url;
          
          // 2. Try students table specifically for students
          if (account.role === 'student' || (profile && profile.role === 'student')) {
            const { data: student } = await supabase.from('students').select('image_url').or(`user_id.eq.${account.id},profile_id.eq.${account.id}`).maybeSingle() as any;
            if (student?.image_url) foundImg = student.image_url;
          }

          // 3. Try institutions table for admin/institution profiles
          if ((account.role === 'admin' || account.role === 'staff' || (profile && profile.role === 'admin')) && (account.institution_id || profile?.institution_id)) {
            const instId = account.institution_id || profile?.institution_id;
            const { data: inst } = await supabase.from('institutions').select('logo_url').eq('institution_id', instId).maybeSingle() as any;
            if (inst?.logo_url) foundImg = inst.logo_url;
          }

          if (foundImg) {
            await saveAccount({ ...account, image_url: foundImg });
          }
        } catch (e) {
          console.error('[Sync] Failed for', account.id, e);
        }
      }
    };
    syncImages();
  }, [savedAccounts.length]);
  
  const checkBlockedStatus = async (identifier: string) => {
    try {
      // @ts-ignore - Direct RPC call might not be in types yet
      const { data, error: rpcError } = await (supabase as any).rpc('get_blocked_user_contact', { 
        identifier 
      });
      
      if (data && !rpcError) {
        setBlockedContact({
          name: (data as any).institution_name,
          phone: (data as any).phone
        });
        setShowBlockedModal(true);
        return true;
      }
    } catch (e) {
      console.warn('[Login] Blocked check failed:', e);
    }
    return false;
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Specifically check if the user is actually blocked/disabled in our DB
        const isBlocked = await checkBlockedStatus(email);
        if (!isBlocked) {
          setError(error.message);
        }
      } else if (data.user) {
        // Fetch profile to save locally
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role, institution_id, image_url')
          .eq('id', data.user.id)
          .maybeSingle() as any;

        if (profile && data.session) {
          let imageUrl = profile.image_url || profile.profile_image_url || profile.avatar_url;
          let fullName = profile.full_name;

          // If student, attempt to get image from students table
          if (profile.role === 'student') {
            const { data: student } = await supabase
              .from('students')
              .select('name, image_url')
              .or(`user_id.eq.${data.user.id},profile_id.eq.${data.user.id}`)
              .maybeSingle() as any;
            
            if (student) {
              imageUrl = student.image_url || imageUrl;
              fullName = student.name || fullName;
            }
          }

          // If institution/admin, get logo from institutions table
          if ((profile.role === 'admin' || profile.role === 'staff') && profile.institution_id) {
            const { data: inst } = await supabase
              .from('institutions')
              .select('logo_url')
              .eq('institution_id', profile.institution_id)
              .maybeSingle() as any;
            if (inst?.logo_url) imageUrl = inst.logo_url;
          }

          await saveAccount({
            id: profile.id,
            email: data.user.email!,
            full_name: fullName || data.user.email!.split('@')[0],
            role: profile.role,
            institution_id: profile.institution_id,
            image_url: imageUrl,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
        router.replace('/');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountPress = (account: any) => {
    setAnimatingAccount(account);
    setInstLogoUrl(null); // Reset
    setError(null);

    // Fetch the institution logo specifically for this account's institution
    if (account.institution_id) {
       supabase.from('institutions').select('logo_url').eq('institution_id', account.institution_id).maybeSingle()
         .then(({data}) => {
            if ((data as any)?.logo_url) setInstLogoUrl((data as any).logo_url);
         }).catch(console.warn);
    }

    
    // Reset values just in case
    scaleValue.setValue(0.5);
    opacityValue.setValue(0);

    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        mass: 1,
        stiffness: 120,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start(async () => {
      const success = await switchToAccount(account);
      if (!success) {
        // Fail - zoom back down
        Animated.parallel([
          Animated.spring(scaleValue, {
            toValue: 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(async () => {
          setAnimatingAccount(null);
          
          // Check if this saved account was recently blocked
          const isBlocked = await checkBlockedStatus(account.id);
          if (!isBlocked) {
            setError('Authentication failed. Tap again to retry or use your password.');
            setEmail(account.email);
          }
        });
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

          {savedAccounts.length > 0 && (
            <View style={styles.savedAccountsContainer}>
              <Text style={styles.sectionTitle}>Continue as...</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.savedAccountsList}
              >
                {savedAccounts.map((account) => (
                  <TouchableOpacity 
                    key={account.id} 
                    style={styles.accountCard}
                    onPress={() => handleAccountPress(account)}
                  >
                    <View style={styles.avatarContainer}>
                      {account.image_url ? (
                        <Image source={{ uri: account.image_url }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                          <UserIcon size={24} color={theme.colors.primary} {...({} as any)} />
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.removeAccountBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          removeAccount(account.id);
                        }}
                      >
                        <X size={12} color="white" {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.accountName} numberOfLines={1}>{account.full_name}</Text>
                    <Text style={styles.accountRole}>{account.role.charAt(0).toUpperCase() + account.role.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.inputWrapper}>
            <Mail size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.loginBtn} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="black" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Login</Text>
                <ChevronRight size={20} color="black" {...({} as any)} />
              </>
            )}
          </TouchableOpacity>


        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Animation Overlay */}
      {animatingAccount && (
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(255,255,255,0.95)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            opacity: opacityValue,
          }
        ]} pointerEvents="auto">
          <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: scaleValue }],
            width: '100%',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 60, gap: 20 }}>
                <Image 
                    source={require('../../assets/logo.png')} 
                    style={{ width: 120, height: 60, resizeMode: 'contain' }} 
                />
                {instLogoUrl && (
                    <>
                        <View style={{ width: 1, height: 30, backgroundColor: '#E2E8F0' }} />
                        <Image 
                            source={{ uri: instLogoUrl }} 
                            style={{ width: 60, height: 60, resizeMode: 'contain', borderRadius: 12 }} 
                        />
                    </>
                )}
            </View>
            
            <View style={[styles.avatarContainer, { width: 120, height: 120, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }]}>
              {animatingAccount.image_url ? (
                <Image source={{ uri: animatingAccount.image_url }} style={[styles.avatar, { width: 120, height: 120, borderRadius: 60 }]} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar, { width: 120, height: 120, borderRadius: 60 }]}>
                  <UserIcon size={50} color={theme.colors.primary} {...({} as any)} />
                </View>
              )}
            </View>
            <Text style={[styles.accountName, { fontSize: 24 }]}>{animatingAccount.full_name}</Text>
            <Text style={[styles.accountRole, { fontSize: 16, marginBottom: 32 }]}>
              {animatingAccount.role.charAt(0).toUpperCase() + animatingAccount.role.slice(1)}
            </Text>
            
            <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }}>Logging in...</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Blocked User Modal */}
      <Modal
        visible={showBlockedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertIconContainer}>
                <ShieldAlert size={32} color="#EF4444" {...({} as any)} />
              </View>
              <Text style={styles.modalTitle}>Account Blocked</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Your account has been disabled by <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{blockedContact?.name || 'the institution'}</Text>.
              </Text>
              <Text style={styles.modalSubMessage}>
                Please contact the institution administration to resolve this.
              </Text>
              
              <View style={styles.contactInfoBox}>
                <Text style={styles.contactLabel}>Institution Contact:</Text>
                <Text style={styles.contactPhone}>{blockedContact?.phone || 'N/A'}</Text>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowBlockedModal(false)}
              >
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.callBtn}
                onPress={() => {
                  if (blockedContact?.phone) {
                    Linking.openURL(`tel:${blockedContact.phone}`);
                  }
                }}
              >
                <Phone size={18} color="white" style={{ marginRight: 8 }} {...({} as any)} />
                <Text style={styles.callBtnText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: 24 
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: { 
    width: 250, 
    height: 80, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 40,
    marginBottom: 60,
    backgroundColor: 'transparent'
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    marginBottom: 4 
  },
  subtitle: { 
    fontSize: 16, 
    color: theme.colors.textMuted, 
    marginBottom: 40 
  },
  inputWrapper: { 
    width: '100%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    marginBottom: 16, 
    paddingHorizontal: 16, 
    height: 56,
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    height: '100%',
    color: theme.colors.text, 
    fontSize: 16 
  },
  loginBtn: { 
    width: '100%', 
    height: 56, 
    backgroundColor: theme.colors.primary, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 16, 
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  loginBtnText: { 
    color: 'black', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  errorText: { 
    color: '#ef4444', 
    marginBottom: 20, 
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  savedAccountsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  savedAccountsList: {
    paddingRight: 24,
  },
  accountCard: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  placeholderAvatar: {
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAccountBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  accountName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  accountRole: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalBody: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  modalSubMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  contactInfoBox: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  closeBtn: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  callBtn: {
    flex: 1.5,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.text,
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
