'use client';

import { Hunt } from '@/types';
import { formatDuration, getDifficultyColor } from '@/lib/utils';
import { MapPin, Clock, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface HuntCardProps {
  hunt: Hunt;
  onClick?: () => void;
  featured?: boolean;
}

const difficultyGradients = {
  easy: 'from-emerald-500/20 to-teal-500/20',
  medium: 'from-amber-500/20 to-orange-500/20',
  hard: 'from-rose-500/20 to-red-500/20',
};

const difficultyAccents = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-500',
  hard: 'bg-rose-500',
};

export function HuntCard({ hunt, onClick, featured = false }: HuntCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -6 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl cursor-pointer
        bg-gradient-to-br from-[#21262D] to-[#161B22]
        border border-[#30363D] hover:border-[#484F58]
        transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#FF6B35]/5
        ${featured ? 'md:col-span-2 md:row-span-2' : ''}
      `}
    >
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${difficultyGradients[hunt.difficulty]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {/* Difficulty indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${difficultyAccents[hunt.difficulty]} opacity-80`} />

      {/* Content */}
      <div className={`relative z-10 p-5 ${featured ? 'p-8' : ''}`}>
        {/* Header with tags and featured badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {hunt.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#30363D]/80 text-[#8B949E] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          {featured && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35]">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-semibold">Featured</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className={`font-display tracking-wide text-white mb-2 group-hover:text-[#FF6B35] transition-colors ${featured ? 'text-4xl' : 'text-2xl'}`}>
          {hunt.title}
        </h3>

        {/* Description */}
        <p className={`text-[#8B949E] mb-4 line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>
          {hunt.description}
        </p>

        {/* Stats Grid */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Difficulty Badge */}
          <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${getDifficultyColor(hunt.difficulty)}`}>
            {hunt.difficulty.toUpperCase()}
          </span>

          {/* Duration */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#30363D]/50 text-[#8B949E]">
            <Clock size={14} className="text-[#FFE66D]" />
            <span className="text-xs font-medium">{formatDuration(hunt.estimatedTime)}</span>
          </div>

          {/* Challenges */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#30363D]/50 text-[#8B949E]">
            <Trophy size={14} className="text-[#FF6B35]" />
            <span className="text-xs font-medium">{hunt.challengeCount} challenges</span>
          </div>
        </div>

        {/* Location and CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-[#30363D]/50">
          {hunt.location ? (
            <div className="flex items-center gap-1.5 text-[#8B949E]">
              <MapPin size={14} className="text-[#FF6B35]" />
              <span className="text-sm">{hunt.location}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#484F58]">
              <MapPin size={14} />
              <span className="text-sm">Any location</span>
            </div>
          )}

          <motion.div
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-1 text-[#FF6B35] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View Hunt
            <ChevronRight size={16} />
          </motion.div>
        </div>
      </div>

      {/* Decorative corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#FF6B35] to-transparent blur-xl" />
      </div>
    </motion.div>
  );
}
