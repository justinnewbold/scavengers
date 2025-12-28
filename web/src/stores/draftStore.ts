import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DraftChallenge {
  title: string;
  description: string;
  points: number;
  type?: string;
  hint?: string;
}

interface HuntDraft {
  id: string;
  title: string;
  description: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  location: string;
  challengeCount: number;
  duration: number;
  challenges: DraftChallenge[];
  step: number;
  createdAt: number;
  updatedAt: number;
}

interface DraftState {
  drafts: HuntDraft[];
  currentDraftId: string | null;
  autoSaveEnabled: boolean;
  lastSavedAt: number | null;

  // Actions
  createDraft: () => string;
  updateDraft: (id: string, updates: Partial<Omit<HuntDraft, 'id' | 'createdAt'>>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => HuntDraft | undefined;
  setCurrentDraft: (id: string | null) => void;
  getCurrentDraft: () => HuntDraft | undefined;
  clearExpiredDrafts: () => void;
  setAutoSave: (enabled: boolean) => void;
}

const DRAFT_EXPIRY_DAYS = 30;

function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyDraft(): Omit<HuntDraft, 'id'> {
  const now = Date.now();
  return {
    title: '',
    description: '',
    theme: '',
    difficulty: 'medium',
    location: '',
    challengeCount: 8,
    duration: 60,
    challenges: [],
    step: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      currentDraftId: null,
      autoSaveEnabled: true,
      lastSavedAt: null,

      createDraft: () => {
        const id = generateDraftId();
        const newDraft: HuntDraft = {
          id,
          ...createEmptyDraft(),
        };

        set((state) => ({
          drafts: [newDraft, ...state.drafts],
          currentDraftId: id,
          lastSavedAt: Date.now(),
        }));

        return id;
      },

      updateDraft: (id, updates) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id
              ? { ...draft, ...updates, updatedAt: Date.now() }
              : draft
          ),
          lastSavedAt: Date.now(),
        }));
      },

      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== id),
          currentDraftId: state.currentDraftId === id ? null : state.currentDraftId,
        }));
      },

      getDraft: (id) => {
        return get().drafts.find((draft) => draft.id === id);
      },

      setCurrentDraft: (id) => {
        set({ currentDraftId: id });
      },

      getCurrentDraft: () => {
        const { currentDraftId, drafts } = get();
        if (!currentDraftId) return undefined;
        return drafts.find((draft) => draft.id === currentDraftId);
      },

      clearExpiredDrafts: () => {
        const expiryTime = Date.now() - DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.updatedAt > expiryTime),
        }));
      },

      setAutoSave: (enabled) => {
        set({ autoSaveEnabled: enabled });
      },
    }),
    {
      name: 'hunt-drafts',
      version: 1,
      partialize: (state) => ({
        drafts: state.drafts,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
);

// Auto-save hook for use in components
export function useAutoSave(draftId: string | null, debounceMs = 1000) {
  const { updateDraft, autoSaveEnabled, lastSavedAt } = useDraftStore();

  const autoSave = (updates: Partial<Omit<HuntDraft, 'id' | 'createdAt'>>) => {
    if (!autoSaveEnabled || !draftId) return;
    updateDraft(draftId, updates);
  };

  return { autoSave, lastSavedAt, autoSaveEnabled };
}
