'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
  id: string;
  title: string;
  description: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge_count: number;
  estimated_duration: number;
  created_by: string;
  creator_name: string;
  clone_count: number;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-red-500',
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (templateId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setCloning(templateId);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/hunt/${data.hunt.id}`);
      } else {
        alert('Failed to clone template');
      }
    } catch {
      alert('Network error');
    } finally {
      setCloning(null);
    }
  };

  const themes = [...new Set(templates.map((t) => t.theme))];

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = !selectedTheme || t.theme === selectedTheme;
    return matchesSearch && matchesTheme;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Hunt Templates</h1>
          <p className="text-gray-400 mt-1">
            Clone pre-made hunts and customize them for your needs
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTheme(null)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !selectedTheme
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Themes
            </button>
            {themes.map((theme) => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedTheme === theme
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No templates found</h2>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
              >
                <div className="h-32 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <span className="text-5xl">
                    {template.theme === 'Nature' && '🌿'}
                    {template.theme === 'Urban' && '🏙️'}
                    {template.theme === 'History' && '🏛️'}
                    {template.theme === 'Art' && '🎨'}
                    {template.theme === 'Food' && '🍕'}
                    {template.theme === 'Sports' && '⚽'}
                    {!['Nature', 'Urban', 'History', 'Art', 'Food', 'Sports'].includes(template.theme) && '🎯'}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{template.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${DIFFICULTY_COLORS[template.difficulty]}`}
                    >
                      {template.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>📍 {template.challenge_count} challenges</span>
                    <span>⏱️ {template.estimated_duration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span>By {template.creator_name}</span>
                      <span className="ml-2">· {template.clone_count} clones</span>
                    </div>
                    <button
                      onClick={() => handleClone(template.id)}
                      disabled={cloning === template.id}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {cloning === template.id ? 'Cloning...' : 'Clone'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
