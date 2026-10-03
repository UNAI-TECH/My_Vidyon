import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { LargeSecureStore } from '../lib/storage';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'faculty' | 'student' | 'parent' | 'institution' | 'accountant' | 'canteen' | 'canteen_manager' | 'superadmin' | null;
  institutionId: string | null;
  institutionUuid: string | null;
  institutionName: string | null;
  institutionLogo: string | null;
  academicYear: string | null;
  fullName: string | null;
  imageUrl: string | null;
  lastReadEventsAt: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  institutionId: null,
  institutionUuid: null,
  institutionName: null,
  institutionLogo: null,
  academicYear: null,
  fullName: null,
  imageUrl: null,
  lastReadEventsAt: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthContextType['role']>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionUuid, setInstitutionUuid] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [institutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lastReadEventsAt, setLastReadEventsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Track the currently resolved user ID and role so we can detect same-user
  // focus-restore events vs genuine account switches.
  const currentUserIdRef = useRef<string | null>(null);
  const currentRoleRef = useRef<AuthContextType['role']>(null);

  const signOut = async () => {
    // 1. Manually wipe the token from device storage to force local logout.
    // We intentionally bypass supabase.auth.signOut() here because GoTrue
    // has a tendency to send POST /logout and destroy the refresh_token globally,
    // which breaks our completely seamless Quick Login feature.
    try {
      const { LargeSecureStore } = require('../lib/storage');
      await LargeSecureStore.removeItem('sb-ccyqzcaghwaggtmkmigi-auth-token');
    } catch(e) {
      console.error('[Auth] Failed to wipe device token', e);
    }
    
    // 2. Clear out React state to securely kick the user up to the login screen
    setSession(null);
    setUser(null);
    setRole(null);
    currentUserIdRef.current = null;
    currentRoleRef.current = null;
    setInstitutionId(null);
    setInstitutionUuid(null);
    setInstitutionName(null);
    setInstitutionLogo(null);
    setAcademicYear(null);
    setFullName(null);
    setImageUrl(null);
    setLastReadEventsAt(null);
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id);
          currentUserIdRef.current = session.user.id;
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Fire-and-forget the heavy lifting to avoid blocking the auth state machine transition.
      // Blocking here during setSession can cause the calling component (LoginScreen) to hang.
      (async () => {
        if (!isMounted) return;

        console.log(`[Auth] Event: ${event}`, session?.user?.id);

        // Always sync Quick-Login saved account tokens on any auth event
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            const stored = await LargeSecureStore.getItem('my_vidyon_saved_accounts');
            if (stored) {
              const current = JSON.parse(stored) as any[];
              const idx = current.findIndex((a: any) => a.id === session.user.id);
              if (idx !== -1) {
                current[idx].access_token = session.access_token;
                current[idx].refresh_token = session.refresh_token;
                await LargeSecureStore.setItem('my_vidyon_saved_accounts', JSON.stringify(current));
              }
            }
          } catch (e) {
            console.warn('[Auth] Token sync failed:', e);
          }
        }

        // Only log a new user_sessions row on genuine fresh SIGNED_IN for a *different* user.
        // Focus-restore and token-refresh for the same user should NOT re-log.
        if (session?.user && event === 'SIGNED_IN' && currentUserIdRef.current !== session.user.id) {
          try {
            let ip_address = null;
            try {
              const res = await fetch('https://api.ipify.org?format=json');
              const data = await res.json();
              ip_address = data.ip;
            } catch (ipErr) {
              console.warn('[Auth] IP fetch failed, proceeding without it');
            }

            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            await (supabase.from('user_sessions') as any).insert({
              user_id: session.user.id,
              session_token: `sess_${session.user.id.substring(0, 8)}_${Date.now()}`,
              device_info: { client: 'MyVidyon Mobile App', platform: Platform.OS },
              expires_at: expiresAt,
              ip_address: ip_address
            });
            console.log('[Auth] Logged session with IP:', ip_address);
          } catch (e) {
            console.error('[Auth] Session logging failed:', e);
          }
        }

        if (session) {
          setSession(session);
          setUser(session.user);

          // Determine if this is a same-user focus-restore / token-refresh
          // vs a genuine new login (different user or first-time).
          const isSameUser = currentUserIdRef.current === session.user.id;
          const hasExistingSession = currentUserIdRef.current !== null;

          if (isSameUser || event === 'TOKEN_REFRESHED' || hasExistingSession) {
            // Already logged in! Focus-restore, Alt+Tab, or token refresh:
            // Silently sync role in background. NEVER set loading=true,
            // which would unmount the navigation stack and kick the user!
            console.log(`[Auth] ${event} for existing user (${session.user.id}), silent background sync`);
            await fetchRole(session.user.id);
            currentUserIdRef.current = session.user.id;
          } else {
            // Genuine new login or first-time load
            console.log('[Auth] New SIGNED_IN — full role load');
            setLoading(true);
            await fetchRole(session.user.id);
            currentUserIdRef.current = session.user.id;
            setLoading(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          currentUserIdRef.current = null;
          currentRoleRef.current = null;
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      // 1. Fetch from profiles first (Primary source for all)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, institution_id, full_name, image_url, profile_image_url, avatar_url, is_active, last_read_events_at')
        .eq('id', userId)
        .maybeSingle() as any;
      
      if (profileError) throw profileError;
      
      if (profile) {
        // Enforce access control: If user is disabled, boot them out
        if (profile.is_active === false) {
          console.warn('[Auth] User account is disabled. Booting...');
          await signOut();
          Alert.alert(
            "Account Disabled", 
            "Id is disabled by the institute admin. and contact the admin to get enabled.",
            [{ text: "OK" }]
          );
          return;
        }

        console.log('[Auth] Role found:', profile.role);
        setRole(profile.role as AuthContextType['role']);
        currentRoleRef.current = profile.role as AuthContextType['role'];
        setInstitutionId(profile.institution_id);
        setLastReadEventsAt(profile.last_read_events_at);
        
        // Initial values from profile - look for any image url available
        let name = profile.full_name;
        let img = profile.image_url || profile.profile_image_url || profile.avatar_url;

        // 2. Role-specific overrides/fallbacks if profile data is missing
        if (!img || profile.role === 'student') {
          if (profile.role === 'student') {
            const { data: student } = await supabase
              .from('students')
              .select('name, image_url')
              .or(`user_id.eq.${userId},profile_id.eq.${userId}`)
              .maybeSingle() as any;
            
            if (student) {
              name = student.name || name;
              img = student.image_url || img;
            }
          }
        }

        setFullName(name);
        setImageUrl(img);

        if (profile.institution_id) {
          const { data: instData } = await supabase
            .from('institutions')
            .select('id, academic_year, institution_id, name, logo_url, status')
            .or(`institution_id.eq.${profile.institution_id},id.eq.${profile.institution_id}`)
            .maybeSingle() as any;
          
          if (instData) {
            // Enforce institution access: If institution is disabled, boot non-superadmin users
            const isInstDisabled = instData.status && instData.status.toLowerCase() !== 'active';
            if (isInstDisabled && profile.role !== 'admin' && profile.role !== 'superadmin') {
              console.warn('[Auth] User institution is disabled. Booting user...');
              await signOut();
              Alert.alert(
                "Institution Disabled", 
                `Access to ${instData.name || 'your institution'} has been disabled. Please contact the administrator.`,
                [{ text: "OK" }]
              );
              return;
            }

            setInstitutionUuid(instData.id);
            setAcademicYear(instData.academic_year);
            setInstitutionId(instData.institution_id || profile.institution_id);
            setInstitutionName(instData.name || null);
            setInstitutionLogo(instData.logo_url || null);
          }
        }
      } else {
        // Profile was not found for this userId.
        // This can happen if RLS blocks the query with a briefly-expired token,
        // or if the profile row genuinely doesn't exist.
        // Do NOT clear role here — that would log the user out on a transient failure.
        // The existing role is preserved as a safety net.
        console.warn('[Auth] fetchRole: no profile returned for userId:', userId, '— keeping existing role:', role);
      }
    } catch (error) {
      // On error, keep existing role to prevent stale-role logout.
      console.error('[Auth] Role fetch error (keeping existing role):', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchRole(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      role, 
      institutionId, 
      institutionUuid,
      institutionName,
      institutionLogo,
      academicYear,
      fullName,
      imageUrl,
      lastReadEventsAt,
      loading,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
