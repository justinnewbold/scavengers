import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function QRScannerScreen() {
  const { challengeId: _challengeId, expectedCode } = useLocalSearchParams<{
    challengeId: string;
    expectedCode?: string;
  }>();
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="qr-code-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Permission</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan QR codes for challenges
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    Vibration.vibrate(100);
    
    // Check if scanned code matches expected (if provided)
    if (expectedCode) {
      if (data === expectedCode) {
        setScanResult('success');
        setTimeout(() => {
          Alert.alert(
            '✅ QR Code Verified!',
            'Challenge complete!',
            [{ text: 'Continue', onPress: () => router.back() }]
          );
        }, 500);
      } else {
        setScanResult('failure');
        setTimeout(() => {
          Alert.alert(
            '❌ Wrong QR Code',
            'This is not the correct QR code. Try again!',
            [{ text: 'OK', onPress: () => {
              setScanned(false);
              setScanResult(null);
            }}]
          );
        }, 500);
      }
    } else {
      // No expected code - just verify scan happened
      setScanResult('success');
      Alert.alert(
        '✅ QR Code Scanned!',
        `Code: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`,
        [{ text: 'Continue', onPress: () => router.back() }]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scan QR Code',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            {/* Top */}
            <View style={styles.overlaySection} />
            
            {/* Middle - with scanner frame */}
            <View style={styles.middleSection}>
              <View style={styles.overlaySection} />
              
              <View style={styles.scannerFrame}>
                {/* Corner decorations */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {/* Scanning line animation */}
                {!scanned && (
                  <View style={styles.scanLine} />
                )}
                
                {/* Result indicator */}
                {scanResult && (
                  <View style={[
                    styles.resultIndicator,
                    scanResult === 'success' ? styles.successIndicator : styles.failureIndicator
                  ]}>
                    <Ionicons 
                      name={scanResult === 'success' ? 'checkmark-circle' : 'close-circle'} 
                      size={64} 
                      color={scanResult === 'success' ? Colors.success : Colors.error} 
                    />
                  </View>
                )}
              </View>
              
              <View style={styles.overlaySection} />
            </View>
            
            {/* Bottom */}
            <View style={styles.overlaySection}>
              <View style={styles.instructions}>
                <Ionicons name="qr-code" size={24} color="#fff" />
                <Text style={styles.instructionText}>
                  Point your camera at the QR code
                </Text>
              </View>
            </View>
          </View>
        </CameraView>

        {/* Manual entry option */}
        <View style={styles.footer}>
          <Button
            title="Enter Code Manually"
            variant="outline"
            onPress={() => {
              Alert.prompt(
                'Enter Code',
                'Type the code shown below the QR:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Submit',
                    onPress: (code) => {
                      const trimmedCode = code?.trim() || '';
                      if (!trimmedCode) {
                        Alert.alert('Empty Code', 'Please enter a code');
                        return;
                      }
                      if (expectedCode && trimmedCode === expectedCode) {
                        Alert.alert('✅ Correct!', 'Challenge complete!', [
                          { text: 'Continue', onPress: () => router.back() }
                        ]);
                      } else {
                        Alert.alert('❌ Incorrect', 'That code is not correct.');
                      }
                    }
                  },
                ],
                'plain-text'
              );
            }}
          />
        </View>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: 280,
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: Colors.primary,
    top: '50%',
  },
  resultIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  successIndicator: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  failureIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  instructionText: {
    color: '#fff',
    fontSize: FontSizes.md,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});
