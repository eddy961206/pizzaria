'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';
import PostCard from './PostCard';
import InfiniteScroll from 'react-infinite-scroll-component';
import { subscribeToNewPosts } from './NewPostButton';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';

const POSTS_PER_PAGE = 5;

export default function PostFeed() {
  const { loading } = useAnonymousAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // 게시글 삭제 핸들러
  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  }, []);

  // 게시글 추가 핸들러
  const handlePostAdd = useCallback((newPost: Post) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, []);

  // 새 게시글 이벤트 구독
  useEffect(() => {
    const unsubscribe = subscribeToNewPosts(handlePostAdd);
    return () => unsubscribe();
  }, [handlePostAdd]);

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
      const batch = writeBatch(db);
      
      const postList = snapshot.docs.map(doc => {
        const data = doc.data();
        // authorIp가 없는 경우 레거시 표시를 위한 특별 값 할당
        if (!data.authorIp) {
          batch.update(doc.ref, { 
            authorIp: 'legacy-post',
            comments: data.comments || 0 
          });
        }
        return {
          id: doc.id,
          ...data,
          authorIp: data.authorIp || 'legacy-post',
          comments: data.comments || 0
        } as Post;
      });

      await batch.commit();
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
      const batch = writeBatch(db);
      
      const newPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.authorIp) {
          batch.update(doc.ref, { 
            authorIp: 'legacy-post',
            comments: data.comments || 0 
          });
        }
        return {
          id: doc.id,
          ...data,
          authorIp: data.authorIp || 'legacy-post',
          comments: data.comments || 0
        } as Post;
      });

      await batch.commit();
      setPosts(prevPosts => [...prevPosts, ...newPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('추가 게시글을 불러오는 중 에러 발생:', error);
    }
  };

  return (
    <>
      {loading ? (
        <div className="text-center py-4">로딩 중...</div>
      ) : (
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
              <PostCard 
                key={post.id} 
                post={post} 
                onDelete={handlePostDelete}  // 삭제 핸들러 전달
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </>
  );
}
