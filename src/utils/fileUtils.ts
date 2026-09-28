import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

export const downloadAndShareFile = async (url: string, fileName: string) => {
  try {
    console.log(`Starting download for: ${fileName}`, url);
    let finalFileName = fileName;
    
    // 1. Extension Logic
    const urlExt = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    const hasExtension = fileName.includes('.');
    
    if (urlExt && (['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx'].includes(urlExt))) {
      const fileNameParts = fileName.split('.');
      const currentExt = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : null;
      
      if (!currentExt || (currentExt === 'pdf' && urlExt !== 'pdf')) {
        const baseName = fileNameParts.join('.');
        finalFileName = `${baseName || fileName.replace('.pdf', '')}.${urlExt}`;
      }
    }

    const fileUri = `${FileSystem.documentDirectory}${finalFileName}`;
    
    // 2. Download the file
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Server returned status ${downloadResult.status}`);
    }

    // 3. Sharing Logic
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Download Complete', 'File saved but sharing is not available on this device');
      return;
    }

    await Sharing.shareAsync(downloadResult.uri);
  } catch (error: any) {
    console.error('Download error detail:', error);

    // 4. DNS / Network Fallback: Try opening in browser
    if (error.message.includes('Unable to resolve host') || error.message.includes('hostname')) {
      Alert.alert(
        'Network Error',
        'Could not connect directly to the server. Would you like to open it in your browser instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open in Browser', 
            onPress: () => Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Could not open the browser.');
            })
          }
        ]
      );
    } else {
      Alert.alert('Error', 'Could not download or open the file. Please check your internet connection.');
    }
  }
};

/**
 * Saves a base64 string directly to user's device storage.
 * Automatically initiates direct system download to the device's Downloads folder
 * via Supabase attachment URL and Android DownloadManager, avoiding SAF folder restrictions.
 */
export const saveBase64FileToDevice = async ({
  base64Data,
  fileName,
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  dialogTitle = 'Download File',
  uti = 'com.microsoft.excel.xlsx'
}: {
  base64Data: string;
  fileName: string;
  mimeType?: string;
  dialogTitle?: string;
  uti?: string;
}) => {
  // 1. Always save a local copy in app documents directory
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const localUri = baseDir ? (baseDir.endsWith('/') ? `${baseDir}${fileName}` : `${baseDir}/${fileName}`) : '';
  if (localUri) {
    try {
      await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: 'base64' });
    } catch (writeErr) {
      console.warn('[Local File Write Warning]:', writeErr);
    }
  }

  // 2. Automatic Download directly to phone's Download folder via DownloadManager
  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `leads/${Date.now()}_${cleanFileName}`;
    const arrayBuffer = decode(base64Data);

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (!uploadError) {
      // Create signed URL with forced attachment download header
      const { data: signedData } = await supabase.storage
        .from('materials')
        .createSignedUrl(storagePath, 3600, { download: fileName });

      let downloadUrl = signedData?.signedUrl;
      if (!downloadUrl) {
        const { data: publicData } = supabase.storage
          .from('materials')
          .getPublicUrl(storagePath, { download: fileName });
        downloadUrl = publicData.publicUrl;
      }

      if (downloadUrl) {
        const canOpen = await Linking.canOpenURL(downloadUrl);
        if (canOpen) {
          await Linking.openURL(downloadUrl);
          return { success: true, method: 'download_url', uri: downloadUrl };
        }
      }
    } else {
      console.warn('[Storage Upload Warning, falling back to share sheet]:', uploadError);
    }
  } catch (downloadErr) {
    console.warn('[Auto-Download Storage Flow Warning]:', downloadErr);
  }

  // 3. Fallback: If offline or browser could not be opened, use system file share
  if (localUri && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(localUri, {
      mimeType,
      dialogTitle,
      UTI: uti
    });
    return { success: true, method: 'share', uri: localUri };
  } else if (localUri) {
    Alert.alert('Saved', `File saved to: ${localUri}`);
    return { success: true, method: 'local', uri: localUri };
  }
};

