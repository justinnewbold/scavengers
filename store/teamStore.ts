import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Team,
  TeamMember,
  TeamInvite,
  TeamHunt,
  TeamStats,
  ChatMessage,
  ChatRoom,
  TeamRole,
  TeamHuntRole,
} from '@/types/teams';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface TeamStore {
  // State
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  invites: TeamInvite[];
  teamHunts: TeamHunt[];
  stats: TeamStats | null;
  chatRooms: ChatRoom[];
  currentChat: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Team actions
  fetchTeams: () => Promise<void>;
  fetchTeam: (teamId: string) => Promise<Team | null>;
  createTeam: (name: string, description?: string, isPublic?: boolean) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;

  // Member actions
  fetchMembers: (teamId: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<TeamInvite | null>;
  generateInviteLink: (teamId: string, maxUses?: number) => Promise<string | null>;
  joinWithCode: (inviteCode: string) => Promise<Team | null>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  updateMemberRole: (teamId: string, userId: string, role: TeamRole) => Promise<void>;
  setHuntRole: (teamId: string, userId: string, huntRole: TeamHuntRole) => Promise<void>;

  // Team hunt actions
  fetchTeamHunts: (teamId: string) => Promise<void>;
  scheduleHunt: (teamId: string, huntId: string, scheduledFor: string) => Promise<void>;
  startTeamHunt: (teamId: string, huntId: string) => Promise<void>;

  // Stats
  fetchStats: (teamId: string) => Promise<void>;

  // Chat actions
  fetchChatRooms: (teamId: string) => Promise<void>;
  fetchMessages: (roomId: string, limit?: number) => Promise<void>;
  sendMessage: (roomId: string, content: string, type?: 'text' | 'location' | 'photo') => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;

  // Utility
  setCurrentTeam: (team: Team | null) => void;
  clearError: () => void;
}

export const useTeamStore = create<TeamStore>()(persist((set, get) => ({
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

  fetchTeams: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch teams');

      const data = await response.json();
      set({ teams: data.teams, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchTeam: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch team');

      const data = await response.json();
      set({ currentTeam: data.team });
      return data.team;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  createTeam: async (name, description, isPublic = false) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, isPublic }),
      });

      if (!response.ok) throw new Error('Failed to create team');

      const data = await response.json();
      const newTeam = data.team as Team;

      set((state) => ({
        teams: [...state.teams, newTeam],
        currentTeam: newTeam,
        isLoading: false,
      }));

      return newTeam;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateTeam: async (teamId, updates) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update team');

      const data = await response.json();

      set((state) => ({
        teams: state.teams.map(t => t.id === teamId ? data.team : t),
        currentTeam: state.currentTeam?.id === teamId ? data.team : state.currentTeam,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteTeam: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete team');

      set((state) => ({
        teams: state.teams.filter(t => t.id !== teamId),
        currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  leaveTeam: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to leave team');

      set((state) => ({
        teams: state.teams.filter(t => t.id !== teamId),
        currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMembers: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch members');

      const data = await response.json();
      set({ members: data.members });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  inviteMember: async (teamId, email) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error('Failed to send invite');

      const data = await response.json();
      set((state) => ({
        invites: [...state.invites, data.invite],
      }));

      return data.invite;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  generateInviteLink: async (teamId, maxUses = 10) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/invites/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ maxUses }),
      });

      if (!response.ok) throw new Error('Failed to generate invite link');

      const data = await response.json();
      return data.inviteLink;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  joinWithCode: async (inviteCode) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join team');
      }

      const data = await response.json();
      const team = data.team as Team;

      set((state) => ({
        teams: [...state.teams, team],
        currentTeam: team,
        isLoading: false,
      }));

      return team;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  removeMember: async (teamId, userId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to remove member');

      set((state) => ({
        members: state.members.filter(m => m.userId !== userId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateMemberRole: async (teamId, userId, role) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      set((state) => ({
        members: state.members.map(m =>
          m.userId === userId ? { ...m, role } : m
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setHuntRole: async (teamId, userId, huntRole) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}/hunt-role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ huntRole }),
      });

      if (!response.ok) throw new Error('Failed to update hunt role');

      set((state) => ({
        members: state.members.map(m =>
          m.userId === userId ? { ...m, huntRole } : m
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchTeamHunts: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/hunts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch team hunts');

      const data = await response.json();
      set({ teamHunts: data.hunts });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  scheduleHunt: async (teamId, huntId, scheduledFor) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/hunts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ huntId, scheduledFor }),
      });

      if (!response.ok) throw new Error('Failed to schedule hunt');

      const data = await response.json();
      set((state) => ({
        teamHunts: [...state.teamHunts, data.teamHunt],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  startTeamHunt: async (teamId, huntId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/hunts/${huntId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to start hunt');

      await get().fetchTeamHunts(teamId);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchStats: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      set({ stats: data.stats });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchChatRooms: async (teamId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/teams/${teamId}/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch chat rooms');

      const data = await response.json();
      set({ chatRooms: data.rooms });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMessages: async (roomId: string, limit: number = 50) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      set({ currentChat: data.messages });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  sendMessage: async (roomId: string, content: string, type: 'text' | 'location' | 'photo' = 'text') => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, messageType: type }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      set((state) => ({
        currentChat: [...state.currentChat, data.message],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  markAsRead: async (roomId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE}/chat/rooms/${roomId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      set((state) => ({
        chatRooms: state.chatRooms.map(r =>
          r.id === roomId ? { ...r, unreadCount: 0 } : r
        ),
      }));
    } catch (error) {
      // Silent fail for read receipts
    }
  },

  setCurrentTeam: (team: Team | null) => {
    set({ currentTeam: team });
  },

  clearError: () => {
    set({ error: null });
  },
}), {
  name: 'team-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    teams: state.teams,
  }),
}));

export default useTeamStore;
