'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Compass, Plus, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  onCreateClick?: () => void;
}

export function Navbar({ onCreateClick }: NavbarProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      router.push('/create');
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/hunts', label: 'My Hunts', icon: Map },
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

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={handleCreateClick}>
              <Plus className="w-4 h-4" />
              Create Hunt
            </Button>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#21262D] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#21262D] flex items-center justify-center">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={`${user.display_name || 'User'} avatar`} className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-[#8B949E]" />
                    )}
                  </div>
                  <span className="text-sm text-[#8B949E]">{user?.display_name}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-[#161B22] rounded-xl border border-[#30363D] shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#30363D]">
                      <p className="text-sm font-medium text-white">{user?.display_name}</p>
                      <p className="text-xs text-[#8B949E]">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
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
              {isAuthenticated && (
                <div className="flex items-center gap-3 p-3 border-b border-[#30363D] mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#21262D] flex items-center justify-center">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={`${user.display_name || 'User'} avatar`} className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-[#8B949E]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user?.display_name}</p>
                    <p className="text-xs text-[#8B949E]">{user?.email}</p>
                  </div>
                </div>
              )}

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

              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleCreateClick();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create Hunt
                </Button>

                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                ) : (
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <User className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
