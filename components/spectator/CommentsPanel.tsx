import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { LiveComment } from '@/types/liveMultiplayer';

// Comments panel
export const CommentsPanel = memo(function CommentsPanel({
  comments,
  onSend,
}: {
  comments: LiveComment[];
  onSend: (content: string) => void;
}) {
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [comments.length]);

  return (
    <View style={styles.commentsPanel}>
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentAuthor}>{item.displayName}</Text>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        )}
        style={styles.commentsList}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.commentInput}>
        <TextInput
          style={styles.input}
          placeholder="Say something..."
          placeholderTextColor={Colors.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  commentsPanel: {
    position: 'absolute',
    bottom: 70,
    left: Spacing.md,
    right: Spacing.md,
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: Spacing.sm,
  },
  commentsList: {
    maxHeight: 140,
  },
  comment: {
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  commentText: {
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  sendButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
