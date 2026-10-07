import React, { useEffect, useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';
import { supabase } from '../src/lib/supabase';

export default function AppEntryPoint() {
  const { session, role, loading, institutionUuid, institutionId, signOut } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [instLogo, setInstLogo] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer: any;

    console.log('[AppIndex] Effect triggered. Loading:', loading, 'Session:', !!session, 'Role:', role);
    
    if (!loading && session) {
      const targetInst = institutionUuid || institutionId;
      if (targetInst && targetInst !== 'global') {
        (async () => {
          try {
            console.log('[AppIndex] Fetching institution logo for:', targetInst);
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('logo_url');
            if (isUUID(targetInst)) {
              query = query.eq('id', targetInst);
            } else {
              query = query.ilike('institution_id', targetInst);
            }
            const { data } = await (query as any).maybeSingle();
            const logo = (data as any)?.logo_url;
            if (isMounted && logo && typeof logo === 'string' && logo.startsWith('http')) {
              setInstLogo(logo);
            }
          } catch (e) {
            console.warn('[AppIndex] Logo fetch failed:', e);
          } finally {
            console.log('[AppIndex] Logo fetch done, starting splash timer');
            if (isMounted) timer = setTimeout(() => setShowSplash(false), 2000);
          }
        })();
      } else {
        console.log('[AppIndex] No institution UUID, starting splash timer');
        timer = setTimeout(() => {
            if (isMounted) setShowSplash(false);
        }, 2000);
      }
    } else if (!loading && !session) {
        console.log('[AppIndex] No session, starting quick splash timer');
        timer = setTimeout(() => {
            if (isMounted) setShowSplash(false);
        }, 1500);
    }
    
    return () => { 
        isMounted = false; 
        if (timer) clearTimeout(timer);
    };
  }, [loading, session, institutionUuid]);

  useEffect(() => {
    if (loading && !showRetry) {
      const t = setTimeout(() => setShowRetry(true), 15000);
      return () => clearTimeout(t);
    } else if (!loading) {
      setShowRetry(false);
    }
  }, [loading]);

  console.log('[AppIndex] Rendering. loading:', loading, 'showSplash:', showSplash, 'role:', role);

  // While auth is initializing or we are showing the branded splash
  if (loading || showSplash) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 24 }}>
        <Image 
            source={require('../assets/logo.png')} 
            style={{ width: 160, height: 160, resizeMode: 'contain' }} 
        />
        
        {instLogo && !loading && (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12, fontWeight: '500' }}>in partnership with</Text>
            <Image 
                source={{ uri: instLogo }} 
                style={{ width: 80, height: 80, resizeMode: 'contain', borderRadius: 12 }} 
                onError={() => setInstLogo(null)}
            />
          </View>
        )}

        {loading && (
            <View style={{ marginTop: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                {showRetry && (
                    <View style={{ marginTop: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                            Connection is taking longer than expected.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => router.replace('/')}
                            style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry Connection</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={signOut}>
                            <Text style={{ color: '#94A3B8' }}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        )}

        {!loading && showSplash && role === null && session && (
             <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Text style={{ color: '#ef4444', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                    Failed to identify user role.
                </Text>
                <TouchableOpacity 
                    onPress={() => router.replace('/')}
                    style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={signOut}>
                    <Text style={{ color: '#94A3B8' }}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  }

  // Auth is loaded and splash is finished - perform final routing
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Normalize role for routing (e.g. canteen_manager -> canteen)
  const normalizedRole = role?.split('_')[0] || role;

  if (role === 'admin' || role === 'superadmin' || role === 'ad_manager' || role === 'finance_manager') {
    return <Redirect href="/(root)/admin" />;
  }
  if (
    role === 'institution' ||
    role === 'admission_officer' ||
    role === 'admissions' ||
    role === 'reports_manager' ||
    role === 'accountant' ||
    role === 'finance'
  ) {
    return <Redirect href="/(root)/institution" />;
  }
  if (role === 'institution_stakeholder') return <Redirect href="/(root)/stakeholder" />;
  if (role === 'faculty') return <Redirect href="/(root)/faculty" />;
  if (role === 'student') return <Redirect href="/(root)/student" />;
  if (role === 'parent') return <Redirect href="/(root)/parent" />;
  if (normalizedRole === 'canteen') return <Redirect href="/(root)/canteen" />;
  
  // Final fallback to login if something is wrong with the role
  console.warn('Unknown or missing role during startup:', role);
  return <Redirect href="/(auth)/login" />;
}
