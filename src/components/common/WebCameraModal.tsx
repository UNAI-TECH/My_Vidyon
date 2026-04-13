import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { X, Camera, RefreshCw } from 'lucide-react-native';
import { theme } from '../../theme';

interface WebCameraModalProps {
  visible: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export const WebCameraModal: React.FC<WebCameraModalProps> = ({ visible, onCapture, onClose }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [visible]);

  const startCamera = async (deviceId?: string) => {
    setError(null);
    
    // Attempt to clear previous stream tracks to prevent locked resources
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Enumerate devices after permission granted to get labels
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      if (!deviceId && videoDevices.length > 0) {
        const activeTrack = mediaStream.getVideoTracks()[0];
        const activeDevice = videoDevices.find(d => d.label === activeTrack.label);
        setSelectedDeviceId(activeDevice ? activeDevice.deviceId : videoDevices[0].deviceId);
      } else if (deviceId) {
        setSelectedDeviceId(deviceId);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUri);
        onClose();
      }
    }
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Take Photo</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {devices.length > 1 && (
            <View style={styles.devicePicker}>
              <Text style={styles.devicePickerLabel}>Switch Camera:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {devices.map(device => (
                  <TouchableOpacity 
                    key={device.deviceId}
                    style={[
                      styles.deviceChip, 
                      selectedDeviceId === device.deviceId && styles.deviceChipActive
                    ]}
                    onPress={() => handleDeviceChange(device.deviceId)}
                  >
                    <Text style={[
                      styles.deviceChipText,
                      selectedDeviceId === device.deviceId && styles.deviceChipTextActive
                    ]}>
                      {device.label || `Camera ${devices.indexOf(device) + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.cameraContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => startCamera()}>
                  <RefreshCw size={20} color="white" />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {React.createElement('video', {
                  ref: videoRef,
                  autoPlay: true,
                  playsInline: true,
                  style: { width: '100%', height: '100%', objectFit: 'cover' }
                })}
                {React.createElement('canvas', {
                  ref: canvasRef,
                  style: { display: 'none' }
                })}
              </>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={!!error}>
              <View style={styles.captureInner}>
                <Camera size={28} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  devicePicker: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  devicePickerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  deviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  deviceChipText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  deviceChipTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#DBEAFE',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
