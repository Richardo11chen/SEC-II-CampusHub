import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/store/authContext';

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
