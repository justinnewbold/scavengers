'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Compass, Plus, User, Menu, X } from 'lucide-react';
import { Button } from './Button';

interface NavbarProps {
  onCreateClick: () => void;
}

export function Navbar({ onCreateClick }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/my-hunts', label: 'My Hunts', icon: Map },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-[#0D1117]/90 backdrop-blur-xl border-b border-[#21262D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFE66D] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20">
              <Map className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl text-white tracking-wider hidden sm:block">
              SCAVENGERS
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 text-[#8B949E] hover:text-white transition-colors"
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Create Button */}
          <div className="hidden md:block">
            <Button variant="primary" size="sm" onClick={onCreateClick}>
              <Plus className="w-4 h-4" />
              Create Hunt
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#21262D] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#161B22] border-b border-[#21262D] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              ))}
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onCreateClick();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create Hunt
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
