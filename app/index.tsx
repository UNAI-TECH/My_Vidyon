import React, { useEffect, useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';
import { supabase } from '../src/lib/supabase';

export default function AppEntryPoint() {
  const { session, role, loading, institutionUuid, signOut } = useAuth();
  // Ensure the splash only shows on first cold boot, not on login re-entry
  const [showSplash, setShowSplash] = useState(!session);
  const [instLogo, setInstLogo] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer: any;

    console.log('[AppIndex] Effect triggered. Loading:', loading, 'Session:', !!session, 'Role:', role);
    
    if (!loading && session) {
      if (institutionUuid) {
        (async () => {
          try {
            const { data } = await supabase.from('institutions').select('logo_url').eq('id', institutionUuid).maybeSingle();
            if (isMounted && (data as any)?.logo_url) setInstLogo((data as any).logo_url);
          } catch (e) {
            console.warn('[AppIndex] Logo fetch failed:', e);
          } finally {
            if (isMounted) {
                // Only start timer if splash is still showing
                if (showSplash) timer = setTimeout(() => setShowSplash(false), 2000);
            }
          }
        })();
      } else {
        if (isMounted && showSplash) {
            timer = setTimeout(() => setShowSplash(false), 2000);
        }
      }
    } else if (!loading && !session && showSplash) {
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

  // Auth is loaded and splash is finished - perform final routing
  // MUST be called before the early return below to satisfy the Rules of Hooks
  useEffect(() => {
    if (loading || showSplash) return;

    if (!session) {
      console.log('[AppIndex] No session, redirecting to login');
      router.replace('/(auth)/login');
      return;
    }

    if (!role) {
      console.warn('[AppIndex] Session exists but role is missing! Status:', { loading, role });
      return;
    }

    const normalizedRole = (role as string).split('_')[0] || role;
    console.log('[AppIndex] Final Routing Decision:', role, '->', normalizedRole);

    if (role === 'admin' || role === 'superadmin') {
      router.replace('/(root)/admin');
    } else if (role === 'institution') {
      router.replace('/(root)/institution');
    } else if (role === 'faculty') {
      router.replace('/(root)/faculty');
    } else if (role === 'parent') {
      router.replace('/(root)/parent');
    } else if (role === 'accountant') {
      router.replace('/(root)/accountant');
    } else if (role === 'canteen_manager') {
      router.replace('/(root)/canteen');
    } else if (role === 'driver') {
      router.replace('/(root)/driver');
    } else {
      router.replace('/(root)/student');
    }
  }, [loading, showSplash, session, role]);

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
          <View style={{ marginTop: 24, padding: 20, backgroundColor: '#F8FAFC', borderRadius: 24, alignItems: 'center', width: 200, borderWidth: 1, borderColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>In Partnership with</Text>
            <Image 
                source={{ uri: instLogo }} 
                style={{ width: 80, height: 80, resizeMode: 'contain', borderRadius: 12 }} 
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
                            onPress={() => {
                                if (typeof window !== 'undefined' && window.location?.reload) {
                                    window.location.reload();
                                } else {
                                    router.replace('/');
                                }
                            }}
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

        {!loading && !showSplash && role === null && session && (
             <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Text style={{ color: '#ef4444', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                    Failed to identify user role.
                </Text>
                <TouchableOpacity 
                    onPress={() => {
                        // Force a fresh check
                        if (typeof window !== 'undefined' && window.location?.reload) {
                            window.location.reload();
                        } else {
                            router.replace('/');
                        }
                    }}
                    style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry Identification</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={signOut}>
                    <Text style={{ color: '#94A3B8' }}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  }

  return null;
}
