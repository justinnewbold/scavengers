'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Camera,
  MapPin,
  Users,
  Wifi,
  DollarSign
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Creation',
    description: 'Generate complete scavenger hunts in seconds. Just pick a theme and let AI do the rest.',
    color: 'from-[#FF6B35] to-[#FF8B5C]',
  },
  {
    icon: Camera,
    title: 'Smart Photo Verification',
    description: 'Camera with zoom, flash control, and AI verification to confirm challenge completion.',
    color: 'from-[#1A535C] to-[#2D7A85]',
  },
  {
    icon: MapPin,
    title: 'GPS & QR Challenges',
    description: 'Location-based tasks and QR code scans for diverse, engaging hunt experiences.',
    color: 'from-[#FFE66D] to-[#FFD93D]',
  },
  {
    icon: Users,
    title: 'Teams & Solo Play',
    description: 'Play alone or form teams. Real-time leaderboards keep the competition exciting.',
    color: 'from-[#6B5CE7] to-[#8B7CF7]',
  },
  {
    icon: Wifi,
    title: 'Full Offline Mode',
    description: 'Download hunts and play without internet. Perfect for remote locations.',
    color: 'from-[#10B981] to-[#34D399]',
  },
  {
    icon: DollarSign,
    title: 'Affordable Pricing',
    description: 'Free for groups up to 15. Just $4.99/month for unlimited everything.',
    color: 'from-[#F472B6] to-[#FB7185]',
  },
];

export function Features() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-5xl md:text-6xl text-white mb-4">
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
              className="group relative p-6 rounded-2xl bg-[#161B22] border border-[#30363D] hover:border-[#484F58] transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-[#8B949E] leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
