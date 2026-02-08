import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTeamStore } from '../teamStore';
import type { Team, TeamMember, TeamInvite } from '@/types/teams';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

// Mock data
const mockTeam: Team = {
  id: 'team-1',
  name: 'Alpha Squad',
  description: 'A test team',
  inviteCode: 'ALPHA123',
  isPublic: false,
  maxMembers: 10,
  huntsCompleted: 5,
  totalPoints: 1200,
  winCount: 3,
  memberCount: 4,
  createdBy: 'user-1',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

const mockTeam2: Team = {
  id: 'team-2',
  name: 'Beta Crew',
  description: 'Another test team',
  inviteCode: 'BETA456',
  isPublic: true,
  maxMembers: 8,
  huntsCompleted: 2,
  totalPoints: 600,
  winCount: 1,
  memberCount: 3,
  createdBy: 'user-2',
  createdAt: '2025-02-01T00:00:00Z',
  updatedAt: '2025-02-10T00:00:00Z',
};

const mockMember: TeamMember = {
  id: 'member-1',
  odteamId: 'team-1',
  oduserId: 'user-1',
  teamId: 'team-1',
  userId: 'user-1',
  displayName: 'Alice',
  role: 'owner',
  status: 'active',
  huntRole: 'captain',
  huntsParticipated: 5,
  pointsContributed: 800,
  challengesCompleted: 20,
  joinedAt: '2025-01-01T00:00:00Z',
};

const mockMember2: TeamMember = {
  id: 'member-2',
  odteamId: 'team-1',
  oduserId: 'user-2',
  teamId: 'team-1',
  userId: 'user-2',
  displayName: 'Bob',
  role: 'member',
  status: 'active',
  huntRole: 'scout',
  huntsParticipated: 3,
  pointsContributed: 400,
  challengesCompleted: 12,
  joinedAt: '2025-01-05T00:00:00Z',
};

const mockInvite: TeamInvite = {
  id: 'invite-1',
  teamId: 'team-1',
  teamName: 'Alpha Squad',
  invitedBy: 'user-1',
  invitedByName: 'Alice',
  inviteCode: 'INV-ABC',
  expiresAt: '2025-12-31T00:00:00Z',
  maxUses: 10,
  usedCount: 1,
};

// Helper to mock authenticated fetch
const mockAuthToken = (token: string = 'mock-token') => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);
};

const mockNoAuthToken = () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
};

beforeEach(() => {
  useTeamStore.setState({
    teams: [],
    currentTeam: null,
    members: [],
    invites: [],
    teamHunts: [],
    stats: null,
    chatRooms: [],
    currentChat: [],
    isLoading: false,
    error: null,
  });
  (global.fetch as jest.Mock).mockReset();
  (AsyncStorage.getItem as jest.Mock).mockClear();
});

