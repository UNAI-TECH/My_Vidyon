import React from 'react';
import { Redirect } from 'expo-router';

export default function AdManagerSettingsFallback() {
  return <Redirect href="/(root)/admin/settings" />;
}
