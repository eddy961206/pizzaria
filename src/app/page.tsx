import PostFeed from '@/components/PostFeed';
import NewPostButton from '@/components/NewPostButton';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center my-8 text-orange-600">
          🍕 피자 예찬 SNS 🍕
        </h1>
        <NewPostButton />
        <PostFeed />
      </div>
    </main>
  );
}
