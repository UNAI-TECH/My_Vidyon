import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../src/theme';

export default function AccountantSettings() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Accountant Settings Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  text: { color: theme.colors.text, fontSize: 18 },
});
