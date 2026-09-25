import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/apiClient';
import { User, UserRole } from '../types';

export interface AuthContextType {
  user: User | null;
  session: any | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; message?: string }>;
  switchDemoUser: (userId: string) => Promise<void>;
  demoUsers: User[];
  refreshUser: () => Promise<void>;
}

const STORAGE_SESSION_KEY = 'kontrakanku_session_v4';

export const SUPER_ADMIN_ACCOUNT: User = {
  id: 'user_ghozi',
  email: 'sa.ghozi@gmail.com',
  name: 'Sulthan Ali Ghozi',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  phone: '081234567890',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user) return parsed.user;
      }
    } catch (e) {
      console.warn('Failed to parse cached user:', e);
    }
    return null;
  });

  const [session, setSession] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
    }
    return null;
  });

  const [role, setRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role) return parsed.role;
      }
    } catch (e) {
      // ignore
    }
    return 'MEMBER';
  });

  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Check if current user is Super Admin
  const isSuperAdmin = Boolean(
    user?.id === 'user_ghozi' ||
    user?.email?.toLowerCase() === 'sa.ghozi@gmail.com' ||
    user?.email?.toLowerCase() === 's.a.ghozi@gmail.com' ||
    role === 'SUPER_ADMIN'
  );

  // Check if current user is Admin or Super Admin
  const isAdmin = Boolean(
    isSuperAdmin ||
    user?.id === 'user_ilaa' ||
    user?.email?.toLowerCase() === 'ilaaapedia@gmail.com' ||
    role === 'ADMIN' ||
    role === 'OWNER'
  );

  // Sync users list from server
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const serverUsers = await api.getUsers();
        if (serverUsers && serverUsers.length > 0) {
          setDemoUsers(serverUsers);
          if (user) {
            const updatedCurrent = serverUsers.find((u) => u.id === user.id);
            if (updatedCurrent) {
              setUser((prev) => ({ ...prev, ...updatedCurrent }));
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch server users:', err);
      }
    };
    fetchUsers();
  }, []);

  const saveSessionState = (newUser: User | null, newSession: any | null, newRole: UserRole = 'MEMBER') => {
    setUser(newUser);
    setSession(newSession);
    setRole(newRole);
    if (newUser && newSession) {
      try {
        localStorage.setItem(
          STORAGE_SESSION_KEY,
          JSON.stringify({
            user: newUser,
            session: newSession,
            role: newRole,
          })
        );
      } catch (e) {
        console.warn('Failed to persist session:', e);
      }
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  };

  const signIn = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (!email || !password) {
        throw new Error('Email dan kata sandi wajib diisi');
      }
      const res = await api.login(email, password);
      const cleanEmail = res.user?.email?.toLowerCase();
      const isGhozi = cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com' || res.user?.id === 'user_ghozi';
      const assignedRole: UserRole = isGhozi ? 'SUPER_ADMIN' : res.role || (res.isAdmin ? 'ADMIN' : 'MEMBER');
      saveSessionState(res.user, { token: res.token, user: res.user }, assignedRole);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      if (!email || !password) {
        throw new Error('Email dan kata sandi wajib diisi');
      }
      const res = await api.register(name || email.split('@')[0], email, phone, password);
      const cleanEmail = res.user?.email?.toLowerCase();
      const isGhozi = cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com';
      const assignedRole: UserRole = isGhozi ? 'SUPER_ADMIN' : 'MEMBER';
      saveSessionState(res.user, { token: res.token, user: res.user }, assignedRole);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    saveSessionState(null, null);
  };

  const resetPassword = async (email: string) => {
    return {
      error: null,
      message: `Tautan pengaturan ulang kata sandi telah dikirim ke ${email}. Periksa kotak masuk atau spam Anda.`,
    };
  };

  const switchDemoUser = async (userId: string) => {
    const target = demoUsers.find((u) => u.id === userId);
    if (!target) return;
    const cleanEmail = target.email.toLowerCase();
    const isGhozi = target.id === 'user_ghozi' || cleanEmail === 'sa.ghozi@gmail.com' || cleanEmail === 's.a.ghozi@gmail.com';
    const isOwner = isGhozi || target.id === 'user_ilaa' || cleanEmail === 'ilaaapedia@gmail.com';
    const isAdm = isOwner || target.id === 'user_candra';
    const targetRole: UserRole = isGhozi ? 'SUPER_ADMIN' : isOwner ? 'OWNER' : isAdm ? 'ADMIN' : 'MEMBER';
    saveSessionState(target, { token: `token_${target.id}`, user: target }, targetRole);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const serverUsers = await api.getUsers();
      const updated = serverUsers.find((u) => u.id === user.id);
      if (updated) {
        setUser((prev) => ({ ...prev, ...updated }));
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isAdmin,
        isSuperAdmin,
        loading,
        isConfigured: true,
        signUp,
        signIn,
        signOut,
        resetPassword,
        switchDemoUser,
        demoUsers,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
