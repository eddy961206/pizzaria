import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export function useAnonymousAuth() {
  const [authUser, setAuthUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const signInAnonymousUser = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('익명 인증 중 에러 발생:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAuthUser(user);
      if (!user) {
        try {
          await signInAnonymousUser();
        } catch (error) {
          console.error('익명 로그인 실패:', error);
          alert('익명 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
      }
      setLoading(false);
    });
    

    return () => unsubscribe();
  }, []);

  return { authUser, loading };
} 