import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../authStore';

// Reset store between tests
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isInitialized: false,
    error: null,
  });
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.removeItem as jest.Mock).mockClear();
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
      };
      const mockToken = 'mock-jwt-token';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken }),
      });

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    it('should handle login failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      const result = await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      expect(result).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Network error');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading during login', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useAuthStore.getState().isLoading;
        return {
          ok: true,
          json: async () => ({ user: { id: '1', email: 'test@example.com' }, token: 'token' }),
        };
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(loadingDuringFetch).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'new@example.com',
        display_name: 'New User',
      };
      const mockToken = 'mock-jwt-token';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken }),
      });

      const result = await useAuthStore.getState().register('new@example.com', 'password123', 'New User');

      expect(result).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    it('should handle registration failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      });

      const result = await useAuthStore.getState().register('existing@example.com', 'password123', 'User');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout and clear state', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' },
        isAuthenticated: true,
      });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('initialize', () => {
    it('should initialize with stored token', async () => {
      const mockUser = { id: '1', email: 'test@example.com', display_name: 'Test' };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('stored-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('should initialize without token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isInitialized).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('should verify valid token', async () => {
      const mockUser = { id: '1', email: 'test@example.com', display_name: 'Test' };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle invalid token', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' },
        isAuthenticated: true,
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should do nothing without token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useAuthStore.getState().checkAuth();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const initialUser = { id: '1', email: 'test@example.com', display_name: 'Old Name' };
      const updatedUser = { ...initialUser, display_name: 'New Name' };

      useAuthStore.setState({ user: initialUser, isAuthenticated: true });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: updatedUser }),
      });

      await useAuthStore.getState().updateProfile({ display_name: 'New Name' });

      expect(useAuthStore.getState().user?.display_name).toBe('New Name');
    });

    it('should handle profile update failure', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' },
        isAuthenticated: true
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await useAuthStore.getState().updateProfile({ display_name: 'New Name' });

      expect(useAuthStore.getState().error).toBe('Update failed');
    });

    it('should not update if not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      await useAuthStore.getState().updateProfile({ display_name: 'New Name' });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
