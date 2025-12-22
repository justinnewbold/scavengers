'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, MapPin, Clock, Target, Zap, LogIn } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '@/contexts/AuthContext';

interface Hunt {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'active' | 'completed' | 'archived';
  is_public: boolean;
  challenges?: { id: string; points: number }[];
  created_at: string;
}

interface GeneratedContent {
  hunt: {
    title: string;
    description: string;
    difficulty: string;
    location?: string;
  };
  challenges: Array<{
    title: string;
    description: string;
    points: number;
    type?: string;
    hint?: string;
  }>;
}

interface CreateHuntModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreated?: (hunt: Hunt) => void;
}

const themes = [
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'mystery', label: 'Mystery', emoji: '🔍' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'urban', label: 'Urban', emoji: '🏙️' },
  { id: 'history', label: 'History', emoji: '🏛️' },
  { id: 'art', label: 'Art & Culture', emoji: '🎨' },
  { id: 'food', label: 'Food & Drink', emoji: '🍕' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
];

const difficulties = [
  { id: 'easy', label: 'Easy', description: 'Perfect for beginners', color: 'text-green-400 border-green-400/30' },
  { id: 'medium', label: 'Medium', description: 'A balanced challenge', color: 'text-yellow-400 border-yellow-400/30' },
  { id: 'hard', label: 'Hard', description: 'For experienced hunters', color: 'text-red-400 border-red-400/30' },
];

