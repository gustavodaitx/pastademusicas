import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-40 items-center justify-center text-sm text-slate-500" role="status">Verificando autenticação…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};
