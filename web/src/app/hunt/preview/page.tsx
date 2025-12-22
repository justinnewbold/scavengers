'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Trophy, Map, Clock,
  Camera, MapPin, QrCode, MessageSquare, CheckCircle,
  Sparkles, AlertTriangle, LogIn
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

interface Challenge {
  title: string;
  description: string;
  points: number;
  verification_type: 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';
  hint?: string;
  order_index: number;
}

interface PreviewHunt {
  content: {
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
  };
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  location: string;
}

export default function HuntPreviewPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [previewData, setPreviewData] = useState<PreviewHunt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    // Load preview data from sessionStorage
    const stored = sessionStorage.getItem('pendingHunt');
    if (stored) {
      try {
        setPreviewData(JSON.parse(stored));
      } catch {
        router.push('/hunts');
      }
    } else {
      router.push('/hunts');
    }
  }, [router]);

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
      default:
        return 'photo';
    }
  };

  const handleSave = async () => {
    if (!token) {
      setShowLoginPrompt(true);
      return;
    }

    if (!previewData) return;

    setIsSaving(true);
    try {
      const { content, difficulty, location } = previewData;

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

      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: content.hunt?.title || 'Untitled Hunt',
          description: content.hunt?.description || '',
          difficulty,
          is_public: true,
          status: 'active',
          location: location || undefined,
          challenges: validChallenges,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save hunt');
      }

      // Clear the pending hunt from storage
      sessionStorage.removeItem('pendingHunt');

      showToast('Hunt saved successfully!', 'success');
      router.push(`/hunt/${data.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save hunt', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginAndSave = () => {
    // The pendingHunt is already in sessionStorage, so just redirect to login
    router.push('/login?redirect=/hunt/preview&saveHunt=true');
  };

  const handleDiscard = () => {
    if (confirm('Are you sure you want to discard this hunt? This cannot be undone.')) {
      sessionStorage.removeItem('pendingHunt');
      router.push('/hunts');
    }
  };

  const getVerificationIcon = (type: string) => {
    switch (type) {
      case 'photo': return Camera;
      case 'gps': return MapPin;
      case 'qr_code': return QrCode;
      case 'text_answer': return MessageSquare;
      default: return CheckCircle;
    }
  };

  const getVerificationLabel = (type: string) => {
    switch (type) {
      case 'photo': return 'Photo Verification';
      case 'gps': return 'GPS Location';
      case 'qr_code': return 'QR Code Scan';
      case 'text_answer': return 'Text Answer';
      default: return 'Manual Check';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (!previewData) {
    return (
      <main className="min-h-screen bg-[#0D1117]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#21262D] rounded w-1/3" />
            <div className="h-64 bg-[#161B22] rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  const { content, difficulty, location } = previewData;
  const challenges: Challenge[] = (content.challenges || []).map((c, i) => ({
    title: c.title,
    description: c.description || '',
    points: c.points || 10,
    verification_type: mapTypeToVerificationType(c.type),
    hint: c.hint,
    order_index: i,
  }));
  const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);

  return (
    <main className="min-h-screen bg-[#0D1117]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Unsaved Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-500 font-medium">This hunt is not saved yet</p>
            <p className="text-yellow-500/70 text-sm">Sign up or log in to save it. If you leave, this hunt will be lost.</p>
          </div>
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4" />
            Save Hunt
          </Button>
        </motion.div>

        {/* Back Link */}
        <Link
          href="/hunts"
          onClick={(e) => {
            e.preventDefault();
            handleDiscard();
          }}
          className="inline-flex items-center gap-2 text-[#8B949E] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Discard and go back
        </Link>

        {/* Hunt Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-lg text-sm font-medium text-purple-400 bg-purple-400/10 border border-purple-400/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI GENERATED
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getDifficultyColor(difficulty)}`}>
                  {difficulty.toUpperCase()}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">{content.hunt?.title || 'Untitled Hunt'}</h1>
              <p className="text-[#8B949E] text-lg leading-relaxed">{content.hunt?.description}</p>
              {location && (
                <p className="text-[#8B949E] mt-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {location}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[200px]">
              <Button onClick={handleSave} size="lg" isLoading={isSaving}>
                <Save className="w-5 h-5" />
                Save Hunt
              </Button>
              <Button variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-[#30363D]">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[#FF6B35] mb-1">
                <Trophy className="w-5 h-5" />
                <span className="text-2xl font-bold">{totalPoints}</span>
              </div>
              <span className="text-sm text-[#8B949E]">Total Points</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[#1A535C] mb-1">
                <Map className="w-5 h-5" />
                <span className="text-2xl font-bold">{challenges.length}</span>
              </div>
              <span className="text-sm text-[#8B949E]">Challenges</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[#FFE66D] mb-1">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">~{Math.ceil(challenges.length * 5)}</span>
              </div>
              <span className="text-sm text-[#8B949E]">Est. Minutes</span>
            </div>
          </div>
        </motion.div>

        {/* Challenges List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Challenges ({challenges.length})</h2>

          <div className="space-y-4">
            {challenges.map((challenge, index) => {
              const Icon = getVerificationIcon(challenge.verification_type);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#161B22] rounded-xl border border-[#30363D] p-6 hover:border-[#484F58] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#21262D] flex items-center justify-center text-[#FF6B35] font-bold">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
                        <span className="text-[#FF6B35] font-bold">{challenge.points} pts</span>
                      </div>

                      <p className="text-[#8B949E] mb-3">{challenge.description}</p>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-[#8B949E]">
                          <Icon className="w-4 h-4" />
                          <span>{getVerificationLabel(challenge.verification_type)}</span>
                        </div>

                        {challenge.hint && (
                          <div className="text-sm text-yellow-500/70">
                            Hint available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Save CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center bg-gradient-to-r from-[#FF6B35]/10 to-[#1A535C]/10 rounded-2xl p-8 border border-[#30363D]"
        >
          <h3 className="text-2xl font-bold text-white mb-2">Save Your Hunt</h3>
          <p className="text-[#8B949E] mb-6">
            This hunt has {challenges.length} challenges worth {totalPoints} points. Save it to share with friends!
          </p>
          <Button onClick={handleSave} size="lg" isLoading={isSaving}>
            <Save className="w-5 h-5" />
            Save Hunt
          </Button>
        </motion.div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLoginPrompt(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFE66D] flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Sign In to Save</h2>
            <p className="text-[#8B949E] mb-6 text-center">
              Create an account or log in to save your hunt and share it with others.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowLoginPrompt(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleLoginAndSave} className="flex-1">
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
