'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Zap, Users, MapPin } from 'lucide-react';
import { Button } from './Button';

interface HeroProps {
  onCreateClick: () => void;
}

export function Hero({ onCreateClick }: HeroProps) {
  const router = useRouter();

  const floatingElements = [
    { icon: MapPin, color: 'from-orange-500 to-red-500', delay: 0, position: 'top-20 left-[15%]' },
    { icon: Zap, color: 'from-yellow-400 to-amber-500', delay: 0.2, position: 'top-32 right-[20%]' },
    { icon: Users, color: 'from-emerald-400 to-teal-500', delay: 0.4, position: 'bottom-32 left-[10%]' },
    { icon: Sparkles, color: 'from-purple-500 to-pink-500', delay: 0.6, position: 'bottom-40 right-[15%]' },
  ];

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-gradient-to-r from-[#FF6B35] to-[#FF8B5C] rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-r from-[#1A535C] to-[#2D7A85] rounded-full blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-[#FFE66D] to-[#FFD93D] rounded-full blur-[100px]"
        />

        {/* Grid Pattern with fade */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </div>

      {/* Floating Icons */}
      {floatingElements.map((el, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + el.delay, duration: 0.5 }}
          className={`absolute ${el.position} hidden lg:block`}
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${el.color} flex items-center justify-center shadow-2xl`}
          >
            <el.icon className="w-7 h-7 text-white" />
          </motion.div>
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#21262D]/90 to-[#30363D]/90 border border-[#484F58]/50 mb-8 backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-[#FFE66D]" />
          </motion.div>
          <span className="text-sm font-medium text-white">AI-Powered Scavenger Hunts</span>
          <span className="px-2 py-0.5 text-xs font-bold bg-[#FF6B35] rounded-full text-white">NEW</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] text-white tracking-tight mb-6 leading-[0.9]"
        >
          <span className="block">HUNT.</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#FF6B35] via-[#FF8B5C] to-[#FFE66D]">
            DISCOVER.
          </span>
          <span className="block">WIN.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-[#8B949E] max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Create amazing scavenger hunts in{' '}
          <span className="text-[#FF6B35] font-semibold">seconds</span> with AI.
          Free for small groups. No ads.{' '}
          <span className="text-[#FFE66D] font-semibold">Ever.</span>
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-8 sm:gap-16 mt-16"
        >
          {[
            { value: 'FREE', label: 'No Credit Card', color: 'text-emerald-400' },
            { value: '30s', label: 'To Create', color: 'text-[#FF6B35]' },
            { value: 'ALL', label: 'Ages Welcome', color: 'text-[#FFE66D]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="text-center"
            >
              <div className={`font-display text-4xl md:text-5xl ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-[#8B949E] mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-7 h-12 rounded-full border-2 border-[#484F58] flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ height: ['8px', '16px', '8px'], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 rounded-full bg-gradient-to-b from-[#FF6B35] to-[#FFE66D]"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
