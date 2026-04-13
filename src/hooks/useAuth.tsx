import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { LargeSecureStore } from '../lib/storage';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'faculty' | 'student' | 'parent' | 'institution' | 'accountant' | 'canteen' | 'canteen_manager' | 'superadmin' | 'driver' | null;
  institutionId: string | null;
  institutionUuid: string | null;
  academicYear: string | null;
  fullName: string | null;
  imageUrl: string | null;
  lastReadEventsAt: string | null;
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
  lastReadEventsAt: null,
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
  const [lastReadEventsAt, setLastReadEventsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      await LargeSecureStore.removeItem('sb-ccyqzcaghwaggtmkmigi-auth-token');
      // Also call supabase signout if possible but don't block
      supabase.auth.signOut().catch(console.error);
    } catch(e) {
      console.error('[Auth] Failed to wipe device token', e);
    }
    
    setSession(null);
    setUser(null);
    setRole(null);
    setInstitutionId(null);
    setInstitutionUuid(null);
    setAcademicYear(null);
    setFullName(null);
    setImageUrl(null);
    setLastReadEventsAt(null);
  };

  // State Tracking Ref: Crucial for avoiding stale closures in the subscription listener
  const stateRef = useRef({ role, userId: user?.id });
  useEffect(() => {
    stateRef.current = { role, userId: user?.id };
  }, [role, user?.id]);

  const fetchRole = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, institution_id, full_name, image_url, profile_image_url, avatar_url, is_active, last_read_events_at')
        .eq('id', userId)
        .maybeSingle() as any;
      
      if (profileError) throw profileError;
      
      if (profile) {
        if (profile.is_active === false) {
          await signOut();
          Alert.alert("Account Disabled", "Your account is disabled by the admin.");
          return;
        }

        setRole(profile.role as AuthContextType['role']);
        setInstitutionId(profile.institution_id);
        setLastReadEventsAt(profile.last_read_events_at);
        
        let name = profile.full_name;
        let img = profile.image_url || profile.profile_image_url || profile.avatar_url;

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
            setInstitutionId(instData.institution_id || profile.institution_id);
          }
        }
      }
    } catch (error) {
      console.error('[Auth] Role fetch error:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial State Load
    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchRole(initialSession.user.id);
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    // 2. Real-time Auth Listening
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      console.log(`[Auth] Event: ${event}`, currentSession?.user?.id);

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);

        // SYNC Check: only fetch role if user changed or role is missing
        const { role: cachedRole, userId: cachedUserId } = stateRef.current;
        if (!cachedRole || cachedUserId !== currentSession.user.id) {
          // Avoid loading screen for TOKEN_REFRESHED to improve fluidity
          if (event !== 'TOKEN_REFRESHED') setLoading(true);
          try {
            await Promise.race([
                fetchRole(currentSession.user.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('fetchRole timeout')), 10000))
            ]);
          } catch(e) {
            console.error('[Auth] FetchRole race error:', e);
          } finally {
            if (isMounted) setLoading(false);
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3. Token Sync: Keep SavedAccounts updated with fresh refreshed tokens
  useEffect(() => {
    if (!session || !user) return;
    
    const syncToken = async () => {
        try {
            const STORAGE_KEY = 'my_vidyon_saved_accounts';
            const stored = await LargeSecureStore.getItem(STORAGE_KEY);
            if (!stored) return;

            let accounts = JSON.parse(stored) as any[];
            const idx = accounts.findIndex(a => a.id === user.id);
            if (idx !== -1) {
                // If the tokens are different, update them!
                if (accounts[idx].access_token !== session.access_token || accounts[idx].refresh_token !== session.refresh_token) {
                    console.log(`[AuthSync] Updating fresh tokens for ${user.email}`);
                    accounts[idx].access_token = session.access_token;
                    accounts[idx].refresh_token = session.refresh_token;
                    accounts[idx].lastLogin = Date.now();
                    await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(accounts));
                }
            }
        } catch(e) {
            console.error('[AuthSync] Error syncing tokens:', e);
        }
    };

    syncToken();
  }, [session, user?.id]);

  return (
    <AuthContext.Provider value={{ 
      session, user, role, 
      institutionId, institutionUuid, academicYear, 
      fullName, imageUrl, lastReadEventsAt, 
      loading, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
