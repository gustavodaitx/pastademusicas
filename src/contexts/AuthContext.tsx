import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: user !== null,
    configurationMissing: !isFirebaseConfigured,
    login: async (email, password) => {
      if (!auth) throw new Error('O Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.local.');
      await signInWithEmailAndPassword(auth, email, password);
    },
    register: async (name, email, password) => {
      if (!auth) throw new Error('O Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.local.');
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      setUser(credential.user);
    },
    logout: async () => {
      if (!auth) throw new Error('O Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.local.');
      await signOut(auth);
      setUser(null);
    },
    resetPassword: async (email) => {
      if (!auth) throw new Error('O Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.local.');
      await sendPasswordResetEmail(auth, email);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
