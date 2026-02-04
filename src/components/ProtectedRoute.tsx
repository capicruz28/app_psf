// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { isAuthenticated, loading, hasRole, auth } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Verificando sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectState = location.pathname !== '/unauthorized' ? { from: location } : undefined;
    return <Navigate to="/login" state={redirectState} replace />;
  }

  if (requiredRole) {
    // Usar la función hasRole del contexto que ya maneja SuperAdministrador
    const hasRequiredRole = hasRole(requiredRole);
    
    // Logging para depuración
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ProtectedRoute check:', {
        path: location.pathname,
        requiredRole: requiredRole,
        userRoles: auth.user?.roles || [],
        hasRequiredRole: hasRequiredRole,
        isAuthenticated: isAuthenticated
      });
    }
    
    if (!hasRequiredRole) {
      console.warn('⚠️ Access denied - redirecting to /unauthorized:', {
        path: location.pathname,
        requiredRole: requiredRole,
        userRoles: auth.user?.roles || []
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;