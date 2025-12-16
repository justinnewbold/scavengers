'use client';

import { Hunt } from '@/types';
import { formatDuration, getDifficultyColor } from '@/lib/utils';
import { MapPin, Clock, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface HuntCardProps {
  hunt: Hunt;
  onClick?: () => void;
  featured?: boolean;
}

export function HuntCard({ hunt, onClick, featured = false }: HuntCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        bg-gradient-to-br from-[#21262D] to-[#161B22]
        border border-[#30363D] hover:border-[#FF6B35]/50
        transition-all duration-300
        ${featured ? 'col-span-2 row-span-2' : ''}
      `}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/10 to-transparent" />
      </div>

      {/* Content */}
      <div className={`relative z-10 p-5 ${featured ? 'p-8' : ''}`}>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {hunt.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-[#1A535C]/30 text-[#FFE66D] border border-[#1A535C]/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className={`font-display tracking-wide text-white mb-2 ${featured ? 'text-4xl' : 'text-2xl'}`}>
          {hunt.title}
        </h3>

        {/* Description */}
        <p className={`text-[#8B949E] mb-4 line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>
          {hunt.description}
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Difficulty Badge */}
          <span className={`px-2 py-1 rounded-md border text-xs font-medium ${getDifficultyColor(hunt.difficulty)}`}>
            {hunt.difficulty.toUpperCase()}
          </span>

          {/* Duration */}
          <div className="flex items-center gap-1.5 text-[#8B949E]">
            <Clock size={14} />
            <span>{formatDuration(hunt.estimatedTime)}</span>
          </div>

          {/* Challenges */}
          <div className="flex items-center gap-1.5 text-[#8B949E]">
            <Trophy size={14} />
            <span>{hunt.challengeCount} challenges</span>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1.5 text-[#8B949E]">
            <Users size={14} />
            <span>{hunt.participantCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Location */}
        {hunt.location && (
          <div className="flex items-center gap-1.5 mt-3 text-[#FF6B35]">
            <MapPin size={14} />
            <span className="text-sm">{hunt.location}</span>
          </div>
        )}
      </div>

      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#FF6B35] to-transparent" />
      </div>
    </motion.div>
  );
}
