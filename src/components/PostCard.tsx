'use client';

import { useState, useEffect, useRef } from 'react';
import { Post, Comment } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import { auth, db, storage } from '@/lib/firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  writeBatch,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useIpAddress } from '@/hooks/useIpAddress';
import LoadingSpinner from './LoadingSpinner';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authUser } = useAnonymousAuth();

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

  // 댓글 작성 함수 수정
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !nickname.trim() || !ipAddress || !auth.currentUser) return;

    const commentData = {
      postId: post.id,
      content: newComment.trim(),
      nickname: nickname.trim(),
      createdAt: Date.now(),
      authorIp: ipAddress,
      authorId: auth.currentUser.uid  // 익명 사용자 ID 추가
    };

    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, 'comments'));
      batch.set(commentRef, commentData);
      
      const postRef = doc(db, 'posts', post.id);
      batch.update(postRef, {
        comments: increment(1)
      });

      await batch.commit();

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
      setIsSubmitting(true);
      try {
        // 이미지가 있는 경우 Storage에서도 삭제
        if (post.imageUrl) {
          const imageRef = ref(storage, post.imageUrl);
          await deleteObject(imageRef).catch(console.error);
        }

        await deleteDoc(doc(db, 'posts', post.id));
        onDelete(post.id);
      } catch (error) {
        console.error('게시글 삭제 중 에러 발생:', error);
        alert('게시글 삭제에 실패했습니다.');
      } finally {
        setIsSubmitting(false);
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

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        alert('파일 크기는 5MB를 초과할 수 없습니다.');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // 이미지 제거 핸들러 수정
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 게시글 수정 함수 수정
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedContent.trim() || !isAuthor) return;

    setIsSubmitting(true);
    try {
      const updateData: { content: string; imageUrl?: string | null } = {
        content: editedContent.trim()
      };

      // 이미지가 제거된 경우
      if (isImageRemoved) {
        if (post.imageUrl) {
          const oldImageRef = ref(storage, post.imageUrl);
          await deleteObject(oldImageRef).catch(console.error);
        }
        updateData.imageUrl = null;
      }
      // 새 이미지가 선택된 경우
      else if (selectedImage) {
        if (post.imageUrl) {
          const oldImageRef = ref(storage, post.imageUrl);
          await deleteObject(oldImageRef).catch(console.error);
        }

        // 새 이미지 업로드
        const imageRef = ref(storage, `posts/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(imageRef, selectedImage);
        updateData.imageUrl = await getDownloadURL(imageRef);
      }
      // 이미지 관련 변경이 없는 경우 imageUrl 필드를 업데이트하지 않음

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, updateData);
      
      // UI 업데이트
      post.content = updateData.content;
      if ('imageUrl' in updateData) {
        post.imageUrl = updateData.imageUrl || undefined;
      }
      
      setIsEditing(false);
      setSelectedImage(null);
      setPreviewUrl(null);
      setIsImageRemoved(false);
    } catch (error) {
      console.error('게시글 수정 중 에러 발생:', error);
      alert('게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정 취소 핸들러 수정
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedContent(post.content);
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsImageRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 댓글 수정 함수
  const handleCommentEdit = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        content: newContent.trim()
      });

      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: newContent.trim() } 
            : comment
        )
      );
      setEditingCommentId(null);
      setEditedCommentContent('');
    } catch (error) {
      console.error('댓글 수정 중 에러 발:', error);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  // 텍스트 영역 크기 자동 조절 함수
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // 수정 모드 전환 시 텍스트 영역 크기 자동 조절
  useEffect(() => {
    if (isEditing) {
      const textarea = document.querySelector('textarea[name="post-edit"]') as HTMLTextAreaElement;
      if (textarea) {
        adjustTextareaHeight(textarea);
      }
    }
  }, [isEditing]);

  // 댓글 수정 모드 전환 시 텍스트 영역 크기 자동 조절
  useEffect(() => {
    if (editingCommentId) {
      const textarea = document.querySelector('textarea[name="comment-edit"]') as HTMLTextAreaElement;
      if (textarea) {
        adjustTextareaHeight(textarea);
      }
    }
  }, [editingCommentId]);

  // 작성자 확인 로직 수정
  useEffect(() => {
    if (ipAddress && authUser) {
      setIsAuthor(
        post.authorIp === ipAddress &&
        post.authorId === authUser.uid
      );
    }
  }, [ipAddress, post.authorIp, post.authorId, authUser]);

  return (
    <>
      {isSubmitting && <LoadingSpinner />}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        {/* 게시글 헤더 - 수정/삭제 버튼 제거 */}
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{post.nickname}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            {formatDate(post.createdAt)}
          </div>
        </div>

        {/* 게시글 내용 */}
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="mb-4">
            {/* 이미지 업로드 버튼 */}
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                🖼️ 이미지 {post.imageUrl || previewUrl ? '변경' : '추가'}
              </button>
            </div>

            {/* 현재 이미지 또는 새로 선택된 이미지 */}
            {!isImageRemoved && (previewUrl || post.imageUrl) && (
              <div className="mb-4 relative">
                <img
                  src={previewUrl || post.imageUrl}
                  alt="게시글 이미지"
                  className="w-full h-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  X
                </button>
              </div>
            )}

            {/* 텍스트 영역 */}
            <textarea
              name="post-edit"
              placeholder="내용을 입력하세요"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
              className="w-full p-2 border rounded text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 mb-2 min-h-[100px] whitespace-pre-wrap resize-none"
              style={{ height: 'auto', minHeight: '100px' }}
              required
            />

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleEditCancel}
                className="px-3 py-1 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* 이미지를 본문 위로 이동 */}
            {post.imageUrl && (
              <img 
                src={post.imageUrl} 
                alt="게시글 이미지" 
                className="w-full h-auto rounded-lg mb-4"
              />
            )}
            <p className="mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{post.content}</p>
          </>
        )}

        {/* 좋아요, 댓글, 수정/삭제 버튼을 한 줄에 배치 */}
        {!isEditing && (
          <div className="flex items-center mb-4">
            {/* 좋아요와 댓글 버튼은 왼쪽에 */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleLike}
                className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
              >
                {isLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                <span>{likesCount}</span>
              </button>
              <button 
                onClick={loadComments}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
              >
                <FaComment />
                <span>{commentsCount}</span>
              </button>
            </div>

            {/* 수정/삭제 버튼은 오른쪽에 */}
            {post.authorIp !== 'legacy-post' && isAuthor && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  수정
                </button>
                <button
                  onClick={handleDeletePost}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )}

        {/* 댓글 섹션 */}
        {showComments && !isEditing && (
          <div className="mt-4">
            {/* 댓글 작성 폼 */}
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2 mb-2 border rounded text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600"
                required
              />
              <div className="flex">
                <input
                  type="text"
                  placeholder="댓글을 입력하세요"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 p-2 border rounded-l text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600"
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
                {comments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    아직 댓글이 없습니다. 가장 먼저 댓글을 달아보세요! 🍕
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="border-b pb-2 pl-2 border-l-4 border-l-gray-200 dark:border-l-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                          {comment.nickname}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {formatDate(comment.createdAt)}
                          </div>
                          {comment.authorIp === ipAddress && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditedCommentContent(comment.content);
                                }}
                                className="text-blue-500 hover:text-blue-700 text-sm"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="mt-2">
                          <div className="flex gap-2">
                            <textarea
                              name="comment-edit"
                              value={editedCommentContent}
                              onChange={(e) => setEditedCommentContent(e.target.value)}
                              onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                              className="flex-1 p-2 border rounded text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 min-h-[60px] whitespace-pre-wrap resize-none"
                              style={{ height: 'auto', minHeight: '60px' }}
                            />
                            <button
                              onClick={() => handleCommentEdit(comment.id, editedCommentContent)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditedCommentContent('');
                              }}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{comment.content}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
