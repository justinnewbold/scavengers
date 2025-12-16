'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar, Hero, Features, HuntCard, CreateHuntModal } from '@/components';
import { useHuntStore } from '@/stores/huntStore';
import { demoHunts } from '@/lib/ai';
import { Hunt } from '@/types';

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { hunts, setHunts } = useHuntStore();

  useEffect(() => {
    if (hunts.length === 0) {
      setHunts(demoHunts as Hunt[]);
    }
  }, [hunts.length, setHunts]);

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
            {hunts.map((hunt, index) => (
              <motion.div
                key={hunt.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <HuntCard hunt={hunt} featured={index === 0} />
              </motion.div>
            ))}
          </div>

          {hunts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#8B949E] text-lg">No hunts yet. Create your first one!</p>
            </div>
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
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-[#484F58] text-sm">
            © 2024 Scavengers. Made for humans.
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