export function CreateHuntModal({ isOpen = false, onClose, onCreated }: CreateHuntModalProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [theme, setTheme] = useState('');
  const [location, setLocation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [challengeCount, setChallengeCount] = useState(8);
  const [duration, setDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // Generate AI content (works without auth)
      const aiRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          location,
          difficulty,
          challengeCount,
          duration,
        }),
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json();
        throw new Error(errorData.error || 'Failed to generate hunt content');
      }

      const aiData = await aiRes.json();
      setGeneratedContent(aiData);

      // If user is logged in, save immediately
      if (token) {
        await saveHunt(aiData);
      } else {
        // Store the generated content and redirect to full preview page
        sessionStorage.setItem('pendingHunt', JSON.stringify({
          content: aiData,
          theme,
          difficulty,
          location,
        }));
        resetAndClose();
        router.push('/hunt/preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hunt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to map AI type to verification type
  const mapTypeToVerificationType = (aiType?: string): 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual' => {
    if (!aiType) return 'photo';
    const type = aiType.toLowerCase();
    switch (type) {
      case 'gps':
      case 'location':
        return 'gps';
      case 'text':
      case 'text_answer':
        return 'text_answer';
      case 'qr':
      case 'qr_code':
        return 'qr_code';
      case 'manual':
        return 'manual';
      case 'photo':
      case 'image':
      default:
        return 'photo';
    }
  };

  const saveHunt = async (content: GeneratedContent) => {
    if (!token) {
      setError('Please log in to save your hunt');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Validate content structure
      if (!content || typeof content !== 'object') {
        throw new Error('Invalid hunt content generated');
      }

      // Get the title with fallback
      const huntTitle = content.hunt?.title || `${theme.charAt(0).toUpperCase() + theme.slice(1)} Explorer`;
      if (!huntTitle || huntTitle.trim().length < 3) {
        throw new Error('Hunt title must be at least 3 characters');
      }

      // Filter out null/undefined challenges and ensure required fields exist
      const validChallenges = (content.challenges || [])
        .filter((c): c is NonNullable<typeof c> => c != null && typeof c.title === 'string' && c.title.trim().length > 0)
        .map((c, i) => ({
          title: c.title.trim(),
          description: c.description || '',
          points: typeof c.points === 'number' && c.points > 0 ? c.points : 10,
          verification_type: mapTypeToVerificationType(c.type),
          hint: c.hint || undefined,
          order_index: i,
        }));

      if (validChallenges.length === 0) {
        throw new Error('No valid challenges were generated. Please try again.');
      }

      const requestBody = {
        title: huntTitle.trim(),
        description: content.hunt?.description || `An exciting ${difficulty} scavenger hunt`,
        difficulty,
        is_public: true,
        status: 'active',
        location: location || undefined,
        challenges: validChallenges,
      };

      const huntRes = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let responseData;
      try {
        responseData = await huntRes.json();
      } catch {
        throw new Error(`Server error (${huntRes.status}): Invalid response`);
      }

      if (!huntRes.ok) {
        throw new Error(responseData.error || `Failed to save hunt (${huntRes.status})`);
      }

      const hunt = responseData;

      if (onCreated) {
        onCreated(hunt);
      }
      resetAndClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save hunt. Please try again.';
      setError(errorMessage);
      console.error('Hunt save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginAndSave = () => {
    // Store the generated content in sessionStorage so we can save after login
    if (generatedContent) {
      sessionStorage.setItem('pendingHunt', JSON.stringify({
        content: generatedContent,
        theme,
        difficulty,
        location,
      }));
    }
    resetAndClose();
    router.push('/login?redirect=/create&saveHunt=true');
  };

  const resetAndClose = () => {
    setStep(1);
    setTheme('');
    setLocation('');
    setDifficulty('medium');
    setChallengeCount(8);
    setDuration(60);
    setError('');
    setGeneratedContent(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-full md:max-w-2xl md:max-h-[85vh] overflow-auto
                       bg-gradient-to-br from-[#161B22] to-[#0D1117]
                       border border-[#30363D] rounded-3xl z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#161B22]/95 backdrop-blur-sm border-b border-[#30363D] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFE66D] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white tracking-wide">AI Quick Create</h2>
                  <p className="text-sm text-[#8B949E]">
                    {step === 4 ? 'Save Your Hunt' : `Step ${step} of 3`}
                  </p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 rounded-lg hover:bg-[#21262D] transition-colors"
              >
                <X className="w-5 h-5 text-[#8B949E]" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-[#21262D]">
              <motion.div
                initial={{ width: '33%' }}
                animate={{ width: step === 4 ? '100%' : `${(step / 3) * 100}%` }}
                className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFE66D]"
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Theme Selection */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">Choose a Theme</h3>
                    <p className="text-[#8B949E] mb-6">What kind of adventure are you looking for?</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-center
                            ${theme === t.id
                              ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white'
                              : 'border-[#30363D] hover:border-[#484F58] text-[#8B949E]'
                            }`}
                        >
                          <span className="text-2xl block mb-1">{t.emoji}</span>
                          <span className="text-sm font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm text-[#8B949E] mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Location (Optional)
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., Central Park, Downtown, My Neighborhood"
                        className="w-full px-4 py-3 rounded-xl bg-[#21262D] border border-[#30363D] 
                                 text-white placeholder-[#484F58] focus:border-[#FF6B35] focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Difficulty */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">Set the Challenge Level</h3>
                    <p className="text-[#8B949E] mb-6">How challenging should this hunt be?</p>
                    
                    <div className="space-y-3">
                      {difficulties.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDifficulty(d.id as 'easy' | 'medium' | 'hard')}
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                            ${difficulty === d.id
                              ? `${d.color} bg-opacity-10`
                              : 'border-[#30363D] hover:border-[#484F58]'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`font-semibold ${difficulty === d.id ? d.color.split(' ')[0] : 'text-white'}`}>
                                {d.label}
                              </span>
                              <p className="text-sm text-[#8B949E] mt-1">{d.description}</p>
                            </div>
                            {difficulty === d.id && (
                              <div className="w-6 h-6 rounded-full bg-current flex items-center justify-center">
                                <svg className="w-4 h-4 text-[#0D1117]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">Final Details</h3>
                    <p className="text-[#8B949E] mb-6">Customize the length of your hunt</p>
                    
                    <div className="space-y-6">
                      {/* Challenge Count */}
                      <div>
                        <label className="flex items-center gap-2 text-sm text-[#8B949E] mb-3">
                          <Target className="w-4 h-4" />
                          Number of Challenges: <span className="text-[#FF6B35] font-semibold">{challengeCount}</span>
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={challengeCount}
                          onChange={(e) => setChallengeCount(parseInt(e.target.value))}
                          className="w-full h-2 rounded-full bg-[#21262D] appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                                   [&::-webkit-slider-thumb]:bg-[#FF6B35] [&::-webkit-slider-thumb]:cursor-pointer
                                   [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#FF6B35]/30"
                        />
                        <div className="flex justify-between text-xs text-[#484F58] mt-1">
                          <span>3</span>
                          <span>20</span>
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="flex items-center gap-2 text-sm text-[#8B949E] mb-3">
                          <Clock className="w-4 h-4" />
                          Estimated Duration: <span className="text-[#FFE66D] font-semibold">{duration} minutes</span>
                        </label>
                        <input
                          type="range"
                          min="15"
                          max="180"
                          step="15"
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value))}
                          className="w-full h-2 rounded-full bg-[#21262D] appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                                   [&::-webkit-slider-thumb]:bg-[#FFE66D] [&::-webkit-slider-thumb]:cursor-pointer
                                   [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#FFE66D]/30"
                        />
                        <div className="flex justify-between text-xs text-[#484F58] mt-1">
                          <span>15 min</span>
                          <span>3 hours</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-6 p-4 rounded-xl bg-[#21262D]/50 border border-[#30363D]">
                      <h4 className="text-sm font-medium text-[#8B949E] mb-2">Your Hunt Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-[#484F58]">Theme:</span> <span className="text-white capitalize">{theme}</span></div>
                        <div><span className="text-[#484F58]">Difficulty:</span> <span className="text-white capitalize">{difficulty}</span></div>
                        <div><span className="text-[#484F58]">Challenges:</span> <span className="text-white">{challengeCount}</span></div>
                        <div><span className="text-[#484F58]">Duration:</span> <span className="text-white">{duration} min</span></div>
                        {location && <div className="col-span-2"><span className="text-[#484F58]">Location:</span> <span className="text-white">{location}</span></div>}
                      </div>
                    </div>

                    {error && (
                      <p className="mt-4 text-red-400 text-sm">{error}</p>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Login prompt with preview (only shown if not logged in) */}
                {step === 4 && generatedContent && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFE66D] flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-white mb-2">Hunt Generated!</h3>
                      <p className="text-[#8B949E]">Sign up or log in to save your hunt</p>
                    </div>

                    {/* Preview */}
                    <div className="p-4 rounded-xl bg-[#21262D]/50 border border-[#30363D] mb-6">
                      <h4 className="font-semibold text-white text-lg mb-1">{generatedContent.hunt?.title}</h4>
                      <p className="text-sm text-[#8B949E] mb-3">{generatedContent.hunt?.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-[#1A535C]/30 text-[#FFE66D]">
                          {generatedContent.challenges?.length || 0} challenges
                        </span>
                        <span className="px-2 py-1 rounded bg-[#1A535C]/30 text-[#FFE66D]">
                          {difficulty}
                        </span>
                        {location && (
                          <span className="px-2 py-1 rounded bg-[#1A535C]/30 text-[#FFE66D]">
                            {location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Challenge preview */}
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                      {generatedContent.challenges?.slice(0, 3).map((c, i) => (
                        <div key={i} className="p-3 rounded-lg bg-[#161B22] border border-[#30363D]">
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-white font-medium">{c.title}</span>
                            <span className="text-xs text-[#FF6B35]">{c.points} pts</span>
                          </div>
                        </div>
                      ))}
                      {(generatedContent.challenges?.length || 0) > 3 && (
                        <p className="text-xs text-[#8B949E] text-center">
                          + {(generatedContent.challenges?.length || 0) - 3} more challenges
                        </p>
                      )}
                    </div>

                    {error && (
                      <p className="mt-4 text-red-400 text-sm">{error}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#161B22]/95 backdrop-blur-sm border-t border-[#30363D] px-6 py-4 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === 4) {
                    setStep(3);
                    setGeneratedContent(null);
                  } else if (step > 1) {
                    setStep(step - 1);
                  } else {
                    resetAndClose();
                  }
                }}
              >
                {step > 1 ? 'Back' : 'Cancel'}
              </Button>

              {step < 3 ? (
                <Button
                  variant="primary"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !theme}
                >
                  Continue
                </Button>
              ) : step === 3 ? (
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  disabled={isGenerating}
                >
                  <Zap className="w-4 h-4" />
                  Generate Hunt
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleLoginAndSave}
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  <LogIn className="w-4 h-4" />
                  Sign Up / Log In to Save
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
