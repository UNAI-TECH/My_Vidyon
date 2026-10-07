import React from 'react';
import { Redirect } from 'expo-router';

export default function FinanceManagerSettingsFallback() {
  return <Redirect href="/(root)/admin/settings" />;
}
