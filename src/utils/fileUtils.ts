import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

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
