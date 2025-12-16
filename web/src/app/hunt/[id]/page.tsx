'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Play, Share2, Edit, Trophy, Map, Clock, Users, 
  Camera, MapPin, QrCode, MessageSquare, CheckCircle, Lock,
  Copy, Check
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  verification_type: 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';
  hint?: string;
  order_index: number;
}

interface Hunt {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'active' | 'completed' | 'archived';
  is_public: boolean;
  challenges: Challenge[];
  created_at: string;
}

export default function HuntDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchHunt(params.id as string);
    }
  }, [params.id]);

  const fetchHunt = async (id: string) => {
    try {
      const res = await fetch(`/api/hunts/${id}`);
      if (!res.ok) throw new Error('Hunt not found');
      const data = await res.json();
      setHunt(data);
    } catch (error) {
      console.error('Failed to fetch hunt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/hunt/${hunt?.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0D1117]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#21262D] rounded w-1/3" />
            <div className="h-64 bg-[#161B22] rounded-2xl" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-[#161B22] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!hunt) {
    return (
      <main className="min-h-screen bg-[#0D1117]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
          <Map className="w-16 h-16 text-[#30363D] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Hunt Not Found</h1>
          <p className="text-[#8B949E] mb-6">This hunt doesn't exist or has been removed.</p>
          <Link href="/hunts">
            <Button variant="outline">Back to My Hunts</Button>
          </Link>
        </div>
      </main>
    );
  }

  const totalPoints = hunt.challenges.reduce((sum, c) => sum + c.points, 0);

  return (
    <main className="min-h-screen bg-[#0D1117]">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Back Link */}
        <Link 
          href="/hunts"
          className="inline-flex items-center gap-2 text-[#8B949E] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Hunts
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
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getDifficultyColor(hunt.difficulty)}`}>
                  {hunt.difficulty.toUpperCase()}
                </span>
                {hunt.is_public ? (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20">
                    PUBLIC
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium text-gray-400 bg-gray-400/10 border border-gray-400/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    PRIVATE
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-3">{hunt.title}</h1>
              <p className="text-[#8B949E] text-lg leading-relaxed">{hunt.description}</p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[200px]">
              <Button onClick={() => setShowJoinModal(true)} size="lg">
                <Play className="w-5 h-5" />
                Start Hunt
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyShareLink} className="flex-1">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
                <Link href={`/hunt/${hunt.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
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
                <span className="text-2xl font-bold">{hunt.challenges.length}</span>
              </div>
              <span className="text-sm text-[#8B949E]">Challenges</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[#FFE66D] mb-1">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">~{Math.ceil(hunt.challenges.length * 5)}</span>
              </div>
              <span className="text-sm text-[#8B949E]">Est. Minutes</span>
            </div>
          </div>
        </motion.div>

        {/* Challenges List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Challenges ({hunt.challenges.length})</h2>
          
          <div className="space-y-4">
            {hunt.challenges
              .sort((a, b) => a.order_index - b.order_index)
              .map((challenge, index) => {
                const Icon = getVerificationIcon(challenge.verification_type);
                return (
                  <motion.div
                    key={challenge.id}
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
                              💡 Hint available
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

        {/* Start CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center bg-gradient-to-r from-[#FF6B35]/10 to-[#1A535C]/10 rounded-2xl p-8 border border-[#30363D]"
        >
          <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
          <p className="text-[#8B949E] mb-6">
            Complete all {hunt.challenges.length} challenges to earn {totalPoints} points!
          </p>
          <Button onClick={() => setShowJoinModal(true)} size="lg">
            <Play className="w-5 h-5" />
            Begin Adventure
          </Button>
        </motion.div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Start Hunt</h2>
            <p className="text-[#8B949E] mb-6">
              You're about to start "{hunt.title}". Ready to begin your adventure?
            </p>
            
            <div className="bg-[#21262D] rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#8B949E]">Challenges</span>
                <span className="text-white font-medium">{hunt.challenges.length}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#8B949E]">Total Points</span>
                <span className="text-white font-medium">{totalPoints}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8B949E]">Estimated Time</span>
                <span className="text-white font-medium">~{Math.ceil(hunt.challenges.length * 5)} min</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowJoinModal(false)} className="flex-1">
                Cancel
              </Button>
              <Link href={`/play/${hunt.id}`} className="flex-1">
                <Button className="w-full">
                  <Play className="w-4 h-4" />
                  Start Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
