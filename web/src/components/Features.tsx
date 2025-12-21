'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Camera,
  MapPin,
  Users,
  Wifi,
  Zap
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Creation',
    description: 'Generate complete scavenger hunts in seconds. Just pick a theme and let AI do the rest.',
    color: 'from-[#FF6B35] to-[#FF8B5C]',
    iconBg: 'bg-[#FF6B35]/10',
    borderColor: 'group-hover:border-[#FF6B35]/50',
  },
  {
    icon: Camera,
    title: 'Smart Photo Verification',
    description: 'Camera with zoom, flash control, and AI verification to confirm challenge completion.',
    color: 'from-[#1A535C] to-[#2D7A85]',
    iconBg: 'bg-[#1A535C]/20',
    borderColor: 'group-hover:border-[#1A535C]/50',
  },
  {
    icon: MapPin,
    title: 'GPS & QR Challenges',
    description: 'Location-based tasks and QR code scans for diverse, engaging hunt experiences.',
    color: 'from-[#FFE66D] to-[#FFD93D]',
    iconBg: 'bg-[#FFE66D]/10',
    borderColor: 'group-hover:border-[#FFE66D]/50',
  },
  {
    icon: Users,
    title: 'Teams & Solo Play',
    description: 'Play alone or form teams. Real-time leaderboards keep the competition exciting.',
    color: 'from-[#8B5CF6] to-[#A78BFA]',
    iconBg: 'bg-[#8B5CF6]/10',
    borderColor: 'group-hover:border-[#8B5CF6]/50',
  },
  {
    icon: Wifi,
    title: 'Full Offline Mode',
    description: 'Download hunts and play without internet. Perfect for remote locations.',
    color: 'from-[#10B981] to-[#34D399]',
    iconBg: 'bg-[#10B981]/10',
    borderColor: 'group-hover:border-[#10B981]/50',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized for speed. No waiting, no loading screens. Just pure adventure.',
    color: 'from-[#F59E0B] to-[#FBBF24]',
    iconBg: 'bg-[#F59E0B]/10',
    borderColor: 'group-hover:border-[#F59E0B]/50',
  },
];

export function Features() {
  return (
    <section className="py-32 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#FF6B35]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#1A535C]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#21262D] border border-[#30363D] mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-sm text-[#8B949E]">Powerful Features</span>
          </motion.div>
          <h2 className="font-display text-5xl md:text-7xl text-white mb-6">
            EVERYTHING YOU NEED
          </h2>
          <p className="text-xl text-[#8B949E] max-w-2xl mx-auto">
            Built for humans who want to have fun, not fight software
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`group relative p-7 rounded-2xl bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#30363D] ${feature.borderColor} transition-all duration-300`}
            >
              {/* Icon with animated ring */}
              <div className="relative mb-5">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className={`absolute -inset-1 rounded-xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-300`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-[#8B949E] leading-relaxed text-sm">
                {feature.description}
              </p>

              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-tr-2xl rounded-bl-[100px] transition-opacity duration-300`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
