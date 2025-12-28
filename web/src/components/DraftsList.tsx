'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileEdit, Trash2, Clock, MapPin, Target } from 'lucide-react';
import { useDraftStore } from '@/stores/draftStore';

interface DraftsListProps {
  onResume: (draftId: string) => void;
  onDelete?: (draftId: string) => void;
}

export function DraftsList({ onResume, onDelete }: DraftsListProps) {
  const { drafts, deleteDraft, clearExpiredDrafts } = useDraftStore();

  // Clear expired drafts on mount
  useEffect(() => {
    clearExpiredDrafts();
  }, [clearExpiredDrafts]);

  const handleDelete = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(draftId);
    onDelete?.(draftId);
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getThemeEmoji = (theme: string): string => {
    const emojis: Record<string, string> = {
      adventure: '🏔️',
      mystery: '🔍',
      nature: '🌿',
      urban: '🏙️',
      history: '🏛️',
      art: '🎨',
      food: '🍕',
      sports: '⚽',
    };
    return emojis[theme] || '📍';
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileEdit className="w-5 h-5 text-[#FF6B35]" />
        Your Drafts
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {drafts.slice(0, 5).map((draft) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => onResume(draft.id)}
              className="group p-4 rounded-xl bg-[#21262D]/50 border border-[#30363D]
                         hover:border-[#FF6B35]/50 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getThemeEmoji(draft.theme)}</span>
                    <h4 className="text-white font-medium truncate">
                      {draft.title || `Untitled ${draft.theme || 'Hunt'}`}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#8B949E]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(draft.updatedAt)}
                    </span>

                    {draft.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {draft.location}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Step {draft.step}/3
                    </span>

                    <span className="px-2 py-0.5 rounded bg-[#30363D] text-xs capitalize">
                      {draft.difficulty}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(draft.id, e)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100
                             hover:bg-red-500/20 text-[#8B949E] hover:text-red-400
                             transition-all duration-200"
                  title="Delete draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {draft.challenges.length > 0 && (
                <div className="mt-2 text-xs text-[#8B949E]">
                  {draft.challenges.length} challenge{draft.challenges.length !== 1 ? 's' : ''} drafted
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {drafts.length > 5 && (
          <p className="text-sm text-[#8B949E] text-center">
            + {drafts.length - 5} more draft{drafts.length - 5 !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
