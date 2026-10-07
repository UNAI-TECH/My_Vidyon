import React from 'react';
import { Redirect } from 'expo-router';

export default function AdSettingsFallback() {
  return <Redirect href="/(root)/admin/settings" />;
}
