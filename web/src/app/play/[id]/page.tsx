'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Camera, MapPin, QrCode, MessageSquare,
  CheckCircle, Trophy, Clock, X, ChevronDown, ChevronUp,
  Sparkles, PartyPopper, Share2, Upload, Loader2, Navigation
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';

interface VerificationData {
  correct_answer?: string;
  case_sensitive?: boolean;
  location?: { lat: number; lng: number; radius?: number };
  qrCode?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  verification_type: 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';
  verification_data?: VerificationData;
  hint?: string;
  order_index: number;
}

interface Hunt {
  id: string;
  title: string;
  description: string;
  challenges: Challenge[];
}

export default function PlayHuntPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { token, isAuthenticated } = useAuth();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showChallengeList, setShowChallengeList] = useState(false);

  // Participant tracking
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Photo verification state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPS verification state
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Join hunt and create participant
  const joinHunt = useCallback(async (huntId: string) => {
    if (!token || participantId) return;

    setIsJoining(true);
    try {
      const res = await fetch(`/api/hunts/${huntId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setParticipantId(data.id);
        // If participant already exists (rejoining), load their progress
        if (data.score > 0) {
          setScore(data.score);
        }
      } else if (res.status === 400 && data.error?.includes('already joined')) {
        // User already joined - get their participant record
        setParticipantId(data.participant_id || data.id);
      } else {
        showToast(data.error || 'Failed to join hunt', 'error');
      }
    } catch {
      showToast('Failed to join hunt', 'error');
    } finally {
      setIsJoining(false);
    }
  }, [token, participantId, showToast]);

  useEffect(() => {
    if (params.id) {
      fetchHunt(params.id as string);
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [params.id]);

  // Stop timer when hunt is complete
  useEffect(() => {
    if (showCompletion && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, [showCompletion]);

  // Join hunt when authenticated and hunt is loaded
  useEffect(() => {
    if (hunt && isAuthenticated && token && !participantId && !isJoining) {
      joinHunt(hunt.id);
    }
  }, [hunt, isAuthenticated, token, participantId, isJoining, joinHunt]);

  const fetchHunt = async (id: string) => {
    try {
      const res = await fetch(`/api/hunts/${id}`);
      if (!res.ok) throw new Error('Hunt not found');
      const data = await res.json();
      setHunt(data);
    } catch {
      showToast('Failed to load hunt', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentChallenge = hunt?.challenges[currentIndex];
  const progress = hunt ? (completedChallenges.size / hunt.challenges.length) * 100 : 0;

  // Submit challenge completion to backend
  const submitChallenge = useCallback(async (
    challengeId: string,
    submissionType: string,
    submissionData: Record<string, unknown>
  ): Promise<{ success: boolean; points?: number }> => {
    if (!participantId || !token) {
      // If not authenticated, allow local-only play
      return { success: true };
    }

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participant_id: participantId,
          challenge_id: challengeId,
          submission_type: submissionType,
          submission_data: submissionData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        return { success: true, points: data.points_awarded };
      } else if (res.ok && !data.verified) {
        showToast(data.reason || 'Incorrect answer', 'error');
        return { success: false };
      } else {
        showToast(data.error || 'Submission failed', 'error');
        return { success: false };
      }
    } catch {
      showToast('Failed to submit challenge', 'error');
      return { success: false };
    }
  }, [participantId, token, showToast]);

  const completeChallenge = async (
    challengeId: string,
    points: number,
    submissionType?: string,
    submissionData?: Record<string, unknown>
  ): Promise<boolean> => {
    if (completedChallenges.has(challengeId)) return true;

    // Submit to backend if authenticated
    if (participantId && token && submissionType) {
      const result = await submitChallenge(challengeId, submissionType, submissionData || {});
      if (!result.success) {
        return false; // Don't mark as complete if submission failed
      }
      // Use server-awarded points if available
      if (result.points !== undefined) {
        points = result.points;
      }
    }

    setCompletedChallenges(prev => new Set([...prev, challengeId]));
    setScore(prev => prev + points);

    // Check if hunt is complete
    if (hunt && completedChallenges.size + 1 >= hunt.challenges.length) {
      setTimeout(() => setShowCompletion(true), 500);
    } else {
      // Move to next challenge
      setTimeout(() => {
        if (currentIndex < (hunt?.challenges.length || 1) - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }, 1000);
    }

    return true;
  };

  const handleTextAnswer = async () => {
    if (!currentChallenge) return;

    // Submit to server for verification
    const success = await completeChallenge(
      currentChallenge.id,
      currentChallenge.points,
      'text_answer',
      { answer: textAnswer }
    );

    if (success) {
      setAnswerFeedback('correct');
      setTimeout(() => {
        setAnswerFeedback(null);
        setTextAnswer('');
      }, 2000);
    } else {
      setAnswerFeedback('incorrect');
      setTimeout(() => {
        setAnswerFeedback(null);
      }, 2000);
    }
  };

  const handleManualComplete = async () => {
    if (currentChallenge) {
      await completeChallenge(
        currentChallenge.id,
        currentChallenge.points,
        'manual',
        {}
      );
    }
  };

  // Photo verification handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Photo must be less than 10MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = async () => {
    if (!photoPreview || !currentChallenge) return;

    setIsUploadingPhoto(true);
    try {
      // Submit photo as base64 data (in production, upload to storage first)
      const success = await completeChallenge(
        currentChallenge.id,
        currentChallenge.points,
        'photo',
        { photoData: photoPreview }
      );

      if (success) {
        showToast('Photo verified!', 'success');
        setPhotoPreview(null);
      }
    } catch {
      showToast('Failed to verify photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // GPS verification handler
  const handleGPSVerification = () => {
    if (!currentChallenge) return;

    setIsCheckingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsCheckingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        // Submit to backend for verification
        const success = await completeChallenge(
          currentChallenge.id,
          currentChallenge.points,
          'gps',
          { latitude: userLat, longitude: userLng }
        );

        if (success) {
          showToast('Location verified!', 'success');
        }
        setIsCheckingLocation(false);
      },
      (error) => {
        setIsCheckingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('An error occurred getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // QR code verification - simplified for web (manual input)
  const [qrInput, setQrInput] = useState('');

  const handleQRVerification = async () => {
    if (!currentChallenge || !qrInput.trim()) return;

    // Submit to backend for verification
    const success = await completeChallenge(
      currentChallenge.id,
      currentChallenge.points,
      'qr_code',
      { code: qrInput.trim() }
    );

    if (success) {
      showToast('QR code verified!', 'success');
      setQrInput('');
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8B949E]">Loading hunt...</p>
        </div>
      </main>
    );
  }

  if (!hunt || !currentChallenge) {
    return (
      <main className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8B949E] mb-4">Hunt not found</p>
          <Button onClick={() => router.push('/hunts')}>Back to Hunts</Button>
        </div>
      </main>
    );
  }

  const Icon = getVerificationIcon(currentChallenge.verification_type);
  const isCompleted = completedChallenges.has(currentChallenge.id);

  return (
    <main className="min-h-screen bg-[#0D1117]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0D1117]/95 backdrop-blur-xl border-b border-[#21262D]">
        {/* Progress Bar */}
        <div className="h-1 bg-[#21262D]">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFE66D]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push(`/hunt/${hunt.id}`)}
              className="flex items-center gap-2 text-[#8B949E] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
            
            <h1 className="font-semibold text-white truncate max-w-[200px]">{hunt.title}</h1>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[#8B949E]">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              <div className="flex items-center gap-1 text-[#FF6B35]">
                <Trophy className="w-4 h-4" />
                <span className="font-bold">{score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-32 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Challenge Card */}
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={`bg-[#161B22] rounded-2xl border ${isCompleted ? 'border-green-500/50' : 'border-[#30363D]'} overflow-hidden`}
          >
            {/* Challenge Header */}
            <div className="p-6 border-b border-[#21262D]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#8B949E]">
                  Challenge {currentIndex + 1} of {hunt.challenges.length}
                </span>
                <span className={`text-lg font-bold ${isCompleted ? 'text-green-400' : 'text-[#FF6B35]'}`}>
                  {isCompleted ? '✓ ' : ''}{currentChallenge.points} pts
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{currentChallenge.title}</h2>
              <p className="text-[#8B949E] text-lg">{currentChallenge.description}</p>
            </div>

            {/* Verification Section */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 text-[#8B949E]">
                <div className="w-10 h-10 rounded-xl bg-[#21262D] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <span>
                  {currentChallenge.verification_type === 'photo' && 'Take a photo to verify'}
                  {currentChallenge.verification_type === 'gps' && 'Go to the location'}
                  {currentChallenge.verification_type === 'qr_code' && 'Scan a QR code'}
                  {currentChallenge.verification_type === 'text_answer' && 'Enter your answer'}
                  {currentChallenge.verification_type === 'manual' && 'Mark as complete'}
                </span>
              </div>

              {/* Text Answer Input */}
              {currentChallenge.verification_type === 'text_answer' && !isCompleted && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className={`w-full px-4 py-3 rounded-xl bg-[#21262D] border ${
                      answerFeedback === 'correct' ? 'border-green-500' :
                      answerFeedback === 'incorrect' ? 'border-red-500' :
                      'border-[#30363D]'
                    } text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]`}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextAnswer()}
                  />
                  <Button onClick={handleTextAnswer} className="w-full" disabled={!textAnswer.trim()}>
                    Submit Answer
                  </Button>
                  {answerFeedback === 'incorrect' && (
                    <p className="text-red-400 text-center">Incorrect! Try again.</p>
                  )}
                </div>
              )}

              {/* Photo Verification */}
              {currentChallenge.verification_type === 'photo' && !isCompleted && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {!photoPreview ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-5 h-5" />
                        Take Photo
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.removeAttribute('capture');
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Upload className="w-5 h-5" />
                        Upload Photo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full max-h-64 object-cover"
                        />
                        <button
                          onClick={() => setPhotoPreview(null)}
                          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <Button
                        onClick={handlePhotoSubmit}
                        className="w-full"
                        disabled={isUploadingPhoto}
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Submit Photo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* GPS Verification */}
              {currentChallenge.verification_type === 'gps' && !isCompleted && (
                <div className="space-y-4">
                  <Button
                    onClick={handleGPSVerification}
                    className="w-full"
                    disabled={isCheckingLocation}
                  >
                    {isCheckingLocation ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Checking Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5" />
                        Verify My Location
                      </>
                    )}
                  </Button>

                  {locationError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-sm">{locationError}</p>
                    </div>
                  )}

                  {userLocation && !locationError && (
                    <div className="p-4 rounded-xl bg-[#21262D] border border-[#30363D]">
                      <p className="text-[#8B949E] text-sm">
                        Your location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code Verification */}
              {currentChallenge.verification_type === 'qr_code' && !isCompleted && (
                <div className="space-y-4">
                  <div className="bg-[#21262D] rounded-xl p-6 text-center">
                    <QrCode className="w-12 h-12 text-[#8B949E] mx-auto mb-4" />
                    <p className="text-[#8B949E] mb-4">
                      Find and scan the QR code, then enter the code below
                    </p>
                  </div>
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="Enter the code from the QR..."
                    className="w-full px-4 py-3 rounded-xl bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                    onKeyDown={(e) => e.key === 'Enter' && handleQRVerification()}
                  />
                  <Button
                    onClick={handleQRVerification}
                    className="w-full"
                    disabled={!qrInput.trim()}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Verify Code
                  </Button>
                </div>
              )}

              {/* Manual Complete */}
              {currentChallenge.verification_type === 'manual' && !isCompleted && (
                <Button onClick={handleManualComplete} className="w-full">
                  <CheckCircle className="w-5 h-5" />
                  Mark as Complete
                </Button>
              )}

              {/* Completed State */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-green-400 font-semibold text-lg">Challenge Complete!</p>
                  <p className="text-[#8B949E]">+{currentChallenge.points} points</p>
                </motion.div>
              )}

              {/* Hint */}
              {currentChallenge.hint && !isCompleted && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                    {showHint ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <p className="text-yellow-200">{currentChallenge.hint}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Challenge Navigation */}
          <button
            onClick={() => setShowChallengeList(!showChallengeList)}
            className="w-full mt-4 p-4 rounded-xl bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-white hover:border-[#484F58] transition-all flex items-center justify-between"
          >
            <span>View All Challenges</span>
            {showChallengeList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <AnimatePresence>
            {showChallengeList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2">
                  {hunt.challenges.map((challenge, index) => {
                    const isComplete = completedChallenges.has(challenge.id);
                    const isCurrent = index === currentIndex;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => {
                          setCurrentIndex(index);
                          setShowChallengeList(false);
                        }}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          isCurrent 
                            ? 'bg-[#FF6B35]/10 border-[#FF6B35]' 
                            : isComplete
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-[#161B22] border-[#30363D] hover:border-[#484F58]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isComplete ? 'bg-green-500/20 text-green-400' : 'bg-[#21262D] text-[#8B949E]'
                            }`}>
                              {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                            </div>
                            <span className={isComplete ? 'text-green-400' : 'text-white'}>{challenge.title}</span>
                          </div>
                          <span className={`font-bold ${isComplete ? 'text-green-400' : 'text-[#FF6B35]'}`}>
                            {challenge.points}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0D1117]/95 backdrop-blur-xl border-t border-[#21262D] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </Button>
          
          <span className="text-[#8B949E]">
            {completedChallenges.size} / {hunt.challenges.length} complete
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.min(hunt.challenges.length - 1, prev + 1))}
            disabled={currentIndex >= hunt.challenges.length - 1}
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8 max-w-md w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <PartyPopper className="w-20 h-20 text-[#FFE66D] mx-auto mb-6" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">Hunt Complete!</h2>
              <p className="text-[#8B949E] mb-6">You&apos;ve conquered all the challenges!</p>
              
              <div className="bg-[#21262D] rounded-xl p-6 mb-6">
                <div className="text-4xl font-bold text-[#FF6B35] mb-2">{score}</div>
                <div className="text-[#8B949E]">Total Points</div>
                <div className="mt-4 pt-4 border-t border-[#30363D] flex justify-around">
                  <div>
                    <div className="text-xl font-bold text-white">{formatTime(timeElapsed)}</div>
                    <div className="text-xs text-[#8B949E]">Time</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{hunt.challenges.length}</div>
                    <div className="text-xs text-[#8B949E]">Challenges</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push('/hunts')} className="flex-1">
                  Back to Hunts
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    const shareText = `I completed "${hunt.title}" with ${score} points in ${formatTime(timeElapsed)}!`;
                    if (navigator.share) {
                      navigator.share({
                        title: 'Scavengers Hunt Complete!',
                        text: shareText,
                        url: window.location.origin + `/hunt/${hunt.id}`,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareText + ` ${window.location.origin}/hunt/${hunt.id}`);
                      showToast('Results copied to clipboard!', 'success');
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  Share Results
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
