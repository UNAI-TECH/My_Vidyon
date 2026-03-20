import React, { useEffect, useState } from 'react';
import { View, Image, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';

export default function Index() {
  const { role, loading, institutionUuid } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [instLogo, setInstLogo] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!loading) {
      if (institutionUuid) {
        supabase.from('institutions').select('logo_url').eq('id', institutionUuid).maybeSingle()
          .then(({ data }: any) => {
            if (isMounted && data?.logo_url) setInstLogo(data.logo_url);
            setTimeout(() => isMounted && setShowSplash(false), 3500); // Wait 3.5s after fetching
          });
      } else {
        setTimeout(() => isMounted && setShowSplash(false), 3500);
      }
    }
    return () => { isMounted = false; };
  }, [loading, institutionUuid]);

  if (loading || showSplash) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 180, height: 180, resizeMode: 'contain' }} />
        {instLogo && !loading && (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 12, fontWeight: '500' }}>in partnership with</Text>
            <Image source={{ uri: instLogo }} style={{ width: 100, height: 100, resizeMode: 'contain', borderRadius: 16 }} />
          </View>
        )}
      </View>
    );
  }

  if (role === 'admin' || role === 'superadmin') return <Redirect href="/(root)/admin" />;
  if (role === 'institution') return <Redirect href="/(root)/institution" />;
  if (role === 'faculty') return <Redirect href="/(root)/faculty" />;
  if (role === 'student') return <Redirect href="/(root)/student" />;
  if (role === 'parent') return <Redirect href="/(root)/parent" />;
  if (role === 'accountant') return <Redirect href="/(root)/accountant" />;
  if (role === 'canteen') return <Redirect href="/(root)/canteen" />;
  
  return <Redirect href="/(auth)/login" />;
}
