'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar, Hero, Features, HuntCard, CreateHuntModal } from '@/components';
import { useHuntStore } from '@/stores/huntStore';
import { Hunt } from '@/types';

export default function Home() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { hunts, setHunts } = useHuntStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch public hunts from API
  useEffect(() => {
    async function fetchPublicHunts() {
      try {
        const res = await fetch('/api/hunts?public=true&limit=6');
        if (res.ok) {
          const data = await res.json();
          // Transform API hunts to match Hunt type
          const apiHunts = (data.hunts || []).map((h: Record<string, unknown>) => ({
            id: h.id,
            title: h.title,
            description: h.description,
            difficulty: h.difficulty,
            estimatedTime: h.duration_minutes || 60,
            challengeCount: Array.isArray(h.challenges) ? h.challenges.length : 0,
            location: h.location,
            isPublic: h.is_public,
            createdAt: h.created_at,
            createdBy: 'Community',
            tags: [h.difficulty as string, 'scavenger-hunt'],
          }));
          setHunts(apiHunts as Hunt[]);
        } else {
          setError('Failed to load hunts');
          setHunts([]);
        }
      } catch (err) {
        console.error('Failed to fetch hunts:', err);
        setError('Unable to connect to server');
        setHunts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublicHunts();
  }, [setHunts]);

  return (
    <main className="min-h-screen bg-[#0D1117]">
      <Navbar onCreateClick={() => setIsCreateModalOpen(true)} />
      
      <Hero onCreateClick={() => setIsCreateModalOpen(true)} />

      <Features />

      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <h2 className="font-display text-5xl md:text-6xl text-white mb-2">
                DISCOVER HUNTS
              </h2>
              <p className="text-xl text-[#8B949E]">
                Join adventures created by the community
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeleton
              [1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-[#161B22] rounded-2xl h-64" />
              ))
            ) : (
              hunts.map((hunt, index) => (
                <motion.div
                  key={hunt.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <HuntCard
                    hunt={hunt}
                    featured={index === 0}
                    onClick={() => router.push(`/hunt/${hunt.id}`)}
                  />
                </motion.div>
              ))
            )}
          </div>

          {hunts.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-[#161B22] rounded-2xl border border-[#21262D]"
            >
              {error ? (
                <>
                  <div className="text-4xl mb-4">🔌</div>
                  <p className="text-[#8B949E] text-lg mb-2">{error}</p>
                  <p className="text-[#484F58] text-sm">Try refreshing the page</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">🗺️</div>
                  <p className="text-white text-xl mb-2">No hunts available yet</p>
                  <p className="text-[#8B949E] text-lg mb-6">Be the first to create an adventure!</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8B5C] text-white font-semibold"
                  >
                    Create a Hunt
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/10 to-[#1A535C]/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#FF6B35]/20 rounded-full blur-[150px]" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-5xl md:text-7xl text-white mb-6">
            START YOUR ADVENTURE
          </h2>
          <p className="text-xl text-[#8B949E] mb-8">
            Free for groups up to 15 people. No credit card required.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8B5C] text-white font-semibold text-xl shadow-2xl shadow-[#FF6B35]/30 hover:shadow-[#FF6B35]/50 transition-shadow"
          >
            Create Your First Hunt — Free
          </motion.button>
        </motion.div>
      </section>

      <footer className="py-12 px-4 border-t border-[#21262D]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FFE66D]" />
            <span className="font-display text-xl text-white tracking-wider">SCAVENGERS</span>
          </div>
          <div className="flex items-center gap-6 text-[#8B949E]">
            <Link href="/hunts" className="hover:text-white transition-colors">Browse Hunts</Link>
            <Link href="/create" className="hover:text-white transition-colors">Create</Link>
          </div>
          <p className="text-[#484F58] text-sm">
            © {new Date().getFullYear()} Scavengers. Made for humans.
          </p>
        </div>
      </footer>

      <CreateHuntModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </main>
  );
}
