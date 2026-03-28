import React, { useEffect, useState, createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { LargeSecureStore } from '../lib/storage';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'faculty' | 'student' | 'parent' | 'institution' | 'accountant' | 'canteen' | 'canteen_manager' | 'superadmin' | null;
  institutionId: string | null;
  institutionUuid: string | null;
  academicYear: string | null;
  fullName: string | null;
  imageUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  institutionId: null,
  institutionUuid: null,
  academicYear: null,
  fullName: null,
  imageUrl: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthContextType['role']>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionUuid, setInstitutionUuid] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setInstitutionId(null);
    setInstitutionUuid(null);
    setAcademicYear(null);
    setFullName(null);
    setImageUrl(null);
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

        if (session?.user && event === 'SIGNED_IN') {
          try {
            // Include IP Address as requested by user
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
          // Only trigger loading splash on role fetch if we don't have it yet
          setLoading(true);
          await fetchRole(session.user.id);
          setLoading(false);
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
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
        .select('role, institution_id, full_name, image_url, profile_image_url, avatar_url')
        .eq('id', userId)
        .maybeSingle() as any;
      
      if (profileError) throw profileError;
      
      if (profile) {
        console.log('[Auth] Role found:', profile.role);
        setRole(profile.role as AuthContextType['role']);
        setInstitutionId(profile.institution_id);
        
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
            .select('id, academic_year, institution_id')
            .eq('institution_id', profile.institution_id)
            .maybeSingle() as any;
          
          if (instData) {
            setInstitutionUuid(instData.id);
            setAcademicYear(instData.academic_year);
            // Ensure institutionId is set correctly as well
            setInstitutionId(instData.institution_id || profile.institution_id);
          }
        }
      }
    } catch (error) {
      console.error('[Auth] Role fetch error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      role, 
      institutionId, 
      institutionUuid,
      academicYear,
      fullName,
      imageUrl,
      loading,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
