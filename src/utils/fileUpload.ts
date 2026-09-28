import { Platform } from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { File as ExpoFile } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

export function getMimeType(fileNameOrUri: string, fallback: string = 'image/jpeg'): string {
  const clean = fileNameOrUri.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return fallback;
  }
}

/**
 * Robustly uploads a local or web file to Supabase Storage as an ArrayBuffer.
 * This avoids React Native's FormData/Blob text/plain coercion and guarantees
 * the exact Content-Type required by bucket allowed_mime_types.
 */
export async function uploadToSupabaseStorage(params: {
  bucket: string;
  path: string;
  uri: string;
  mimeType?: string;
  upsert?: boolean;
}): Promise<{ publicUrl: string }> {
  const { bucket, path, uri, upsert = true } = params;
  const determinedMime = params.mimeType || getMimeType(uri);

  try {
    let arrayBuffer: ArrayBuffer;

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      arrayBuffer = await blob.arrayBuffer();
    } else {
      // Native (Android/iOS): Use expo-file-system/legacy or new File API
      try {
        const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
          encoding: (LegacyFileSystem as any).EncodingType?.Base64 || 'base64',
        });
        arrayBuffer = decode(base64);
      } catch (legacyErr) {
        try {
          const file = new ExpoFile(uri);
          arrayBuffer = await file.arrayBuffer();
        } catch (fileErr) {
          const res = await fetch(uri);
          const b = await res.blob();
          arrayBuffer = await b.arrayBuffer();
        }
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: determinedMime,
        upsert,
      });

    if (uploadError) {
      console.error(`[Supabase Storage Upload Error (${bucket}/${path})]:`, uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { publicUrl };
  } catch (err: any) {
    console.error(`[Upload Service Failure]:`, err);
    throw err;
  }
}

/**
 * Safely resolves any image URI (file://, http://, https://, or data:)
 * into an inline base64 Data URL (e.g. data:image/png;base64,...).
 * This ensures Print / WebView / PDF generators can embed the image
 * without sandboxing, CORS, or local file access permission issues.
 */
export async function resolveImageToBase64(uri?: string | null): Promise<string | null> {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image/')) return trimmed;

  try {
    if (trimmed.startsWith('file://')) {
      const mime = getMimeType(trimmed, 'image/png');
      try {
        const base64 = await LegacyFileSystem.readAsStringAsync(trimmed, {
          encoding: (LegacyFileSystem as any).EncodingType?.Base64 || 'base64',
        });
        if (base64) {
          return `data:${mime};base64,${base64}`;
        }
      } catch (legacyErr) {
        console.warn('[resolveImageToBase64] Could not read file URI into base64:', trimmed, legacyErr);
        return null;
      }
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const res = await fetch(trimmed);
        if (!res.ok) {
          console.warn('[resolveImageToBase64] Image fetch status:', res.status, trimmed);
          return null;
        }
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(typeof reader.result === 'string' ? reader.result : null);
          };
          reader.onerror = () => {
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      } catch (netErr) {
        console.warn('[resolveImageToBase64] Fetching remote image failed, returning null:', netErr);
        return null;
      }
    }
  } catch (err) {
    console.warn('[resolveImageToBase64] Unexpected error resolving image:', err);
    return null;
  }

  return trimmed;
}
