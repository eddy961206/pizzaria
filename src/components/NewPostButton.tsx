'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useIpAddress } from '@/hooks/useIpAddress';
import { Post } from '@/types';

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
  const ipAddress = useIpAddress();

  // 게시글 작성 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !nickname.trim() || !ipAddress) return;

    setIsLoading(true);
    try {
      const post = {
        content: content.trim(),
        nickname: nickname.trim(),
        createdAt: Date.now(),
        likes: 0,
        comments: 0,
        authorIp: ipAddress
      };

      const docRef = await addDoc(collection(db, 'posts'), post);
      const newPost = { id: docRef.id, ...post } as Post;
      
      // 모든 구독자에게 새 게시글 알림
      postEventListeners.forEach(callback => callback(newPost));

      setContent('');
      setNickname('');
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
                placeholder="내용을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 mb-4 border rounded h-32 resize-none text-gray-700"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
