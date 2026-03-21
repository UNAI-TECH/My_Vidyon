import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const downloadAndShareFile = async (url: string, fileName: string) => {
  try {
    let finalFileName = fileName;
    
    // If the fileName is generic or doesn't have an extension that matches the URL
    // try to get the extension from the URL itself
    const urlExt = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    const hasExtension = fileName.includes('.');
    
    if (urlExt && (['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx'].includes(urlExt))) {
      const fileNameParts = fileName.split('.');
      const currentExt = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : null;
      
      // If no extension or extension is 'pdf' but URL says it's something else
      if (!currentExt || (currentExt === 'pdf' && urlExt !== 'pdf')) {
        const baseName = fileNameParts.join('.');
        finalFileName = `${baseName || fileName.replace('.pdf', '')}.${urlExt}`;
      }
    }

    const fileUri = `${FileSystem.documentDirectory}${finalFileName}`;
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download file');
    }

    // Check if sharing is available
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return;
    }

    // Share/Open the file
    await Sharing.shareAsync(downloadResult.uri);
  } catch (error: any) {
    console.error('Download error:', error);
    Alert.alert('Error', 'Could not download or open the file');
  }
};
