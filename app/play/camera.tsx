import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Button } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function CameraScreen() {
  const { challengeId, challengeTitle, challengeDescription, mode } = useLocalSearchParams<{
    challengeId: string;
    challengeTitle: string;
    challengeDescription: string;
    /** 'solo' accepts the photo on-device; anything else goes to the server. */
    mode?: string;
  }>();
  const router = useRouter();
  const { submitChallenge, recordLocalVerification } = useHuntStore();
  const isSolo = mode === 'solo';

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [zoom, setZoom] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    approved: boolean;
    reason: string;
  } | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Permission</Text>
        <Text style={styles.permissionText}>
          We need camera access to verify photo challenges
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      // No base64 here - verifyPhoto reads the file when it needs it. Asking
      // for both keeps two full copies of the image in memory.
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (result) {
        setPhoto(result.uri);
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const retakePicture = () => {
    setPhoto(null);
    setVerificationResult(null);
  };

  const verifyPhoto = async () => {
    if (!photo) return;

    if (!challengeId) {
      Alert.alert('Error', 'Missing challenge details. Please go back and try again.');
      return;
    }

    setVerifying(true);

    try {
      // Solo hunts are generated on-device and never reach the server, so
      // there is no AI check available for them. Accept the photo on the
      // honour system - the player is only competing with themselves - and
      // say so plainly rather than implying it was checked.
      if (isSolo) {
        const soloResult = {
          verified: true,
          pointsAwarded: 0, // solo scoring is handled by the solo store
          reason: 'Photo captured.',
        };
        recordLocalVerification(challengeId, soloResult);
        setVerificationResult({ approved: true, reason: soloResult.reason });
        setTimeout(() => {
          Alert.alert('📸 Photo Captured', 'Challenge complete!', [
            { text: 'Continue', onPress: () => router.back() },
          ]);
        }, 500);
        return;
      }

      // Read photo as base64. The API expects a data URL.
      const base64 = await FileSystem.readAsStringAsync(photo, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // The server verifies (and awards points) - it holds the challenge's
      // verification_data, which clients never receive.
      const result = await submitChallenge(challengeId, 'photo', {
        photoData: `data:image/jpeg;base64,${base64}`,
      });

      if (result.error) {
        Alert.alert('Submission Failed', result.error, [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Go Back', onPress: () => router.back() },
        ]);
        return;
      }

      setVerificationResult({
        approved: result.verified,
        reason:
          result.reason ||
          (result.verified ? 'Nice work!' : 'That does not match the challenge.'),
      });

      if (result.verified) {
        setTimeout(() => {
          Alert.alert(
            '✅ Challenge Complete!',
            `${result.reason || 'Nice work!'}\n\n+${result.pointsAwarded} points`,
            [{ text: 'Awesome!', onPress: () => router.back() }]
          );
        }, 500);
      } else if (result.requiresManualReview) {
        Alert.alert(
          'Submitted for Review',
          'We could not verify this automatically, so it has been sent for manual review.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert(
        'Verification Failed',
        'Could not read the photo. Please retake it and try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const toggleFlash = () => {
    setFlash(current => current === 'off' ? 'on' : 'off');
  };

  const toggleCamera = () => {
    setFacing(current => current === 'back' ? 'front' : 'back');
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setZoom(current => {
      if (direction === 'in') return Math.min(1, current + 0.1);
      return Math.max(0, current - 0.1);
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: challengeTitle || 'Take Photo',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.container}>
        {/* Challenge Info */}
        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle}>{challengeTitle}</Text>
          <Text style={styles.challengeDescription} numberOfLines={2}>
            {challengeDescription}
          </Text>
        </View>

        {photo ? (
          // Photo Preview
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo }} style={styles.preview} />
            
            {verificationResult && (
              <View style={[
                styles.resultBadge,
                verificationResult.approved ? styles.resultSuccess : styles.resultFailed
              ]}>
                <Ionicons
                  name={verificationResult.approved ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.resultText}>
                  {verificationResult.approved ? 'Verified!' : 'Try Again'}
                </Text>
                <Text style={styles.resultReason}>{verificationResult.reason}</Text>
              </View>
            )}

            <View style={styles.previewActions}>
              <Button
                title="Retake"
                variant="outline"
                onPress={retakePicture}
                style={styles.previewButton}
              />
              <Button
                title={verifying ? 'Verifying...' : 'Verify Photo'}
                onPress={verifyPhoto}
                loading={verifying}
                disabled={verifying || verificationResult?.approved}
                style={styles.previewButton}
              />
            </View>
          </View>
        ) : (
          // Camera View
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flash}
              zoom={zoom}
            >
              {/* Camera Controls Overlay */}
              <View style={styles.cameraOverlay}>
                {/* Top Controls */}
                <View style={styles.topControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                    <Ionicons
                      name={flash === 'on' ? 'flash' : 'flash-off'}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
                    <Ionicons name="camera-reverse" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => adjustZoom('out')}
                  >
                    <Ionicons name="remove" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.zoomText}>{Math.round(zoom * 10)}x</Text>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => adjustZoom('in')}
                  >
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Capture Button */}
                <View style={styles.captureContainer}>
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  challengeInfo: {
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  challengeTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  challengeDescription: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: FontSizes.md,
    color: '#fff',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  resultBadge: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  resultSuccess: {
    backgroundColor: Colors.success,
  },
  resultFailed: {
    backgroundColor: Colors.error,
  },
  resultText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
  },
  resultReason: {
    width: '100%',
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  previewButton: {
    flex: 1,
  },
});