describe('useTeamStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useTeamStore.getState();

      expect(state.teams).toEqual([]);
      expect(state.currentTeam).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.invites).toEqual([]);
      expect(state.teamHunts).toEqual([]);
      expect(state.stats).toBeNull();
      expect(state.chatRooms).toEqual([]);
      expect(state.currentChat).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchTeams', () => {
    it('should fetch teams successfully', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ teams: [mockTeam, mockTeam2] }),
      });

      await useTeamStore.getState().fetchTeams();

      const state = useTeamStore.getState();
      expect(state.teams).toHaveLength(2);
      expect(state.teams[0]).toEqual(mockTeam);
      expect(state.teams[1]).toEqual(mockTeam2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams`,
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });

    it('should set isLoading during fetchTeams', async () => {
      let loadingDuringFetch = false;

      mockAuthToken();
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useTeamStore.getState().isLoading;
        return {
          ok: true,
          json: async () => ({ teams: [] }),
        };
      });

      await useTeamStore.getState().fetchTeams();

      expect(loadingDuringFetch).toBe(true);
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should handle fetchTeams failure when response is not ok', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await useTeamStore.getState().fetchTeams();

      const state = useTeamStore.getState();
      expect(state.teams).toEqual([]);
      expect(state.error).toBe('Failed to fetch teams');
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetchTeams failure when not authenticated', async () => {
      mockNoAuthToken();

      await useTeamStore.getState().fetchTeams();

      const state = useTeamStore.getState();
      expect(state.error).toBe('Not authenticated');
      expect(state.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchTeam', () => {
    it('should fetch a single team and set it as currentTeam', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: mockTeam }),
      });

      const result = await useTeamStore.getState().fetchTeam('team-1');

      expect(result).toEqual(mockTeam);
      expect(useTeamStore.getState().currentTeam).toEqual(mockTeam);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1`,
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });

    it('should return null on fetchTeam failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await useTeamStore.getState().fetchTeam('team-999');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Failed to fetch team');
    });
  });

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: mockTeam }),
      });

      const result = await useTeamStore.getState().createTeam('Alpha Squad', 'A test team', false);

      expect(result).toEqual(mockTeam);
      const state = useTeamStore.getState();
      expect(state.teams).toContainEqual(mockTeam);
      expect(state.currentTeam).toEqual(mockTeam);
      expect(state.isLoading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ name: 'Alpha Squad', description: 'A test team', isPublic: false }),
        })
      );
    });

    it('should default isPublic to false when not provided', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: mockTeam }),
      });

      await useTeamStore.getState().createTeam('Alpha Squad');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams`,
        expect.objectContaining({
          body: JSON.stringify({ name: 'Alpha Squad', description: undefined, isPublic: false }),
        })
      );
    });

    it('should append newly created team to existing teams list', async () => {
      useTeamStore.setState({ teams: [mockTeam] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: mockTeam2 }),
      });

      await useTeamStore.getState().createTeam('Beta Crew', 'Another test team', true);

      expect(useTeamStore.getState().teams).toHaveLength(2);
      expect(useTeamStore.getState().teams[1]).toEqual(mockTeam2);
    });

    it('should return null on createTeam failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await useTeamStore.getState().createTeam('Fail Team');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Failed to create team');
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading during createTeam', async () => {
      let loadingDuringCreate = false;

      mockAuthToken();
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringCreate = useTeamStore.getState().isLoading;
        return {
          ok: true,
          json: async () => ({ team: mockTeam }),
        };
      });

      await useTeamStore.getState().createTeam('Alpha Squad');

      expect(loadingDuringCreate).toBe(true);
      expect(useTeamStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateTeam', () => {
    it('should update a team successfully', async () => {
      const updatedTeam = { ...mockTeam, name: 'Alpha Squad v2', description: 'Updated description' };
      useTeamStore.setState({ teams: [mockTeam, mockTeam2], currentTeam: mockTeam });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: updatedTeam }),
      });

      await useTeamStore.getState().updateTeam('team-1', { name: 'Alpha Squad v2', description: 'Updated description' });

      const state = useTeamStore.getState();
      expect(state.teams[0].name).toBe('Alpha Squad v2');
      expect(state.currentTeam?.name).toBe('Alpha Squad v2');
      // The other team should remain unchanged
      expect(state.teams[1]).toEqual(mockTeam2);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Alpha Squad v2', description: 'Updated description' }),
        })
      );
    });

    it('should not update currentTeam if it is a different team', async () => {
      const updatedTeam2 = { ...mockTeam2, name: 'Beta Crew v2' };
      useTeamStore.setState({ teams: [mockTeam, mockTeam2], currentTeam: mockTeam });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: updatedTeam2 }),
      });

      await useTeamStore.getState().updateTeam('team-2', { name: 'Beta Crew v2' });

      const state = useTeamStore.getState();
      expect(state.currentTeam).toEqual(mockTeam); // unchanged
      expect(state.teams[1].name).toBe('Beta Crew v2');
    });

    it('should set error on updateTeam failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().updateTeam('team-1', { name: 'Fail' });

      expect(useTeamStore.getState().error).toBe('Failed to update team');
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team and remove it from the list', async () => {
      useTeamStore.setState({ teams: [mockTeam, mockTeam2], currentTeam: mockTeam });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().deleteTeam('team-1');

      const state = useTeamStore.getState();
      expect(state.teams).toHaveLength(1);
      expect(state.teams[0].id).toBe('team-2');
      expect(state.currentTeam).toBeNull(); // cleared since deleted team was current
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should not clear currentTeam when deleting a different team', async () => {
      useTeamStore.setState({ teams: [mockTeam, mockTeam2], currentTeam: mockTeam });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().deleteTeam('team-2');

      const state = useTeamStore.getState();
      expect(state.teams).toHaveLength(1);
      expect(state.currentTeam).toEqual(mockTeam); // unchanged
    });

    it('should set error on deleteTeam failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().deleteTeam('team-1');

      expect(useTeamStore.getState().error).toBe('Failed to delete team');
    });
  });

  describe('leaveTeam', () => {
    it('should leave a team and remove it from the list', async () => {
      useTeamStore.setState({ teams: [mockTeam, mockTeam2], currentTeam: mockTeam });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().leaveTeam('team-1');

      const state = useTeamStore.getState();
      expect(state.teams).toHaveLength(1);
      expect(state.teams[0].id).toBe('team-2');
      expect(state.currentTeam).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/leave`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error on leaveTeam failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().leaveTeam('team-1');

      expect(useTeamStore.getState().error).toBe('Failed to leave team');
    });
  });

  describe('fetchMembers', () => {
    it('should fetch members for a team', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [mockMember, mockMember2] }),
      });

      await useTeamStore.getState().fetchMembers('team-1');

      const state = useTeamStore.getState();
      expect(state.members).toHaveLength(2);
      expect(state.members[0]).toEqual(mockMember);
      expect(state.members[1]).toEqual(mockMember2);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/members`,
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });

    it('should set error on fetchMembers failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().fetchMembers('team-1');

      expect(useTeamStore.getState().error).toBe('Failed to fetch members');
    });

    it('should set error when not authenticated', async () => {
      mockNoAuthToken();

      await useTeamStore.getState().fetchMembers('team-1');

      expect(useTeamStore.getState().error).toBe('Not authenticated');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('inviteMember', () => {
    it('should invite a member and add invite to the list', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invite: mockInvite }),
      });

      const result = await useTeamStore.getState().inviteMember('team-1', 'bob@example.com');

      expect(result).toEqual(mockInvite);
      expect(useTeamStore.getState().invites).toContainEqual(mockInvite);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/invites`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'bob@example.com' }),
        })
      );
    });

    it('should append to existing invites', async () => {
      const existingInvite: TeamInvite = { ...mockInvite, id: 'invite-0', inviteCode: 'OLD-INV' };
      useTeamStore.setState({ invites: [existingInvite] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invite: mockInvite }),
      });

      await useTeamStore.getState().inviteMember('team-1', 'bob@example.com');

      expect(useTeamStore.getState().invites).toHaveLength(2);
    });

    it('should return null on inviteMember failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await useTeamStore.getState().inviteMember('team-1', 'fail@example.com');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Failed to send invite');
    });
  });

  describe('generateInviteLink', () => {
    it('should generate an invite link', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ inviteLink: 'https://scavengers.app/join/ABC123' }),
      });

      const result = await useTeamStore.getState().generateInviteLink('team-1', 5);

      expect(result).toBe('https://scavengers.app/join/ABC123');
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/invites/link`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ maxUses: 5 }),
        })
      );
    });

    it('should default maxUses to 10', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ inviteLink: 'https://scavengers.app/join/XYZ' }),
      });

      await useTeamStore.getState().generateInviteLink('team-1');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/invites/link`,
        expect.objectContaining({
          body: JSON.stringify({ maxUses: 10 }),
        })
      );
    });

    it('should return null on generateInviteLink failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await useTeamStore.getState().generateInviteLink('team-1');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Failed to generate invite link');
    });
  });

  describe('joinWithCode', () => {
    it('should join a team with an invite code', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ team: mockTeam }),
      });

      const result = await useTeamStore.getState().joinWithCode('ALPHA123');

      expect(result).toEqual(mockTeam);
      const state = useTeamStore.getState();
      expect(state.teams).toContainEqual(mockTeam);
      expect(state.currentTeam).toEqual(mockTeam);
      expect(state.isLoading).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/join`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ inviteCode: 'ALPHA123' }),
        })
      );
    });

    it('should set isLoading during joinWithCode', async () => {
      let loadingDuringJoin = false;

      mockAuthToken();
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringJoin = useTeamStore.getState().isLoading;
        return {
          ok: true,
          json: async () => ({ team: mockTeam }),
        };
      });

      await useTeamStore.getState().joinWithCode('ALPHA123');

      expect(loadingDuringJoin).toBe(true);
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should handle joinWithCode failure with server error message', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invite code expired' }),
      });

      const result = await useTeamStore.getState().joinWithCode('EXPIRED');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Invite code expired');
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should use default error message when server error is missing', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const result = await useTeamStore.getState().joinWithCode('INVALID');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Failed to join team');
    });

    it('should return null when not authenticated', async () => {
      mockNoAuthToken();

      const result = await useTeamStore.getState().joinWithCode('CODE');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Not authenticated');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the list', async () => {
      useTeamStore.setState({ members: [mockMember, mockMember2] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().removeMember('team-1', 'user-2');

      const state = useTeamStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members[0].userId).toBe('user-1');
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/members/user-2`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should set error on removeMember failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().removeMember('team-1', 'user-2');

      expect(useTeamStore.getState().error).toBe('Failed to remove member');
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      useTeamStore.setState({ members: [mockMember, mockMember2] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().updateMemberRole('team-1', 'user-2', 'admin');

      const state = useTeamStore.getState();
      const updatedMember = state.members.find(m => m.userId === 'user-2');
      expect(updatedMember?.role).toBe('admin');
      // Owner should be unaffected
      const ownerMember = state.members.find(m => m.userId === 'user-1');
      expect(ownerMember?.role).toBe('owner');
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/members/user-2/role`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'admin' }),
        })
      );
    });

    it('should set error on updateMemberRole failure', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useTeamStore.getState().updateMemberRole('team-1', 'user-2', 'admin');

      expect(useTeamStore.getState().error).toBe('Failed to update role');
    });
  });

  describe('error handling', () => {
    it('should handle network errors on fetchTeams', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useTeamStore.getState().fetchTeams();

      expect(useTeamStore.getState().error).toBe('Network error');
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should handle network errors on createTeam', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await useTeamStore.getState().createTeam('Test');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('Connection timeout');
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should handle network errors on joinWithCode', async () => {
      mockAuthToken();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('No internet'));

      const result = await useTeamStore.getState().joinWithCode('CODE');

      expect(result).toBeNull();
      expect(useTeamStore.getState().error).toBe('No internet');
      expect(useTeamStore.getState().isLoading).toBe(false);
    });

    it('should clear error with clearError', () => {
      useTeamStore.setState({ error: 'Some previous error' });

      useTeamStore.getState().clearError();

      expect(useTeamStore.getState().error).toBeNull();
    });
  });

  describe('setCurrentTeam', () => {
    it('should set the current team', () => {
      useTeamStore.getState().setCurrentTeam(mockTeam);

      expect(useTeamStore.getState().currentTeam).toEqual(mockTeam);
    });

    it('should clear the current team when set to null', () => {
      useTeamStore.setState({ currentTeam: mockTeam });

      useTeamStore.getState().setCurrentTeam(null);

      expect(useTeamStore.getState().currentTeam).toBeNull();
    });
  });

  describe('fetchTeamHunts', () => {
    it('should fetch hunts for a team', async () => {
      const mockHunts = [
        { id: 'th-1', teamId: 'team-1', huntId: 'hunt-1', huntTitle: 'Park Hunt', status: 'scheduled', totalScore: 0, participantIds: ['user-1'] },
      ];

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: mockHunts }),
      });

      await useTeamStore.getState().fetchTeamHunts('team-1');

      expect(useTeamStore.getState().teamHunts).toEqual(mockHunts);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/hunts`,
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });
  });

  describe('fetchStats', () => {
    it('should fetch team stats', async () => {
      const mockStats = {
        teamId: 'team-1',
        totalHunts: 10,
        completedHunts: 8,
        averageScore: 85,
        bestScore: 100,
        totalChallenges: 40,
        averageCompletionTime: 3600,
        winRate: 0.6,
        currentStreak: 3,
        bestStreak: 5,
      };

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats }),
      });

      await useTeamStore.getState().fetchStats('team-1');

      expect(useTeamStore.getState().stats).toEqual(mockStats);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/stats`,
        { headers: { Authorization: 'Bearer mock-token' } }
      );
    });
  });

  describe('setHuntRole', () => {
    it('should update a member hunt role', async () => {
      useTeamStore.setState({ members: [mockMember, mockMember2] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().setHuntRole('team-1', 'user-2', 'photographer');

      const updatedMember = useTeamStore.getState().members.find(m => m.userId === 'user-2');
      expect(updatedMember?.huntRole).toBe('photographer');
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/teams/team-1/members/user-2/hunt-role`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ huntRole: 'photographer' }),
        })
      );
    });
  });

  describe('chat actions', () => {
    it('should send a message and append it to currentChat', async () => {
      const mockMessage = {
        id: 'msg-1',
        teamId: 'team-1',
        userId: 'user-1',
        displayName: 'Alice',
        content: 'Hello team!',
        messageType: 'text',
        createdAt: '2025-03-01T00:00:00Z',
        readBy: ['user-1'],
      };

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: mockMessage }),
      });

      await useTeamStore.getState().sendMessage('room-1', 'Hello team!');

      expect(useTeamStore.getState().currentChat).toHaveLength(1);
      expect(useTeamStore.getState().currentChat[0]).toEqual(mockMessage);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/chat/rooms/room-1/messages`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Hello team!', messageType: 'text' }),
        })
      );
    });

    it('should mark a chat room as read', async () => {
      const chatRoom = { id: 'room-1', teamId: 'team-1', name: 'General', unreadCount: 5, participants: ['user-1'] };
      useTeamStore.setState({ chatRooms: [chatRoom] });

      mockAuthToken();
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useTeamStore.getState().markAsRead('room-1');

      const updatedRoom = useTeamStore.getState().chatRooms.find(r => r.id === 'room-1');
      expect(updatedRoom?.unreadCount).toBe(0);
    });
  });
});
