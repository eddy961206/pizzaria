'use client';

import { useState } from 'react';
import { Post, Comment } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  writeBatch,
  increment
} from 'firebase/firestore';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  // 좋아요 토글 함수
  const toggleLike = async () => {
    const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
    setIsLiked(!isLiked);
    setLikesCount(newLikesCount);

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: newLikesCount
      });
    } catch (error) {
      console.error('좋아요 업데이트 중 에러 발생:', error);
      // 에러 발생 시 상태 되돌리기
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  // 댓글 로드 함수
  const loadComments = async () => {
    if (!showComments) {
      setIsLoading(true);
      try {
        const commentsQuery = query(
          collection(db, 'comments'),
          where('postId', '==', post.id),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(commentsQuery);
        if (!snapshot.empty) {
          const commentsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Comment));
          setComments(commentsList);
        } else {
          setComments([]);
        }
      } catch (error) {
        console.error('댓글을 불러오는 중 에러 발생:', error);
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    }
    setShowComments(!showComments);
  };

  // 댓글 작성 함수
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !nickname.trim()) return;

    const commentData = {
      postId: post.id,
      content: newComment.trim(),
      nickname: nickname.trim(),
      createdAt: Date.now()
    };

    try {
      // 트랜잭션으로 처리하여 데이터 일관성 보장
      const batch = writeBatch(db);
      
      // 새 댓글 추가
      const commentRef = doc(collection(db, 'comments'));
      batch.set(commentRef, commentData);
      
      // 게시글의 댓글 수 업데이트
      const postRef = doc(db, 'posts', post.id);
      batch.update(postRef, {
        comments: increment(1)
      });

      await batch.commit();

      // UI 업데이트
      const newCommentWithId = { id: commentRef.id, ...commentData };
      setComments(prev => [newCommentWithId, ...prev]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
      setNickname('');
    } catch (error) {
      console.error('댓글 작성 중 에러 발생:', error);
      alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* 게시글 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-gray-900">{post.nickname}</div>
        <div className="text-gray-500 text-sm">
          {format(post.createdAt, 'PPP a h:mm', { locale: ko })}
        </div>
      </div>

      {/* 게시글 내용 */}
      <p className="mb-4 text-gray-800">{post.content}</p>
      {post.imageUrl && (
        <img 
          src={post.imageUrl} 
          alt="게시글 이미지" 
          className="w-full h-auto rounded-lg mb-4"
        />
      )}

      {/* 좋아요와 댓글 */}
      <div className="flex items-center space-x-4 mb-4">
        {/* 좋아요 버튼 */}
        <button 
          onClick={toggleLike}
          className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
        >
          {isLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />} {/* 좋아요 아이콘 */}
          <span>{likesCount}</span> {/* 좋아요 카운트 */}
        </button>
        {/* 댓글 버튼 */}
        <button 
          onClick={loadComments}
          className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
        >
          <FaComment /> {/* 댓글 아이콘 */}
          <span>{commentsCount}</span>  {/* 댓글 카운트 */}
        </button>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="mt-4">
          {/* 댓글 작성 폼 */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-2 mb-2 border rounded text-gray-700"
              required
            />
            <div className="flex">
              <input
                type="text"
                placeholder="댓글을 입력하세요"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 p-2 border rounded-l text-gray-700"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
              >
                작성
              </button>
            </div>
          </form>

          {/* 댓글 목록 */}
          {isLoading ? (
            <div className="text-center py-4">댓글을 불러오는 중...</div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border-b pb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-900">{comment.nickname}</div>
                    <div className="text-gray-500 text-sm">
                      {format(comment.createdAt, 'PPP a h:mm', { locale: ko })}
                    </div>
                  </div>
                  <p className="mt-1 text-gray-800">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
