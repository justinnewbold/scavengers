import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HuntTemplate,
  QuickCreateConfig,
  GeneratedHunt,
  GeneratedChallenge,
  TemplateCategory,
} from '@/types/templates';
import { HUNT_TEMPLATES, getTemplateById } from '@/types/templates';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface TemplateStore {
  // State
  templates: HuntTemplate[];
  recentTemplates: string[]; // Template IDs
  isGenerating: boolean;
  generatedHunt: GeneratedHunt | null;
  error: string | null;

  // Actions
  getTemplates: (category?: TemplateCategory) => HuntTemplate[];
  getTemplate: (id: string) => HuntTemplate | undefined;
  generateHunt: (config: QuickCreateConfig) => Promise<GeneratedHunt | null>;
  saveGeneratedHunt: () => Promise<string | null>; // Returns hunt ID
  cloneHunt: (huntId: string) => Promise<GeneratedHunt | null>;
  addRecentTemplate: (templateId: string) => void;
  clearGenerated: () => void;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: HUNT_TEMPLATES,
  recentTemplates: [],
  isGenerating: false,
  generatedHunt: null,
  error: null,

  getTemplates: (category) => {
    const { templates } = get();
    if (!category) return templates;
    return templates.filter(t => t.category === category);
  },

  getTemplate: (id) => {
    return getTemplateById(id);
  },

  generateHunt: async (config) => {
    set({ isGenerating: true, error: null, generatedHunt: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const template = getTemplateById(config.templateId);
      if (!template) throw new Error('Template not found');

      const response = await fetch(`${API_BASE}/templates/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: config.templateId,
          title: config.title,
          location: config.location,
          duration: config.duration,
          difficulty: config.difficulty,
          challengeCount: config.challengeCount,
          customTheme: config.customTheme,
          includePhotoChallenges: config.includePhotoChallenges,
          includeLocationChallenges: config.includeLocationChallenges,
          templatePrompts: template.challengePrompts,
          aiHints: template.aiPromptHints,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate hunt');
      }

      const data = await response.json();
      const generatedHunt = data.hunt as GeneratedHunt;

      // Add to recent templates
      get().addRecentTemplate(config.templateId);

      set({ generatedHunt, isGenerating: false });
      return generatedHunt;
    } catch (error) {
      set({ error: (error as Error).message, isGenerating: false });
      return null;
    }
  },

  saveGeneratedHunt: async () => {
    const { generatedHunt } = get();
    if (!generatedHunt) return null;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/hunts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: generatedHunt.title,
          description: generatedHunt.description,
          challenges: generatedHunt.challenges,
          estimatedDuration: generatedHunt.estimatedDuration,
          difficulty: generatedHunt.difficulty,
          isPublic: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save hunt');
      }

      const data = await response.json();
      set({ generatedHunt: null });
      return data.huntId;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  cloneHunt: async (huntId) => {
    set({ isGenerating: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/hunts/${huntId}/clone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clone hunt');
      }

      const data = await response.json();
      const generatedHunt: GeneratedHunt = {
        title: `${data.hunt.title} (Copy)`,
        description: data.hunt.description,
        challenges: data.hunt.challenges,
        estimatedDuration: data.hunt.estimatedDuration || 60,
        difficulty: data.hunt.difficulty || 'medium',
      };

      set({ generatedHunt, isGenerating: false });
      return generatedHunt;
    } catch (error) {
      set({ error: (error as Error).message, isGenerating: false });
      return null;
    }
  },

  addRecentTemplate: (templateId) => {
    set((state) => {
      const recent = [templateId, ...state.recentTemplates.filter(id => id !== templateId)];
      return { recentTemplates: recent.slice(0, 5) };
    });
  },

  clearGenerated: () => {
    set({ generatedHunt: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useTemplateStore;
