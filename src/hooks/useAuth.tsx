import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'faculty' | 'student' | 'parent' | 'institution' | 'accountant' | 'canteen' | 'superadmin' | null;
  institutionId: string | null;
  institutionUuid: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  institutionId: null,
  institutionUuid: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthContextType['role']>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionUuid, setInstitutionUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      console.log('Fetching role for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role, institution_id')
        .eq('id', userId)
        .maybeSingle() as any;
      
      if (data) {
        console.log('Role found in DB:', data.role);
        setRole(data.role as any);
        setInstitutionId(data.institution_id);

        // Fetch the proper UUID if we have a slug
        if (data.institution_id) {
          const { data: instData } = await supabase
            .from('institutions')
            .select('id')
            .eq('institution_id', data.institution_id)
            .maybeSingle();
          
          if (instData) {
            setInstitutionUuid((instData as any).id);
          }
        }
      } else {
        console.warn('No profile found, defaulting to student');
        setRole('student');
        setInstitutionId(null);
        setInstitutionUuid(null);
      }
    } catch (e) {
      console.error('Error fetching role:', e);
      setRole('student');
      setInstitutionId(null);
      setInstitutionUuid(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, institutionId, institutionUuid, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
