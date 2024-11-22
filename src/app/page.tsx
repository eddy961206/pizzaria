import PostFeed from '@/components/PostFeed';
import NewPostButton from '@/components/NewPostButton';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
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
