'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Map, Trophy, MoreVertical, Trash2, Play, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { CreateHuntModal } from '@/components/CreateHuntModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

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

export default function MyHuntsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  const fetchHunts = useCallback(async () => {
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/hunts', { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch hunts');
      }
      const data = await res.json();
      setHunts(data.hunts || []);
    } catch {
      setError('Failed to load hunts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHunts();
  }, [fetchHunts]);

  const deleteHunt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hunt?')) return;

    // Store original hunts for rollback
    const originalHunts = hunts;

    try {
      const headers: HeadersInit = { };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`/api/hunts/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Remove from state after successful deletion
      setHunts(hunts.filter(h => h.id !== id));
      showToast('Hunt deleted successfully', 'success');
    } catch (err) {
      // Rollback on failure
      setHunts(originalHunts);
      showToast(err instanceof Error ? err.message : 'Failed to delete hunt', 'error');
    }
  };

  const duplicateHunt = async (hunt: Hunt) => {
    if (!token) {
      showToast('Please log in to duplicate hunts', 'error');
      return;
    }

    try {
      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...hunt,
          title: `${hunt.title} (Copy)`,
          status: 'draft',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to duplicate');
      }
      const newHunt = await res.json();
      setHunts([newHunt, ...hunts]);
      showToast('Hunt duplicated successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to duplicate hunt', 'error');
    }
  };

  const filteredHunts = hunts.filter(h => filter === 'all' || h.status === filter);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'hard': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'completed': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <main className="min-h-screen bg-[#0D1117]">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl text-white mb-2">My Hunts</h1>
            <p className="text-[#8B949E]">Manage and track your scavenger hunts</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5" />
            Create Hunt
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(['all', 'active', 'draft', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === tab
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-[#21262D] text-[#8B949E] hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                  {hunts.filter(h => h.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Hunts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-[#161B22] rounded-2xl p-6 h-64" />
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Map className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-[#8B949E] mb-6">{error}</p>
            <Button onClick={fetchHunts}>
              Try Again
            </Button>
          </motion.div>
        ) : filteredHunts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Map className="w-16 h-16 text-[#30363D] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No hunts yet</h3>
            <p className="text-[#8B949E] mb-6">Create your first scavenger hunt and share it with friends!</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5" />
              Create Your First Hunt
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHunts.map((hunt, index) => (
              <motion.div
                key={hunt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-[#161B22] rounded-2xl border border-[#30363D] hover:border-[#484F58] transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(hunt.status)}`}>
                        {hunt.status}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getDifficultyColor(hunt.difficulty)}`}>
                        {hunt.difficulty}
                      </span>
                    </div>
                    
                    {/* Menu */}
                    <div className="relative" ref={activeMenu === hunt.id ? menuRef : undefined}>
                      <button
                        onClick={() => setActiveMenu(activeMenu === hunt.id ? null : hunt.id)}
                        className="p-1 rounded-lg hover:bg-[#21262D] transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-[#8B949E]" />
                      </button>

                      {activeMenu === hunt.id && (
                        <div className="absolute right-0 top-8 w-48 bg-[#21262D] rounded-xl border border-[#30363D] shadow-xl z-10 overflow-hidden">
                          <Link
                            href={`/hunt/${hunt.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#30363D] transition-colors text-white"
                          >
                            <Play className="w-4 h-4" />
                            View Hunt
                          </Link>
                          <button
                            onClick={() => duplicateHunt(hunt)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#30363D] transition-colors text-white"
                          >
                            <Share2 className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteHunt(hunt.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#30363D] transition-colors text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-1">{hunt.title}</h3>
                  <p className="text-[#8B949E] text-sm line-clamp-2 mb-4">{hunt.description}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-[#8B949E]">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      <span>{hunt.challenges?.reduce((sum, c) => sum + c.points, 0) || 0} pts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Map className="w-4 h-4" />
                      <span>{hunt.challenges?.length || 0} challenges</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-[#0D1117] border-t border-[#21262D] flex items-center justify-between">
                  <span className="text-xs text-[#8B949E]">
                    Created {new Date(hunt.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/hunt/${hunt.id}`}
                    className="text-[#FF6B35] hover:text-[#FF8B5C] font-medium text-sm transition-colors"
                  >
                    Open →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateHuntModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(hunt) => {
          setHunts([hunt, ...hunts]);
          setShowCreateModal(false);
        }}
      />
    </main>
  );
}
