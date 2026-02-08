import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Share,
  Alert,
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, BottomSheet, SegmentedControl, Skeleton } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAuthStore } from '@/store';

interface Photo {
  id: string;
  photo_url: string;
  caption?: string;
  challenge_title: string;
  hunt_title: string;
  created_at: string;
  is_favorite: boolean;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - Spacing.md * 3) / 2;

export default function GalleryScreen() {
  const router = useRouter();
  const { user, session } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCaptionSheet, setShowCaptionSheet] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [selectedForShare, setSelectedForShare] = useState<string[]>([]);
  const [shareMode, setShareMode] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [showFavoritesOnly]);

  const fetchPhotos = async () => {
    if (!session?.access_token) return;

    try {
      const params = new URLSearchParams();
      if (showFavoritesOnly) params.append('favorites', 'true');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/gallery?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleFavorite = async (photo: Photo) => {
    if (!session?.access_token) return;

    const newFavoriteStatus = !photo.is_favorite;

    // Optimistic update
    setPhotos(photos.map(p =>
      p.id === photo.id ? { ...p, is_favorite: newFavoriteStatus } : p
    ));

    if (selectedPhoto?.id === photo.id) {
      setSelectedPhoto({ ...selectedPhoto, is_favorite: newFavoriteStatus });
    }

    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gallery`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photo_id: photo.id, is_favorite: newFavoriteStatus }),
      });
    } catch (_error) {
      // Revert on error
      setPhotos(photos.map(p =>
        p.id === photo.id ? { ...p, is_favorite: !newFavoriteStatus } : p
      ));
    }
  };

  const saveCaption = async () => {
    if (!session?.access_token || !selectedPhoto) return;

    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gallery`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photo_id: selectedPhoto.id, caption: captionText }),
      });

      setPhotos(photos.map(p =>
        p.id === selectedPhoto.id ? { ...p, caption: captionText } : p
      ));
      setSelectedPhoto({ ...selectedPhoto, caption: captionText });

      setShowCaptionSheet(false);
    } catch (_error) {
      Alert.alert('Error', 'Failed to save caption');
    }
  };

  const sharePhoto = async (photo: Photo) => {
    try {
      await Share.share({
        message: `Check out my scavenger hunt photo from "${photo.hunt_title}"! 📸🎯`,
        url: photo.photo_url,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/gallery/${photo.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== photo.id));
        if (selectedPhoto?.id === photo.id) {
          setSelectedPhoto(null);
        }
      } else {
        Alert.alert('Error', 'Failed to delete photo');
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const showPhotoActions = (photo: Photo) => {
    const options = ['Cancel', 'Share Photo', 'Toggle Favorite', 'Edit Caption', 'Delete Photo'];
    const cancelButtonIndex = 0;
    const destructiveButtonIndex = 4;

    const handleAction = (buttonIndex: number | undefined) => {
      switch (buttonIndex) {
        case 1:
          sharePhoto(photo);
          break;
        case 2:
          toggleFavorite(photo);
          break;
        case 3:
          setSelectedPhoto(photo);
          setCaptionText(photo.caption || '');
          setShowCaptionSheet(true);
          break;
        case 4:
          Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(photo) },
            ]
          );
          break;
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        handleAction
      );
    } else {
      Alert.alert(
        'Photo Actions',
        undefined,
        [
          { text: 'Share Photo', onPress: () => handleAction(1) },
          { text: 'Toggle Favorite', onPress: () => handleAction(2) },
          { text: 'Edit Caption', onPress: () => handleAction(3) },
          { text: 'Delete Photo', style: 'destructive', onPress: () => handleAction(4) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const createMemory = async () => {
    if (selectedForShare.length < 2) {
      Alert.alert('Select Photos', 'Please select at least 2 photos to create a memory.');
      return;
    }

    if (!session?.access_token) return;

    try {
      const huntId = photos.find(p => selectedForShare.includes(p.id))?.hunt_title;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          hunt_id: huntId,
          photo_ids: selectedForShare,
          type: 'collage',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Memory Created! 🎉',
          'Your hunt memory has been created. Share it with friends!',
          [
            { text: 'Share', onPress: () => Share.share({ url: data.memory.share_url }) },
            { text: 'Done', style: 'cancel' },
          ]
        );
        setShareMode(false);
        setSelectedForShare([]);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to create memory');
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    if (selectedForShare.includes(photoId)) {
      setSelectedForShare(selectedForShare.filter(id => id !== photoId));
    } else {
      setSelectedForShare([...selectedForShare, photoId]);
    }
  };

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="images-outline" size={80} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>Photo Gallery</Text>
        <Text style={styles.authText}>Sign in to view your hunt photos</Text>
        <Button title="Sign In" onPress={() => router.push('/auth/login')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Photo Gallery</Text>
        <TouchableOpacity onPress={() => setShareMode(!shareMode)}>
          <Ionicons
            name={shareMode ? 'close' : 'share-social'}
            size={24}
            color={shareMode ? Colors.error : Colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <SegmentedControl
        segments={['All Photos', 'Favorites']}
        selectedIndex={showFavoritesOnly ? 1 : 0}
        onChange={(index) => setShowFavoritesOnly(index === 1)}
        style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.md }}
      />

      {shareMode && selectedForShare.length > 0 && (
        <View style={styles.shareBar}>
          <Text style={styles.shareText}>{selectedForShare.length} selected</Text>
          <Button title="Create Memory" size="sm" onPress={createMemory} />
        </View>
      )}

      {/* Photo Grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPhotos(); }} />
        }
      >
        {loading ? (
          <View style={styles.photoSkeletonGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.photoSkeletonCard}>
                <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={12} />
              </View>
            ))}
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={60} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptyText}>
              Complete challenges that require photos to build your gallery!
            </Text>
          </View>
        ) : (
          photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoCard}
              onPress={() => shareMode ? togglePhotoSelection(photo.id) : setSelectedPhoto(photo)}
              onLongPress={() => showPhotoActions(photo)}
              delayLongPress={200}
            >
              <Image source={{ uri: photo.photo_url }} style={styles.photo} />
              {photo.is_favorite && (
                <View style={styles.favoriteIndicator}>
                  <Ionicons name="heart" size={16} color="#EF4444" />
                </View>
              )}
              {shareMode && (
                <View style={[
                  styles.selectionOverlay,
                  selectedForShare.includes(photo.id) && styles.selected
                ]}>
                  {selectedForShare.includes(photo.id) && (
                    <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
                  )}
                </View>
              )}
              <View style={styles.photoInfo}>
                <Text style={styles.challengeTitle} numberOfLines={1}>
                  {photo.challenge_title}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Photo Detail Modal */}
      <Modal visible={!!selectedPhoto} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => { setSelectedPhoto(null); setShowCaptionSheet(false); }}
            >
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>

            {selectedPhoto && (
              <>
                <TouchableOpacity
                  activeOpacity={1}
                  onLongPress={() => showPhotoActions(selectedPhoto)}
                  delayLongPress={200}
                >
                  <Image source={{ uri: selectedPhoto.photo_url }} style={styles.modalPhoto} />
                </TouchableOpacity>

                <View style={styles.modalInfo}>
                  <Text style={styles.modalHuntTitle}>{selectedPhoto.hunt_title}</Text>
                  <Text style={styles.modalChallengeTitle}>{selectedPhoto.challenge_title}</Text>

                  <TouchableOpacity onPress={() => { setCaptionText(selectedPhoto.caption || ''); setShowCaptionSheet(true); }}>
                    <Text style={styles.caption}>
                      {selectedPhoto.caption || 'Tap to add a caption...'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => toggleFavorite(selectedPhoto)}>
                      <Ionicons
                        name={selectedPhoto.is_favorite ? 'heart' : 'heart-outline'}
                        size={24}
                        color={selectedPhoto.is_favorite ? '#EF4444' : Colors.text}
                      />
                      <Text style={styles.actionText}>Favorite</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => sharePhoto(selectedPhoto)}>
                      <Ionicons name="share-outline" size={24} color={Colors.text} />
                      <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Caption Edit Bottom Sheet */}
      <BottomSheet
        visible={showCaptionSheet}
        onClose={() => setShowCaptionSheet(false)}
        title="Edit Caption"
        snapPoints={[0.4]}
      >
        <TextInput
          style={styles.captionInput}
          value={captionText}
          onChangeText={setCaptionText}
          placeholder="Add a caption..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={300}
          autoFocus
        />
        <View style={styles.captionActions}>
          <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowCaptionSheet(false)} />
          <Button title="Save" size="sm" onPress={saveCaption} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  shareBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  shareText: { fontSize: FontSizes.md, color: Colors.text },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photo: { width: '100%', height: '100%' },
  favoriteIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 100,
    padding: 4,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: 'rgba(139, 92, 246, 0.5)' },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  challengeTitle: { fontSize: FontSizes.xs, color: Colors.text },
  photoSkeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    width: '100%',
  },
  photoSkeletonCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyState: { alignItems: 'center', padding: Spacing.xxl, width: '100%' },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  modalContent: { flex: 1 },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm,
  },
  modalPhoto: { width: '100%', height: '60%', resizeMode: 'contain' },
  modalInfo: { padding: Spacing.lg },
  modalHuntTitle: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  modalChallengeTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.xs },
  caption: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.md, fontStyle: 'italic' },
  captionInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  captionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
  },
  actionButton: { alignItems: 'center', gap: Spacing.xs },
  actionText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  authTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  authText: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
