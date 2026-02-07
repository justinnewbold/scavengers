import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button } from '@/components';
import { db } from '@/lib/supabase';
import { useAuthStore, useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useRequireAuth } from '@/hooks';

export default function CreateHuntScreen() {
  const router = useRouter();
  useRequireAuth();
  const { user } = useAuthStore();
  const { setCurrentHunt } = useHuntStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a hunt title');
      return;
    }
    
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to create a hunt', [
        { text: 'Sign In', onPress: () => router.push('/auth/login') },
        { text: 'Cancel' },
      ]);
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { data: hunt, error } = await db.hunts.create({
        title: title.trim(),
        description: description.trim(),
        creator_id: user.id,
        is_public: isPublic,
        max_participants: 15,
        status: 'draft',
        settings: {
          allow_hints: true,
          points_for_hints: 5,
          require_photo_verification: false,
          allow_team_play: false,
          shuffle_challenges: false,
        },
      });
      
      if (error) throw error;
      
      if (hunt) {
        setCurrentHunt(hunt);
        router.replace(`/hunt/${hunt.id}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create hunt');
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create New Hunt</Text>
      <Text style={styles.subtitle}>
        Set up your scavenger hunt basics, then add challenges
      </Text>
      
      <Input
        label="Hunt Title *"
        placeholder="Give your hunt a catchy name"
        value={title}
        onChangeText={setTitle}
      />
      
      <Input
        label="Description"
        placeholder="What's this hunt about? Who is it for?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.descriptionInput}
      />
      
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Make Public</Text>
          <Text style={styles.toggleHelper}>
            Public hunts can be discovered by anyone
          </Text>
        </View>
        <Button
          title={isPublic ? 'Public' : 'Private'}
          onPress={() => setIsPublic(!isPublic)}
          variant={isPublic ? 'primary' : 'outline'}
          size="sm"
        />
      </View>
      
      <Button
        title={isCreating ? 'Creating...' : 'Create Hunt'}
        onPress={handleCreate}
        loading={isCreating}
        disabled={isCreating || !title.trim()}
        size="lg"
        style={styles.createButton}
      />
      
      <Text style={styles.note}>
        💡 Tip: After creating, you can add challenges manually or use AI to generate them
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  descriptionInput: { minHeight: 100, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.lg },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  toggleHelper: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  createButton: { marginTop: Spacing.lg },
  note: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 20 },
});
