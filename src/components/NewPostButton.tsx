'use client';

import { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useIpAddress } from '@/hooks/useIpAddress';
import { Post } from '@/types';
import LoadingSpinner from './LoadingSpinner';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import Image from 'next/image';
// 이벤트 버스 생성
type PostEventCallback = (post: Post) => void;
const postEventListeners: PostEventCallback[] = [];

// 이벤트 구독 함수
export function subscribeToNewPosts(callback: PostEventCallback) {
  postEventListeners.push(callback);
  return () => {
    const index = postEventListeners.indexOf(callback);
    if (index > -1) {
      postEventListeners.splice(index, 1);
    }
  };
}

export default function NewPostButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ipAddress = useIpAddress();
  const { authUser } = useAnonymousAuth();

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

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 게시글 작성 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !nickname.trim() || !ipAddress || !authUser) return;

    setIsLoading(true);
    try {
      let imageUrl = '';
      
      // 이미지가 선택된 경우 업로드
      if (selectedImage) {
        const imageRef = ref(storage, `posts/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(imageRef, selectedImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const post = {
        content: content.trim(),
        nickname: nickname.trim(),
        createdAt: Date.now(),
        likes: 0,
        comments: 0,
        authorIp: ipAddress,
        authorId: authUser.uid,
        imageUrl: imageUrl || null  // 이미지 URL 추가
      };

      const docRef = await addDoc(collection(db, 'posts'), post);
      const newPost = { id: docRef.id, ...post } as Post;
      
      // 모든 구독자에게 새 게시글 알림
      postEventListeners.forEach(callback => callback(newPost));

      setContent('');
      setNickname('');
      setSelectedImage(null);
      setPreviewUrl(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('게시글 작성 중 에러 발생:', error);
      alert('게시글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingSpinner />}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
      >
        ✏️ 글쓰기
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">새 게시글 작성</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2 mb-4 border rounded text-gray-700"
                required
              />
              <textarea
                placeholder="맛있는 피자에 대한 이야기를 들려주세요!"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 mb-4 border rounded h-32 resize-none text-gray-700"
                required
              />
              
              {/* 이미지 업로드 영역 */}
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
                  🍕🖼️ 맛난 피자 이미지 추가
                </button>
                
                {previewUrl && (
                  <div className="mt-2 relative">
                    <Image
                      src={previewUrl}
                      alt="미리보기"
                      className="max-h-48 rounded"
                      width={800}
                      height={600}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    handleRemoveImage();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={isLoading}
                >
                  {isLoading ? '작성 중...' : '작성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
