import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { theme } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { Lock, Mail, ChevronRight, User as UserIcon, X, Phone, ShieldAlert, ArrowLeft, Eye, EyeOff, GraduationCap, Briefcase, Users as UsersIcon, Building, Megaphone, CreditCard, Building2, Shield, KeyRound, HelpCircle, CheckCircle2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuickLogin } from '../../src/hooks/useQuickLogin';
import { useAuth } from '../../src/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Linking } from 'react-native';
import { submitPasswordResetRequest } from '../../src/services/passwordResetService';
import { LargeSecureStore } from '../../src/lib/storage';

type LoginStep = 'email' | 'password' | 'setup_password';

interface LookedUpUser {
  id: string;
  full_name: string;
  role: string;
  institution_id: string;
  image_url?: string;
  class_name?: string;
  section?: string;
  institution_name?: string;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ blocked?: string; email?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedContact, setBlockedContact] = useState<{name: string, phone: string} | null>(null);
  const [showInstitutionDisabledModal, setShowInstitutionDisabledModal] = useState(false);
  const [disabledInstitutionInfo, setDisabledInstitutionInfo] = useState<{name: string, phone: string} | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { savedAccounts, saveAccount, switchToAccount, removeAccount, switchingAccount } = useQuickLogin();
  
  const { session } = useAuth();
  
  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotReason, setForgotReason] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);

  // Multi-step login state
  const [loginStep, setLoginStep] = useState<LoginStep>('email');
  const [lookedUpUser, setLookedUpUser] = useState<LookedUpUser | null>(null);
  
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
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('logo_url');
            if (isUUID(instId)) {
              query = query.eq('id', instId);
            } else {
              query = query.ilike('institution_id', instId);
            }
            const { data: inst } = await (query as any).maybeSingle();
            if (inst?.logo_url && typeof inst.logo_url === 'string' && inst.logo_url.startsWith('http')) {
              foundImg = inst.logo_url;
            }
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

  // Automatically show blocked modal if booted or redirected with blocked status
  React.useEffect(() => {
    const checkInitialBlocked = async () => {
      if (params?.blocked === 'true' && params?.email) {
        await checkBlockedStatus(params.email);
        return;
      }
      try {
        const storedBlocked = await LargeSecureStore.getItem('vidyon_last_blocked_account');
        if (storedBlocked) {
          const parsed = JSON.parse(storedBlocked);
          await LargeSecureStore.removeItem('vidyon_last_blocked_account');
          if (parsed?.email) {
            await checkBlockedStatus(parsed.email);
          }
        }
      } catch (e) {}
    };
    checkInitialBlocked();
  }, [params?.blocked, params?.email]);
  
  const checkBlockedStatus = async (identifier: string) => {
    try {
      // 1. Try RPC call
      const { data, error: rpcError } = await (supabase as any).rpc('get_blocked_user_contact', { 
        identifier 
      });
      
      if (data && !rpcError) {
        setBlockedContact({
          name: (data as any).institution_name || 'the administrator',
          phone: (data as any).phone || 'N/A'
        });
        setShowBlockedModal(true);
        return true;
      }
    } catch (e) {
      console.warn('[Login] Blocked check RPC failed:', e);
    }

    // 2. Direct database fallback (query profiles & institutions)
    try {
      const { data: prof } = await (supabase.from('profiles') as any)
        .select('institution_id, full_name, is_active')
        .or(`email.eq.${identifier},id.eq.${identifier}`)
        .maybeSingle();

      if (prof && prof.is_active === false) {
        let instName = 'the administrator';
        let instPhone = 'N/A';
        if (prof.institution_id && prof.institution_id !== 'global') {
          const { data: inst } = await (supabase.from('institutions') as any)
            .select('name, phone, office_phone')
            .or(`id.eq.${prof.institution_id},institution_id.eq.${prof.institution_id}`)
            .maybeSingle();
          if (inst) {
            instName = inst.name || instName;
            instPhone = inst.office_phone || inst.phone || instPhone;
          }
        }
        setBlockedContact({
          name: instName,
          phone: instPhone,
        });
        setShowBlockedModal(true);
        return true;
      }
    } catch (fallbackErr) {
      console.warn('[Login] Fallback blocked lookup error:', fallbackErr);
    }

    return false;
  };

  const checkInstitutionDisabled = async (institutionId: string, role?: string): Promise<boolean> => {
    // Super admins are never blocked by institution status
    if (role === 'admin' || role === 'superadmin' || !institutionId) {
      return false;
    }

    try {
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      let query = supabase
        .from('institutions')
        .select('name, status, phone, office_phone');
      
      if (isUUID(institutionId)) {
        query = query.eq('id', institutionId);
      } else {
        query = query.ilike('institution_id', institutionId);
      }

      const { data: inst, error } = await (query as any).maybeSingle();

      if (error) {
        console.warn('[Login] Institution status check query error:', error);
        return false;
      }

      if (inst && inst.status && inst.status.toLowerCase() !== 'active') {
        setDisabledInstitutionInfo({
          name: inst.name || 'Your Institution',
          phone: inst.office_phone || inst.phone || '',
        });
        setShowInstitutionDisabledModal(true);
        return true;
      }
    } catch (e) {
      console.warn('[Login] Institution status check failed:', e);
    }
    return false;
  };

  // Step 1: Look up the email
  const handleEmailContinue = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Look up user in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, institution_id, image_url, profile_image_url, avatar_url, is_active, department')
        .eq('email', trimmedEmail)
        .maybeSingle() as any;
      
      if (profileError) {
        console.error('[Login] Profile lookup error:', profileError);
      }
      
      if (!profile) {
        setError('No account found with this email. Please contact your institution.');
        setLoading(false);
        return;
      }
      
      // Check if blocked
      if (profile.is_active === false) {
        setLoading(false);
        const isBlocked = await checkBlockedStatus(trimmedEmail);
        if (!isBlocked) {
          setBlockedContact({
            name: profile.full_name || 'the administrator',
            phone: 'N/A'
          });
          setShowBlockedModal(true);
        }
        return;
      }

      // Check if user's institution is disabled
      if (profile.institution_id && profile.institution_id !== 'global') {
        const isInstDisabled = await checkInstitutionDisabled(profile.institution_id, profile.role);
        if (isInstDisabled) {
          setLoading(false);
          return;
        }
      }
      
      // Determine effective role from department, role, or special email domain
      let effectiveRole = profile.role || 'unknown';
      const dept = (profile.department || '').toLowerCase().trim();
      const rawRole = (profile.role || '').toLowerCase().trim();

      if (dept === 'admissions' || dept === 'admission' || rawRole === 'admissions' || rawRole === 'admission_officer') {
        effectiveRole = 'admission_officer';
      } else if (dept === 'fee management' || dept === 'finance' || rawRole === 'accountant' || rawRole === 'finance') {
        effectiveRole = 'accountant';
      } else if (dept === 'reports' || dept === 'academic' || rawRole === 'reports_manager' || rawRole === 'analytics') {
        effectiveRole = 'reports_manager';
      } else if (
        dept === 'ad management' ||
        dept === 'ads' ||
        rawRole === 'ad_manager' ||
        rawRole === 'ad_stakeholder' ||
        trimmedEmail.includes('@ads.')
      ) {
        effectiveRole = 'ad_manager';
      } else if (
        dept === 'platform finance' ||
        dept === 'saas finance' ||
        rawRole === 'finance_manager' ||
        rawRole === 'superadmin_finance' ||
        trimmedEmail.includes('@finance.')
      ) {
        effectiveRole = 'finance_manager';
      }

      // Build looked up user info
      const userInfo: LookedUpUser = {
        id: profile.id,
        full_name: profile.full_name || trimmedEmail.split('@')[0],
        role: effectiveRole,
        institution_id: profile.institution_id || '',
        image_url: profile.image_url || profile.profile_image_url || profile.avatar_url,
      };
      
      // If student, get class info and image
      if (profile.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('name, class_name, section, image_url')
          .or(`user_id.eq.${profile.id},profile_id.eq.${profile.id}`)
          .maybeSingle() as any;
        
        if (student) {
          userInfo.class_name = student.class_name;
          userInfo.section = student.section;
          if (student.image_url) userInfo.image_url = student.image_url;
          if (student.name) userInfo.full_name = student.name;
        }
      }
      
      // Get institution name
      if (profile.institution_id && profile.institution_id !== 'global') {
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        let instQuery = supabase.from('institutions').select('name');
        if (isUUID(profile.institution_id)) {
          instQuery = instQuery.eq('id', profile.institution_id);
        } else {
          instQuery = instQuery.ilike('institution_id', profile.institution_id);
        }
        const { data: inst } = await (instQuery as any).maybeSingle();
        if (inst?.name) userInfo.institution_name = inst.name;
      }
      
      setLookedUpUser(userInfo);
      
      // Try to determine if user needs password setup by attempting default password sign-in
      const defaultPassword = `VidyonSetup_${profile.institution_id}`;
      let { data: testLogin, error: testError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: defaultPassword,
      });

      // Also try fallback for global stakeholders without institution_id
      if (testError && !profile.institution_id) {
        const alt = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: 'VidyonSetup_global',
        });
        if (alt.data?.user && !alt.error) {
          testLogin = alt.data;
          testError = null;
        }
      }
      
      if (testLogin?.user && !testError) {
        // Default password worked - user needs to set their own password
        console.log('[Login] Default password accepted - first time user');
        // Sign out immediately - we just tested, user must set password first
        await supabase.auth.signOut();
        setLoginStep('setup_password');
      } else {
        // Default password didn't work - user already has a custom password
        console.log('[Login] Default password rejected - existing user with custom password');
        setLoginStep('password');
      }
      
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: Regular login with password
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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
          .select('id, full_name, role, institution_id, image_url, profile_image_url, avatar_url, department, is_active')
          .eq('id', data.user.id)
          .maybeSingle() as any;

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          setLoading(false);
          const isBlocked = await checkBlockedStatus(email.trim().toLowerCase());
          if (!isBlocked) {
            setBlockedContact({
              name: profile.full_name || 'the administrator',
              phone: 'N/A'
            });
            setShowBlockedModal(true);
          }
          return;
        }

        if (profile && data.session) {
          // Enforce institution access: Block disabled institutions
          if (profile.institution_id) {
            const isInstDisabled = await checkInstitutionDisabled(profile.institution_id, profile.role);
            if (isInstDisabled) {
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
          }

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
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('logo_url');
            if (isUUID(profile.institution_id)) {
              query = query.eq('id', profile.institution_id);
            } else {
              query = query.ilike('institution_id', profile.institution_id);
            }
            const { data: inst } = await (query as any).maybeSingle();
            if (inst?.logo_url && typeof inst.logo_url === 'string' && inst.logo_url.startsWith('http')) {
              imageUrl = inst.logo_url;
            }
          }

          let effectiveRole = profile.role;
          const dept = (profile.department || '').toLowerCase().trim();
          const rawRole = (profile.role || '').toLowerCase().trim();
          if (dept === 'ad management' || dept === 'ads' || rawRole === 'ad_manager' || rawRole === 'ad_stakeholder' || data.user.email?.includes('@ads.')) {
            effectiveRole = 'ad_manager';
          } else if (dept === 'platform finance' || dept === 'saas finance' || rawRole === 'finance_manager' || rawRole === 'superadmin_finance' || data.user.email?.includes('@finance.')) {
            effectiveRole = 'finance_manager';
          } else if (dept === 'admissions' || dept === 'admission') {
            effectiveRole = 'admission_officer';
          } else if (dept === 'fee management' || dept === 'finance') {
            effectiveRole = 'accountant';
          } else if (dept === 'reports') {
            effectiveRole = 'reports_manager';
          }

          await saveAccount({
            id: profile.id,
            email: data.user.email!,
            full_name: fullName || data.user.email!.split('@')[0],
            role: effectiveRole,
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

  // Step 2b: First-time password setup
  const handleSetupPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const defaultPassword = `VidyonSetup_${lookedUpUser?.institution_id}`;
      
      // Sign in with default password
      let { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: defaultPassword,
      });

      if (loginError && !lookedUpUser?.institution_id) {
        const alt = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: 'VidyonSetup_global',
        });
        if (alt.data?.user && !alt.error) {
          loginData = alt.data;
          loginError = null;
        }
      }
      
      if (loginError) {
        // This shouldn't happen since we tested it earlier, but handle gracefully
        setError('Password setup failed. Your password may have already been set. Try logging in instead.');
        setLoginStep('password');
        setLoading(false);
        return;
      }
      
      // Now update the password to the user's chosen password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          needs_password_setup: false,
          force_password_change: false,
        }
      });
      
      if (updateError) {
        console.error('[Login] Password update failed:', updateError);
        setError('Failed to set password. Please try again.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      console.log('[Login] Password set successfully for:', trimmedEmail);
      
      // Save account locally
      if (loginData.user && loginData.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role, institution_id, image_url, profile_image_url, avatar_url, department')
          .eq('id', loginData.user.id)
          .maybeSingle() as any;
        
        if (profile) {
          let imageUrl = lookedUpUser?.image_url || profile.image_url || profile.profile_image_url || profile.avatar_url;
          let effectiveRole = lookedUpUser?.role || profile.role;
          await saveAccount({
            id: profile.id,
            email: loginData.user.email!,
            full_name: lookedUpUser?.full_name || profile.full_name || loginData.user.email!.split('@')[0],
            role: effectiveRole,
            institution_id: profile.institution_id,
            image_url: imageUrl,
            access_token: loginData.session.access_token,
            refresh_token: loginData.session.refresh_token,
          });
        }
      }
      
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setLoginStep('email');
    setLookedUpUser(null);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleForgotSubmit = async () => {
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) {
      setForgotErrorMsg('Please enter your account email address.');
      return;
    }
    setForgotSubmitting(true);
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);
    try {
      const res = await submitPasswordResetRequest({
        email: clean,
        reason: forgotReason.trim() || 'User requested password reset from login portal',
      });
      setForgotSuccessMsg(res.message);
    } catch (err: any) {
      setForgotErrorMsg(err.message || 'Failed to submit reset request. Please check your email.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleAccountPress = async (account: any) => {
    setError(null);

    // Pre-check if individual account is disabled in profiles
    try {
      const { data: prof } = await (supabase.from('profiles') as any)
        .select('is_active')
        .eq('id', account.id)
        .maybeSingle();

      if (prof && prof.is_active === false) {
        const isBlocked = await checkBlockedStatus(account.email);
        if (!isBlocked) {
          setBlockedContact({
            name: account.full_name || 'the administrator',
            phone: 'N/A'
          });
          setShowBlockedModal(true);
        }
        return;
      }
    } catch (e) {
      console.warn('[Login] QuickLogin pre-check user active failed:', e);
    }

    // Pre-check if institution is disabled before initiating switch
    if (account.institution_id && account.role !== 'admin' && account.role !== 'superadmin') {
      const isInstDisabled = await checkInstitutionDisabled(account.institution_id, account.role);
      if (isInstDisabled) {
        return;
      }
    }

    setAnimatingAccount(account);
    
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
      // Check again right before setting session
      try {
        const { data: prof } = await (supabase.from('profiles') as any)
          .select('is_active')
          .eq('id', account.id)
          .maybeSingle();

        if (prof && prof.is_active === false) {
          setAnimatingAccount(null);
          const isBlocked = await checkBlockedStatus(account.email);
          if (!isBlocked) {
            setBlockedContact({
              name: account.full_name || 'the administrator',
              phone: 'N/A'
            });
            setShowBlockedModal(true);
          }
          return;
        }
      } catch (e) {}

      const success = await switchToAccount(account);
      if (success) {
        // Enforce user active status after switch
        try {
          const { data: postProf } = await (supabase.from('profiles') as any)
            .select('is_active')
            .eq('id', account.id)
            .maybeSingle();

          if (postProf && postProf.is_active === false) {
            await supabase.auth.signOut();
            setAnimatingAccount(null);
            const isBlocked = await checkBlockedStatus(account.email);
            if (!isBlocked) {
              setBlockedContact({
                name: account.full_name || 'the administrator',
                phone: 'N/A'
              });
              setShowBlockedModal(true);
            }
            return;
          }
        } catch (e) {}

        // Enforce institution access after switch
        if (account.institution_id && account.role !== 'admin' && account.role !== 'superadmin') {
          const isInstDisabled = await checkInstitutionDisabled(account.institution_id, account.role);
          if (isInstDisabled) {
            await supabase.auth.signOut();
            setAnimatingAccount(null);
            return;
          }
        }

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
        ]).start(async () => {
          setAnimatingAccount(null);
          
          // Check if institution is disabled
          if (account.institution_id && account.role !== 'admin' && account.role !== 'superadmin') {
            const isInstDisabled = await checkInstitutionDisabled(account.institution_id, account.role);
            if (isInstDisabled) return;
          }

          // Check if this saved account was recently blocked
          const isBlocked = await checkBlockedStatus(account.id);
          if (!isBlocked) {
            setError('Session expired. Please log in with your password.');
            setEmail(account.email);
          }
        });
      }
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'student': return <GraduationCap size={20} color={theme.colors.primary} {...({} as any)} />;
      case 'faculty': 
      case 'teacher':
      case 'staff':
        return <Briefcase size={20} color={theme.colors.primary} {...({} as any)} />;
      case 'parent': return <UsersIcon size={20} color={theme.colors.primary} {...({} as any)} />;
      case 'ad_manager':
      case 'ads': return <Megaphone size={20} color="#F59E0B" {...({} as any)} />;
      case 'finance_manager':
      case 'finance':
      case 'accountant': return <CreditCard size={20} color="#10B981" {...({} as any)} />;
      case 'institution_stakeholder': return <Building2 size={20} color="#8B5CF6" {...({} as any)} />;
      case 'institution': return <Building size={20} color="#0284C7" {...({} as any)} />;
      case 'superadmin':
      case 'admin': return <Shield size={20} color="#EF4444" {...({} as any)} />;
      default: return <UserIcon size={20} color={theme.colors.primary} {...({} as any)} />;
    }
  };

  const getRoleLabel = (role: string) => {
    if (!role) return 'User';
    switch (role.toLowerCase()) {
      case 'ad_manager': return 'Ad Manager';
      case 'finance_manager': return 'Finance Manager';
      case 'institution_stakeholder': return 'Institution Stakeholder';
      case 'admission_officer':
      case 'admissions': return 'Admission Officer';
      case 'reports_manager': return 'Reports Manager';
      case 'superadmin': return 'Super Admin';
      case 'accountant': return 'Accountant';
      case 'canteen_manager':
      case 'canteen': return 'Canteen Manager';
      case 'institution': return 'Institution Admin';
      case 'faculty': return 'Faculty';
      case 'student': return 'Student';
      case 'parent': return 'Parent';
      default: return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // ---- RENDER ----
  const renderUserCard = () => {
    if (!lookedUpUser) return null;
    
    const initials = lookedUpUser.full_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userCardAvatar}>
          {lookedUpUser.image_url ? (
            <Image source={{ uri: lookedUpUser.image_url }} style={styles.userCardImage} />
          ) : (
            <View style={[styles.userCardImage, styles.userCardPlaceholder]}>
              <Text style={styles.userCardInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.userCardName}>{lookedUpUser.full_name}</Text>
        
        <View style={styles.userCardBadgeRow}>
          <View style={[
            styles.userCardBadge,
            lookedUpUser.role === 'ad_manager' && { backgroundColor: '#FEF3C7' },
            lookedUpUser.role === 'finance_manager' && { backgroundColor: '#D1FAE5' },
            lookedUpUser.role === 'superadmin' && { backgroundColor: '#FEE2E2' },
          ]}>
            {getRoleIcon(lookedUpUser.role)}
            <Text style={[
              styles.userCardBadgeText,
              lookedUpUser.role === 'ad_manager' && { color: '#D97706', fontWeight: '700' },
              lookedUpUser.role === 'finance_manager' && { color: '#059669', fontWeight: '700' },
              lookedUpUser.role === 'superadmin' && { color: '#DC2626', fontWeight: '700' },
            ]}>
              {getRoleLabel(lookedUpUser.role)}
            </Text>
          </View>
          {lookedUpUser.class_name && (
            <View style={[styles.userCardBadge, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.userCardBadgeText, { color: '#4F46E5' }]}>
                {lookedUpUser.class_name}{lookedUpUser.section ? ` - ${lookedUpUser.section}` : ''}
              </Text>
            </View>
          )}
        </View>
        
        {lookedUpUser.institution_name && (
          <Text style={styles.userCardInstitution}>{lookedUpUser.institution_name}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

          {/* Saved Accounts - only show on email step */}
          {loginStep === 'email' && savedAccounts.length > 0 && (
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
                    <Text style={styles.accountRole}>{getRoleLabel(account.role)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* ---- STEP: EMAIL ---- */}
          {loginStep === 'email' && (
            <>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onSubmitEditing={handleEmailContinue}
                  returnKeyType="next"
                />
              </View>

              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleEmailContinue}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Continue</Text>
                    <ChevronRight size={20} color="black" {...({} as any)} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 4 }}
                onPress={() => {
                  setForgotEmail(email);
                  setForgotErrorMsg(null);
                  setForgotSuccessMsg(null);
                  setShowForgotModal(true);
                }}
              >
                <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>
                  Forgot password? <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Reset here</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ---- STEP: PASSWORD (Existing User) ---- */}
          {loginStep === 'password' && (
            <>
              {renderUserCard()}

              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  secureTextEntry={!showPassword}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? 
                    <EyeOff size={20} color={theme.colors.textMuted} {...({} as any)} /> : 
                    <Eye size={20} color={theme.colors.textMuted} {...({} as any)} />
                  }
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 14, paddingVertical: 4 }}
                onPress={() => {
                  setForgotEmail(email);
                  setForgotErrorMsg(null);
                  setForgotSuccessMsg(null);
                  setShowForgotModal(true);
                }}
              >
                <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

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

              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <ArrowLeft size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.backBtnText}>Use a different account</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ---- STEP: SETUP PASSWORD (First-Time User) ---- */}
          {loginStep === 'setup_password' && (
            <>
              {renderUserCard()}

              <View style={styles.setupBanner}>
                <Text style={styles.setupBannerTitle}>Welcome! Set your password</Text>
                <Text style={styles.setupBannerText}>This is your first login. Please create a password to secure your account.</Text>
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
                <TextInput
                  style={styles.input}
                  placeholder="Create password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(null); }}
                  secureTextEntry={!showNewPassword}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 4 }}>
                  {showNewPassword ? 
                    <EyeOff size={20} color={theme.colors.textMuted} {...({} as any)} /> : 
                    <Eye size={20} color={theme.colors.textMuted} {...({} as any)} />
                  }
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                  secureTextEntry={!showNewPassword}
                  onSubmitEditing={handleSetupPassword}
                  returnKeyType="done"
                />
              </View>

              {newPassword.length > 0 && newPassword.length < 6 && (
                <Text style={styles.hintText}>Password must be at least 6 characters</Text>
              )}

              <TouchableOpacity 
                style={[styles.loginBtn, (!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) && { opacity: 0.5 }]} 
                onPress={handleSetupPassword}
                disabled={loading || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {loading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Set Password & Login</Text>
                    <ChevronRight size={20} color="black" {...({} as any)} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <ArrowLeft size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.backBtnText}>Use a different account</Text>
              </TouchableOpacity>
            </>
          )}

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

      {/* Institution Disabled Modal */}
      <Modal
        visible={showInstitutionDisabledModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInstitutionDisabledModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Building size={32} color="#D97706" {...({} as any)} />
              </View>
              <Text style={styles.modalTitle}>Institution Disabled</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Access to <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{disabledInstitutionInfo?.name || 'this institution'}</Text> has been disabled by the administrator.
              </Text>
              <Text style={styles.modalSubMessage}>
                All accounts under this institution are currently inactive. Please contact your institution administrator.
              </Text>
              
              {disabledInstitutionInfo?.phone && disabledInstitutionInfo.phone !== 'N/A' && disabledInstitutionInfo.phone.trim() !== '' ? (
                <View style={styles.contactInfoBox}>
                  <Text style={styles.contactLabel}>Institution Contact:</Text>
                  <Text style={styles.contactPhone}>{disabledInstitutionInfo.phone}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowInstitutionDisabledModal(false)}
              >
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </TouchableOpacity>
              
              {disabledInstitutionInfo?.phone && disabledInstitutionInfo.phone !== 'N/A' && disabledInstitutionInfo.phone.trim() !== '' ? (
                <TouchableOpacity 
                  style={styles.callBtn}
                  onPress={() => {
                    if (disabledInstitutionInfo?.phone) {
                      Linking.openURL(`tel:${disabledInstitutionInfo.phone}`);
                    }
                  }}
                >
                  <Phone size={18} color="white" style={{ marginRight: 8 }} {...({} as any)} />
                  <Text style={styles.callBtnText}>Call Now</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Request Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!forgotSubmitting) {
            setShowForgotModal(false);
            setForgotErrorMsg(null);
            setForgotSuccessMsg(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 440 }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <KeyRound size={28} color="#D97706" {...({} as any)} />
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
            </View>

            <View style={styles.modalBody}>
              {forgotSuccessMsg ? (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <CheckCircle2 size={44} color="#16A34A" style={{ marginBottom: 12 }} {...({} as any)} />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#16A34A', textAlign: 'center', marginBottom: 8 }}>
                    Request Sent Successfully!
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
                    {forgotSuccessMsg}
                  </Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, marginTop: 14, width: '100%', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 }}>
                      ℹ️ Once your administrator approves, simply sign in with your email again. You will be prompted to set your new password directly, just like on first login.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.modalMessage}>
                    Forgot your password? Send a reset request to your administrator (Super Admin or Campus Admin).
                  </Text>
                  <Text style={styles.modalSubMessage}>
                    Once verified and approved, you will enter your new password on your next login.
                  </Text>

                  {forgotErrorMsg && (
                    <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
                      <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '500' }}>{forgotErrorMsg}</Text>
                    </View>
                  )}

                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>
                      Account Email
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Mail size={18} color={theme.colors.textMuted} style={styles.inputIcon} {...({} as any)} />
                      <TextInput
                        style={styles.input}
                        placeholder="your-email@example.com"
                        placeholderTextColor={theme.colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 6 }}>
                      Note / Reason (Optional)
                    </Text>
                    <View style={[styles.inputWrapper, { height: 70, alignItems: 'flex-start', paddingTop: 8 }]}>
                      <TextInput
                        style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                        placeholder="e.g. Forgot password on mobile device"
                        placeholderTextColor={theme.colors.textMuted}
                        value={forgotReason}
                        onChangeText={setForgotReason}
                        multiline
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              {forgotSuccessMsg ? (
                <TouchableOpacity
                  style={[styles.callBtn, { flex: 1, backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    setShowForgotModal(false);
                    setForgotSuccessMsg(null);
                    setForgotErrorMsg(null);
                  }}
                >
                  <Text style={[styles.callBtnText, { color: 'white' }]}>Done</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => {
                      setShowForgotModal(false);
                      setForgotErrorMsg(null);
                    }}
                    disabled={forgotSubmitting}
                  >
                    <Text style={styles.closeBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: '#D97706' }, forgotSubmitting && { opacity: 0.7 }]}
                    onPress={handleForgotSubmit}
                    disabled={forgotSubmitting}
                  >
                    {forgotSubmitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <KeyRound size={16} color="white" style={{ marginRight: 6 }} {...({} as any)} />
                        <Text style={styles.callBtnText}>Request Reset</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  hintText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
    paddingLeft: 4,
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
  // User Card (recognized user big card)
  userCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  userCardAvatar: {
    marginBottom: 16,
  },
  userCardImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: theme.colors.primary + '30',
  },
  userCardPlaceholder: {
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCardInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  userCardName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  userCardBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary + '12',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  userCardBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  userCardInstitution: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
  // Setup banner
  setupBanner: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  setupBannerText: {
    fontSize: 13,
    color: '#A16207',
    lineHeight: 18,
  },
  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  backBtnText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
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
