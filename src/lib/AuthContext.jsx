"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { isAdminUser, getUserRole } from "./adminAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // Create basic user document if not exists
            const newUserData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              avatar: "",
              createdAt: new Date().toISOString(),
              totalWords: 0,
              learnedWords: 0,
              dailyGoal: 15,
              isOnboarded: false,
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUserData, { merge: true });
            setUserData(newUserData);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email/Password login
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Email/Password register
  const register = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Update display name
    await updateProfile(result.user, { displayName });
    // Create Firestore document
    const newUserData = {
      id: result.user.uid,
      email: result.user.email,
      displayName,
      avatar: "",
      createdAt: new Date().toISOString(),
      totalWords: 0,
      learnedWords: 0,
      dailyGoal: 15,
      isOnboarded: false,
    };
    await setDoc(doc(db, "users", result.user.uid), newUserData, { merge: true });
    return result.user;
  };

  // Google Sign-In
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    // Create/update Firestore document
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (!userDoc.exists()) {
      const newUserData = {
        id: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || "User",
        avatar: result.user.photoURL || "",
        createdAt: new Date().toISOString(),
        totalWords: 0,
        learnedWords: 0,
        dailyGoal: 15,
        isOnboarded: false,
      };
      await setDoc(doc(db, "users", result.user.uid), newUserData, { merge: true });
    }
    return result.user;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = isAdminUser(userData);
  const userRole = getUserRole(userData);

  const value = {
    user,
    userData,
    loading,
    isAdmin,
    userRole,
    login,
    register,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
