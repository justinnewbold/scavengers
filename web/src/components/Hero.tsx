'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play } from 'lucide-react';
import { Button } from './Button';

interface HeroProps {
  onCreateClick: () => void;
}

export function Hero({ onCreateClick }: HeroProps) {
  const router = useRouter();
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient Mesh */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#FF6B35]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#1A535C]/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#FFE66D]/10 rounded-full blur-[80px]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#21262D]/80 border border-[#30363D] mb-8"
        >
          <Sparkles className="w-4 h-4 text-[#FFE66D]" />
          <span className="text-sm text-[#8B949E]">AI-Powered Scavenger Hunts</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight mb-6"
        >
          HUNT.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF6B35] to-[#FFE66D]">
            DISCOVER.
          </span>{' '}
          WIN.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-[#8B949E] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Create amazing scavenger hunts in seconds with AI. 
          Free for small groups. No ads. Ever.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="primary" size="lg" onClick={onCreateClick}>
            <Sparkles className="w-5 h-5" />
            Create with AI
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/hunts')}>
            <Play className="w-5 h-5" />
            Join a Hunt
          </Button>
        </motion.div>

        {/* Features highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-8 mt-16"
        >
          {[
            { value: 'Free', label: 'No Credit Card' },
            { value: 'AI', label: 'Instant Creation' },
            { value: 'Fun', label: 'For All Ages' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl md:text-4xl text-white">{stat.value}</div>
              <div className="text-sm text-[#8B949E]">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-[#30363D] flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-3 rounded-full bg-[#FF6B35]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
