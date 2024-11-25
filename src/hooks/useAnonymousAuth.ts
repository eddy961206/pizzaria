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

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUser(user);
      if (!user) {
        signInAnonymousUser();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { authUser, loading };
} 