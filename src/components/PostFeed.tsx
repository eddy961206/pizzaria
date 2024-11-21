'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';
import PostCard from './PostCard';
import InfiniteScroll from 'react-infinite-scroll-component';

const POSTS_PER_PAGE = 5;

export default function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // 초기 게시글 로딩
  useEffect(() => {
    loadInitialPosts();
  }, []);

  // 처음 게시글을 로드하는 함수
  const loadInitialPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      );
      
      const snapshot = await getDocs(postsQuery);
      const postList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      setPosts(postList);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('게시글을 불러오는 중 에러 발생:', error);
    }
  };

  // 추가 게시글을 로드하는 함수
  const loadMorePosts = async () => {
    if (!lastVisible) return;

    try {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(POSTS_PER_PAGE)
      );

      const snapshot = await getDocs(postsQuery);
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      setPosts(prevPosts => [...prevPosts, ...newPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('추가 게시글을 불러오는 중 에러 발생:', error);
    }
  };

  return (
    <InfiniteScroll
      dataLength={posts.length}
      next={loadMorePosts}
      hasMore={hasMore}
      loader={<div className="text-center py-4">게시글을 불러오는 중...</div>}
      endMessage={
        <div className="text-center py-4 text-gray-500">
          더 이상 게시글이 없습니다 🍕
        </div>
      }
    >
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </InfiniteScroll>
  );
}
