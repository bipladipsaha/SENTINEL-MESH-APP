/*
 * SentinelMesh — Auth Context
 *
 * Provides authentication state and helpers across the app.
 * Uses Firebase Auth with email/password and Google sign-in.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, name, phone, role = 'tourist') {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Store user profile in RTDB
    await set(ref(db, `users/${cred.user.uid}`), {
      name,
      email,
      phone,
      role, // 'tourist' or 'admin'
      createdAt: Date.now(),
      deviceId: null,
    });

    return cred;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen to user profile
        const profileRef = ref(db, `users/${user.uid}`);
        onValue(profileRef, (snapshot) => {
          setUserProfile(snapshot.val());
        });
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Determine if the current user has admin privileges
  const isAdmin = userProfile?.role === 'admin';

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
