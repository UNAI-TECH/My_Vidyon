import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { theme } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { Lock, Mail, ChevronRight, User as UserIcon, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuickLogin } from '../../src/hooks/useQuickLogin';
import { useAuth } from '../../src/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { savedAccounts, saveAccount, switchToAccount, removeAccount, switchingAccount } = useQuickLogin();
  
  const { session } = useAuth();
  
  // Animation state
  const [animatingAccount, setAnimatingAccount] = useState<any>(null);
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  // Auto-recovery: If we are show-stopped on the animation overlay but the background
  // auth state is now truthy, force a navigation to home.
  React.useEffect(() => {
    if (session && animatingAccount && !switchingAccount) {
      console.log('[Login] Session detected during animation, forcing navigation');
      setAnimatingAccount(null);
      router.replace('/');
    }
  }, [session, switchingAccount]);
  
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

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
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
    setError(null);
    
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
      if (success) {
        // Transition animation out into the app
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 15, // Zoom to fill screen
            duration: 500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 400,
            delay: 100,
            useNativeDriver: true,
          })
        ]).start(() => {
          router.replace('/');
        });
      } else {
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
        ]).start(() => {
          setAnimatingAccount(null);
          setError('Session expired. Please log in with your password.');
          setEmail(account.email);
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

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
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
            transform: [{ scale: scaleValue }]
          }}>
            <View style={[styles.avatarContainer, { width: 120, height: 120, marginBottom: 24 }]}>
              {animatingAccount.image_url ? (
                <Image source={{ uri: animatingAccount.image_url }} style={[styles.avatar, { width: 120, height: 120, borderRadius: 60 }]} />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar, { width: 120, height: 120, borderRadius: 60 }]}>
                  <UserIcon size={50} color={theme.colors.primary} {...({} as any)} />
                </View>
              )}
            </View>
            <Text style={[styles.accountName, { fontSize: 24 }]}>{animatingAccount.full_name}</Text>
            <Text style={[styles.accountRole, { fontSize: 16, marginBottom: 24 }]}>
              {animatingAccount.role.charAt(0).toUpperCase() + animatingAccount.role.slice(1)}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={{ color: theme.colors.textMuted, fontSize: 16, fontWeight: '500' }}>Logging in...</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

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
  forgotBtn: {
    marginTop: 24,
  },
  forgotText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
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
});
