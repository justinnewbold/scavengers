'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Sparkles, Plus, Trash2, GripVertical,
  Camera, MapPin, QrCode, MessageSquare, CheckCircle, Wand2,
  Save, Eye, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

type VerificationType = 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  verification_type: VerificationType;
  verification_data?: any;
  hint?: string;
}

type Step = 'basics' | 'challenges' | 'review';

export default function CreateHuntPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('basics');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Hunt data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isPublic, setIsPublic] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  // AI Generation
  const [aiTheme, setAiTheme] = useState('');
  const [aiChallengeCount, setAiChallengeCount] = useState(5);

  const addChallenge = () => {
    setChallenges([
      ...challenges,
      {
        id: `temp-${Date.now()}`,
        title: '',
        description: '',
        points: 10,
        verification_type: 'manual',
        hint: '',
      },
    ]);
  };

  const updateChallenge = (index: number, updates: Partial<Challenge>) => {
    const newChallenges = [...challenges];
    newChallenges[index] = { ...newChallenges[index], ...updates };
    setChallenges(newChallenges);
  };

  const removeChallenge = (index: number) => {
    setChallenges(challenges.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    if (!aiTheme.trim()) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: aiTheme,
          difficulty,
          challenge_count: aiChallengeCount,
          include_photo_challenges: true,
          include_gps_challenges: false,
        }),
      });
      
      const data = await res.json();
      
      if (data.title) {
        setTitle(data.title);
        setDescription(data.description || '');
        setChallenges(data.challenges?.map((c: any, i: number) => ({
          id: `temp-${Date.now()}-${i}`,
          ...c,
        })) || []);
        setStep('challenges');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      showToast('Failed to generate hunt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveHunt = async (status: 'draft' | 'active') => {
    if (!title.trim()) {
      showToast('Please enter a title', 'warning');
      return;
    }
    
    if (challenges.length === 0) {
      showToast('Please add at least one challenge', 'warning');
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          is_public: isPublic,
          status,
          challenges: challenges.map((c, i) => ({
            ...c,
            order_index: i,
          })),
        }),
      });
      
      const hunt = await res.json();
      router.push(`/hunt/${hunt.id}`);
    } catch (error) {
      console.error('Failed to save hunt:', error);
      showToast('Failed to save hunt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const verificationOptions: { type: VerificationType; icon: typeof Camera; label: string; desc: string }[] = [
    { type: 'photo', icon: Camera, label: 'Photo', desc: 'Take a photo to verify' },
    { type: 'gps', icon: MapPin, label: 'GPS', desc: 'Visit a location' },
    { type: 'qr_code', icon: QrCode, label: 'QR Code', desc: 'Scan a QR code' },
    { type: 'text_answer', icon: MessageSquare, label: 'Text', desc: 'Enter an answer' },
    { type: 'manual', icon: CheckCircle, label: 'Manual', desc: 'Self-verify' },
  ];

  const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);

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

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(['basics', 'challenges', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-all ${
                  step === s 
                    ? 'bg-[#FF6B35] text-white' 
                    : 'bg-[#21262D] text-[#8B949E] hover:bg-[#30363D]'
                }`}
              >
                {i + 1}
              </button>
              {i < 2 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  ['challenges', 'review'].indexOf(step) > i ? 'bg-[#FF6B35]' : 'bg-[#21262D]'
                }`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Basics */}
          {step === 'basics' && (
            <motion.div
              key="basics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">Create a New Hunt</h1>
              <p className="text-[#8B949E] mb-8">Start with the basics or let AI generate everything</p>

              {/* AI Generation Card */}
              <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#1A535C]/10 rounded-2xl border border-[#30363D] p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Quick Create</h3>
                    <p className="text-sm text-[#8B949E]">Generate a complete hunt with one click</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={aiTheme}
                      onChange={(e) => setAiTheme(e.target.value)}
                      placeholder="Enter a theme (e.g., 'Nature walk in the park')"
                      className="w-full px-4 py-3 rounded-xl bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                    />
                  </div>
                  <div>
                    <select
                      value={aiChallengeCount}
                      onChange={(e) => setAiChallengeCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-[#21262D] border border-[#30363D] text-white focus:outline-none focus:border-[#FF6B35]"
                    >
                      {[3, 5, 7, 10].map(n => (
                        <option key={n} value={n}>{n} challenges</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <Button onClick={generateWithAI} disabled={!aiTheme.trim() || isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-[#8B949E] mb-8">— or create manually —</div>

              {/* Manual Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Hunt Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your hunt a catchy name"
                    className="w-full px-4 py-3 rounded-xl bg-[#161B22] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this hunt about?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-[#161B22] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Difficulty</label>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                            difficulty === d
                              ? d === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                d === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-[#21262D] text-[#8B949E] border border-[#30363D] hover:border-[#484F58]'
                          }`}
                        >
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Visibility</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          isPublic
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-[#21262D] text-[#8B949E] border border-[#30363D] hover:border-[#484F58]'
                        }`}
                      >
                        Public
                      </button>
                      <button
                        onClick={() => setIsPublic(false)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          !isPublic
                            ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            : 'bg-[#21262D] text-[#8B949E] border border-[#30363D] hover:border-[#484F58]'
                        }`}
                      >
                        Private
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep('challenges')} disabled={!title.trim()}>
                    Next: Add Challenges
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Challenges */}
          {step === 'challenges' && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Add Challenges</h1>
                  <p className="text-[#8B949E]">{challenges.length} challenges • {totalPoints} total points</p>
                </div>
                <Button onClick={addChallenge} variant="outline">
                  <Plus className="w-4 h-4" />
                  Add Challenge
                </Button>
              </div>

              {challenges.length === 0 ? (
                <div className="text-center py-16 bg-[#161B22] rounded-2xl border border-[#30363D]">
                  <Plus className="w-12 h-12 text-[#30363D] mx-auto mb-4" />
                  <p className="text-[#8B949E] mb-4">No challenges yet. Add your first one!</p>
                  <Button onClick={addChallenge}>
                    <Plus className="w-4 h-4" />
                    Add Challenge
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {challenges.map((challenge, index) => (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#161B22] rounded-xl border border-[#30363D] p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 text-[#8B949E]">
                          <GripVertical className="w-5 h-5 cursor-grab" />
                          <span className="w-8 h-8 rounded-lg bg-[#21262D] flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                              <input
                                type="text"
                                value={challenge.title}
                                onChange={(e) => updateChallenge(index, { title: e.target.value })}
                                placeholder="Challenge title"
                                className="w-full px-4 py-2 rounded-lg bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={challenge.points}
                                  onChange={(e) => updateChallenge(index, { points: Number(e.target.value) })}
                                  min={1}
                                  max={100}
                                  className="w-full px-4 py-2 rounded-lg bg-[#21262D] border border-[#30363D] text-white focus:outline-none focus:border-[#FF6B35]"
                                />
                                <span className="text-[#8B949E] whitespace-nowrap">pts</span>
                              </div>
                            </div>
                          </div>
                          
                          <textarea
                            value={challenge.description}
                            onChange={(e) => updateChallenge(index, { description: e.target.value })}
                            placeholder="What should the player do?"
                            rows={2}
                            className="w-full px-4 py-2 rounded-lg bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35] resize-none"
                          />
                          
                          <div>
                            <label className="block text-xs font-medium text-[#8B949E] mb-2">Verification Method</label>
                            <div className="flex flex-wrap gap-2">
                              {verificationOptions.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                  <button
                                    key={opt.type}
                                    onClick={() => updateChallenge(index, { verification_type: opt.type })}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                      challenge.verification_type === opt.type
                                        ? 'bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30'
                                        : 'bg-[#21262D] text-[#8B949E] border border-[#30363D] hover:border-[#484F58]'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Text answer specific field */}
                          {challenge.verification_type === 'text_answer' && (
                            <div>
                              <label className="block text-xs font-medium text-[#8B949E] mb-2">Correct Answer</label>
                              <input
                                type="text"
                                value={challenge.verification_data?.correct_answer || ''}
                                onChange={(e) => updateChallenge(index, { 
                                  verification_data: { correct_answer: e.target.value, case_sensitive: false }
                                })}
                                placeholder="The answer players need to enter"
                                className="w-full px-4 py-2 rounded-lg bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                              />
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-xs font-medium text-[#8B949E] mb-2">Hint (optional)</label>
                            <input
                              type="text"
                              value={challenge.hint || ''}
                              onChange={(e) => updateChallenge(index, { hint: e.target.value })}
                              placeholder="Give players a helpful hint"
                              className="w-full px-4 py-2 rounded-lg bg-[#21262D] border border-[#30363D] text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FF6B35]"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeChallenge(index)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-[#8B949E] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep('basics')}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button onClick={() => setStep('review')} disabled={challenges.length === 0}>
                  Review & Publish
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">Review Your Hunt</h1>
              <p className="text-[#8B949E] mb-8">Make sure everything looks good before publishing</p>

              {/* Hunt Preview */}
              <div className="bg-[#161B22] rounded-2xl border border-[#30363D] p-8 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    difficulty === 'easy' ? 'text-green-400 bg-green-400/10' :
                    difficulty === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                    'text-red-400 bg-red-400/10'
                  }`}>
                    {difficulty.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    isPublic ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 bg-gray-400/10'
                  }`}>
                    {isPublic ? 'PUBLIC' : 'PRIVATE'}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                <p className="text-[#8B949E] mb-6">{description}</p>
                
                <div className="flex gap-6 text-sm text-[#8B949E]">
                  <span>{challenges.length} challenges</span>
                  <span>{totalPoints} total points</span>
                  <span>~{Math.ceil(challenges.length * 5)} min</span>
                </div>
              </div>

              {/* Challenges Summary */}
              <div className="space-y-2 mb-8">
                {challenges.map((challenge, index) => (
                  <div
                    key={challenge.id}
                    className="flex items-center justify-between p-4 bg-[#161B22] rounded-xl border border-[#30363D]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#21262D] flex items-center justify-center text-sm font-bold text-[#8B949E]">
                        {index + 1}
                      </span>
                      <span className="text-white">{challenge.title}</span>
                    </div>
                    <span className="text-[#FF6B35] font-bold">{challenge.points} pts</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" onClick={() => setStep('challenges')} className="flex-1">
                  <ArrowLeft className="w-4 h-4" />
                  Edit Challenges
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => saveHunt('draft')} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4" />
                  Save as Draft
                </Button>
                <Button 
                  onClick={() => saveHunt('active')} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Publish Hunt
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
