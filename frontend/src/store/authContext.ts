import { createContext } from 'react';
import type { UserProfile, LoginInput, RegisterInput } from '@/types';

export type AuthContextType = {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);
