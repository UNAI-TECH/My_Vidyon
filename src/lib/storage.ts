import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A storage shim for Supabase that utilize expo-secure-store with chunking.
 * This avoids:
 * 1. The 2KB limit of SecureStore on Android by splitting large strings.
 * 2. The "Native module is null" issues with AsyncStorage in new SDK versions.
 * 3. The "cannot access to legacy storage" issues with FileSystem in SDK 54.
 */

const CHUNK_SIZE = 2000; // Under 2048 to be safe

export const LargeSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    try {
      // First, check if this is a chunked key
      const manifestStr = await SecureStore.getItemAsync(`${key}_manifest`);
      if (manifestStr) {
        const manifest = JSON.parse(manifestStr);
        const chunks: string[] = [];
        for (let i = 0; i < manifest.count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk) chunks.push(chunk);
        }
        return chunks.join('');
      }
      
      // Fallback: Check for standard single key
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[Storage] getItem error for ${key}:`, e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try {
      // If value is small, just save it normally (and clear any old manifest)
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.deleteItemAsync(`${key}_manifest`);
        await SecureStore.setItemAsync(key, value);
        return;
      }

      // If value is large, chunk it
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.substring(i, i + CHUNK_SIZE));
      }

      // Save chunks
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }

      // Save manifest
      await SecureStore.setItemAsync(`${key}_manifest`, JSON.stringify({ count: chunks.length }));
      
      // Clear legacy single key if it exists
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`[Storage] setItem error for ${key}:`, e);
      throw e;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    try {
      const manifestStr = await SecureStore.getItemAsync(`${key}_manifest`);
      if (manifestStr) {
        const manifest = JSON.parse(manifestStr);
        for (let i = 0; i < manifest.count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_manifest`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`[Storage] removeItem error for ${key}:`, e);
    }
  },
};
