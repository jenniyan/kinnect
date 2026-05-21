// services/auth.js
// Simple auth context: stores token + user in AsyncStorage.

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('token');
      if (t) {
        setToken(t);
        try {
          const res = await getMe();
          setUser(res.data);
        } catch {
          await AsyncStorage.removeItem('token');
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (accessToken, userData) => {
    await AsyncStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
