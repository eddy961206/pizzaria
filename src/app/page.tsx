'use client';

import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import PostFeed from '@/components/PostFeed';
import NewPostButton from '@/components/NewPostButton';
import ThemeToggle from '@/components/ThemeToggle';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const { loading } = useAnonymousAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="max-w-2xl mx-auto p-4">
        <ThemeToggle />
        <h1 className="text-3xl font-bold text-center my-8 text-orange-600 dark:text-orange-500">
          🍕 PIZZARIA SNS 🍕
        </h1>
        <NewPostButton />
        <PostFeed />
      </div>
    </main>
  );
}
