'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NewPostButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 게시글 작성 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !nickname.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const postData = {
        content,
        nickname,
        createdAt: Date.now(),
        likes: 0,
        comments: 0
      };

      await addDoc(collection(db, 'posts'), postData);
      setContent('');
      setNickname('');
      setIsModalOpen(false);
      // 페이지 새로고침하여 새 게시글 표시
      window.location.reload();
    } catch (error) {
      console.error('게시글 작성 중 에러 발생:', error);
      alert('게시글 작성에 실패했습니다. 다시 시도해주세요.');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
      >
        ✏️ 글쓰기
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">새 게시글 작성</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">닉네임</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="닉네임을 입력하세요"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2 border rounded h-32"
                  placeholder="피자에 대한 생각을 공유해주세요!"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
                >
                  {isSubmitting ? '작성 중...' : '작성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
