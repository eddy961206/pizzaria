'use client';

import { useState, useEffect } from 'react';
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
  increment,
  deleteDoc
} from 'firebase/firestore';
import { useIpAddress } from '@/hooks/useIpAddress';

interface PostCardProps {
  post: Post;
  onDelete: (postId: string) => void;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const ipAddress = useIpAddress();
  const [isAuthor, setIsAuthor] = useState(false);

  // IP 주소가 로드되면 작성자 여부 확인
  useEffect(() => {
    if (ipAddress) {
      setIsAuthor(post.authorIp !== 'legacy-post' && post.authorIp === ipAddress);
    }
  }, [ipAddress, post.authorIp]);

  // 좋아요 상태 체크
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!ipAddress) return;
      
      try {
        const likesQuery = query(
          collection(db, 'likes'),
          where('postId', '==', post.id),
          where('userIp', '==', ipAddress)
        );
        
        const snapshot = await getDocs(likesQuery);
        setIsLiked(!snapshot.empty);
      } catch (error) {
        console.error('좋아요 상태 확인 중 에러 발생:', error);
      }
    };

    checkLikeStatus();
  }, [ipAddress, post.id]);

  // 좋아요 토글 함수 수정
  const toggleLike = async () => {
    if (!ipAddress) return;

    try {
      const batch = writeBatch(db);
      
      // likes 컬렉션에서 현재 사용자의 좋아요 문서 찾기
      const likesQuery = query(
        collection(db, 'likes'),
        where('postId', '==', post.id),
        where('userIp', '==', ipAddress)
      );
      
      const snapshot = await getDocs(likesQuery);
      const postRef = doc(db, 'posts', post.id);

      if (snapshot.empty && !isLiked) {
        // 좋아요 추가
        const likeRef = doc(collection(db, 'likes'));
        batch.set(likeRef, {
          postId: post.id,
          userIp: ipAddress,
          createdAt: Date.now()
        });
        batch.update(postRef, { likes: increment(1) });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      } else if (!snapshot.empty && isLiked) {
        // 좋아요 제거
        batch.delete(doc(db, 'likes', snapshot.docs[0].id));
        batch.update(postRef, { likes: increment(-1) });
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      }

      await batch.commit();
    } catch (error) {
      console.error('좋아요 업데이트 중 에러 발생:', error);
      // 에러 발생 시 상태 되돌리기
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
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
    if (!newComment.trim() || !nickname.trim() || !ipAddress) return;

    const commentData = {
      postId: post.id,
      content: newComment.trim(),
      nickname: nickname.trim(),
      createdAt: Date.now(),
      authorIp: ipAddress
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

  // 게시글 삭제 함수 수정
  const handleDeletePost = async () => {
    if (!isAuthor) {
      alert('작성자만 삭제할 수 있습니다.');
      return;
    }

    // 댓글이 있는 경우 삭제 불가
    if (commentsCount > 0) {
      alert('댓글이 있는 게시글은 삭제할 수 없습니다.');
      return;
    }

    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
        onDelete(post.id);  // 부모 컴포넌트에 삭제 알림
      } catch (error) {
        console.error('게시글 삭제 중 에러 발생:', error);
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  // 댓글 삭제 함수를 컴포넌트 내부로 이동
  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      try {
        const batch = writeBatch(db);
        
        // 댓글 삭제
        const commentRef = doc(db, 'comments', commentId);
        batch.delete(commentRef);
        
        // 게시글의 댓글 수 감소
        const postRef = doc(db, 'posts', post.id);
        batch.update(postRef, {
          comments: increment(-1)
        });

        await batch.commit();

        // UI 업데이트
        setComments(prev => prev.filter(c => c.id !== commentId));
        setCommentsCount(prev => prev - 1);
      } catch (error) {
        console.error('댓글 삭제 중 에러 발생:', error);
        alert('댓글 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* 게시글 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-gray-900">{post.nickname}</div>
        <div className="flex items-center gap-2">
          <div className="text-gray-500 text-sm">
            {format(post.createdAt, 'PPP a h:mm', { locale: ko })}
          </div>
          {post.authorIp !== 'legacy-post' && isAuthor && (
            <button
              onClick={handleDeletePost}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              삭제
            </button>
          )}
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
                    <div className="flex items-center gap-2">
                      <div className="text-gray-500 text-sm">
                        {format(comment.createdAt, 'PPP a h:mm', { locale: ko })}
                      </div>
                      {comment.authorIp === ipAddress && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          삭제
                        </button>
                      )}
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
