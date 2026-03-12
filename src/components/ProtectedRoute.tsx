// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Rutas que requieren al menos un rol asignado (usuarios sin roles no pueden acceder) */
const ROUTES_REQUIRING_ANY_ROLE = ['/finalizartareo', '/autorizacion', '/reportedestajo'];

interface ProtectedRouteProps {
  requiredRole?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { isAuthenticated, loading, hasRole, auth } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

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

  // Rutas operativas requieren al menos un rol asignado (usuarios nuevos sin roles no pueden acceder)
  if (!requiredRole && ROUTES_REQUIRING_ANY_ROLE.some((r) => currentPath === r || currentPath.startsWith(r + '/'))) {
    const isSuperAdminByUsername = auth.user?.nombre_usuario?.toLowerCase() === 'superadmin';
    const hasAnyRole = isSuperAdminByUsername || (auth.user?.roles?.length ?? 0) > 0;
    if (!hasAnyRole) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ User has no roles - redirecting to /unauthorized for path:', currentPath);
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;