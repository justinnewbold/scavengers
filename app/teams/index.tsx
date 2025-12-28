import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_by: string;
  is_member: boolean;
  role?: 'owner' | 'admin' | 'member';
}

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export default function TeamsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, session } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !session?.access_token) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', `Team created! Share code: ${data.team.join_code}`);
        setShowCreate(false);
        setNewTeamName('');
        setNewTeamDesc('');
        fetchTeams();
      } else {
        Alert.alert('Error', 'Failed to create team');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim() || !session?.access_token) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ join_code: joinCode.trim() }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Joined team successfully!');
        setShowJoin(false);
        setJoinCode('');
        fetchTeams();
      } else {
        Alert.alert('Error', 'Invalid team code');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="people-outline" size={80} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>{t('teams.title')}</Text>
        <Text style={styles.authText}>Sign in to create or join teams</Text>
        <Button title={t('auth.signIn')} onPress={() => router.push('/auth/login')} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTeams(); }} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('teams.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title={t('teams.createTeam')}
          onPress={() => setShowCreate(true)}
          style={styles.actionButton}
          icon={<Ionicons name="add" size={20} color={Colors.text} />}
        />
        <Button
          title={t('teams.joinTeam')}
          onPress={() => setShowJoin(true)}
          variant="outline"
          style={styles.actionButton}
          icon={<Ionicons name="enter" size={20} color={Colors.primary} />}
        />
      </View>

      {/* Create Team Modal */}
      {showCreate && (
        <Card style={styles.modal}>
          <Text style={styles.modalTitle}>{t('teams.createTeam')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Team Name"
            placeholderTextColor={Colors.textTertiary}
            value={newTeamName}
            onChangeText={setNewTeamName}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={newTeamDesc}
            onChangeText={setNewTeamDesc}
            multiline
            numberOfLines={3}
          />
          <View style={styles.modalActions}>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setShowCreate(false)} />
            <Button title={t('common.save')} onPress={handleCreateTeam} disabled={!newTeamName.trim()} />
          </View>
        </Card>
      )}

      {/* Join Team Modal */}
      {showJoin && (
        <Card style={styles.modal}>
          <Text style={styles.modalTitle}>{t('teams.joinTeam')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter team code"
            placeholderTextColor={Colors.textTertiary}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
          />
          <View style={styles.modalActions}>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setShowJoin(false)} />
            <Button title="Join" onPress={handleJoinTeam} disabled={!joinCode.trim()} />
          </View>
        </Card>
      )}

      {/* Teams List */}
      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : teams.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={60} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>{t('teams.noTeams')}</Text>
          <Text style={styles.emptySubtext}>Create or join a team to collaborate on hunts</Text>
        </View>
      ) : (
        <View style={styles.teamsList}>
          {teams.map((team) => (
            <TouchableOpacity key={team.id} onPress={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}>
              <Card style={[styles.teamCard, selectedTeam?.id === team.id && styles.teamCardSelected]}>
                <View style={styles.teamHeader}>
                  <View style={styles.teamAvatar}>
                    <Text style={styles.teamAvatarText}>{team.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamMembers}>{t('teams.members', { count: team.member_count })}</Text>
                  </View>
                  {team.role && (
                    <View style={[styles.roleBadge, team.role === 'owner' && styles.ownerBadge]}>
                      <Text style={styles.roleText}>{team.role}</Text>
                    </View>
                  )}
                </View>
                {team.description && (
                  <Text style={styles.teamDesc} numberOfLines={2}>{team.description}</Text>
                )}
                {selectedTeam?.id === team.id && (
                  <View style={styles.teamActions}>
                    <Button title="View Members" size="sm" variant="outline" onPress={() => {}} />
                    {team.role === 'owner' && (
                      <Button title="Manage" size="sm" onPress={() => {}} />
                    )}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: { padding: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  placeholder: { width: 32 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  actionButton: { flex: 1 },
  modal: { padding: Spacing.lg, marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xl },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSizes.lg, color: Colors.text, marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  teamsList: { gap: Spacing.md },
  teamCard: { padding: Spacing.md },
  teamCardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  teamInfo: { flex: 1 },
  teamName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  teamMembers: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  roleBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  ownerBadge: { backgroundColor: Colors.warning },
  roleText: { fontSize: FontSizes.xs, color: Colors.text, fontWeight: '500' },
  teamDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  teamActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  authTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  authText: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
