// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useRef, ReactNode } from 'react';
import api from '../services/api';
import type {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
import type { AuthResponse, UserData } from '../types/auth.types';

type AuthState = { user: UserData | null; token: string | null };

interface AuthContextType {
  auth: AuthState;
  setAuthFromLogin: (response: AuthResponse) => UserData | null;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const initialAuth: AuthState = { user: null, token: null };

const AuthContext = createContext<AuthContextType>({
  auth: initialAuth,
  setAuthFromLogin: () => null,
  logout: async () => {},
  isAuthenticated: false,
  loading: true,
  hasRole: () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const [loading, setLoading] = useState(true);
  
  // ✅ Refs para acceder siempre al estado más reciente
  const authRef = useRef(auth);
  const isRefreshingRef = useRef(false);

  // ✅ Mantener authRef actualizado
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // Helper: detecta si la URL es auth/refresh o auth/login
  const isAuthRefreshOrLogin = (url?: string) => {
    if (!url) return false;
    try {
      const clean = url.toLowerCase();
      return clean.includes('/auth/refresh') || clean.includes('/auth/login');
    } catch {
      return false;
    }
  };

  // ✅ INTERCEPTOR DE REQUEST - Agregar token
  useEffect(() => {
    const reqId = api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      
      // ✅ Usar authRef.current para obtener el token más reciente
      const currentToken = authRef.current.token;
      
      if (currentToken && !isAuthRefreshOrLogin(config.url)) {
        headers.Authorization = `Bearer ${currentToken}`;
      }
      
      config.headers = headers;
      return config;
    });

    return () => {
      api.interceptors.request.eject(reqId);
    };
  }, []); // ✅ Solo se registra UNA VEZ

  // ✅ INTERCEPTOR DE RESPONSE - Manejar 401 y refresh
  useEffect(() => {
    const resId = api.interceptors.response.use(
      (res: AxiosResponse) => res,
      async (error: AxiosError) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const status = error.response?.status;

        // ✅ Si no hay config o es auth/refresh/login, rechazar
        if (!original || isAuthRefreshOrLogin(original.url)) {
          return Promise.reject(error);
        }

        // ✅ Si es 401 y no se ha reintentado
        if (status === 401 && !original._retry) {
          // ✅ Evitar múltiples refresh simultáneos
          if (isRefreshingRef.current) {
            return Promise.reject(error);
          }

          original._retry = true;
          isRefreshingRef.current = true;

          try {
            // ✅ Intentar refresh con barra final
            const { data } = await api.post('/auth/refresh/');
            const newToken: string = (data as any).access_token;

            // ✅ Actualizar estado Y ref inmediatamente
            setAuth((prev) => ({ ...prev, token: newToken }));
            authRef.current = { ...authRef.current, token: newToken };

            // ✅ Reintentar petición original con nuevo token
            const headers = (original.headers ?? {}) as AxiosRequestHeaders;
            headers.Authorization = `Bearer ${newToken}`;
            original.headers = headers;

            return api(original);
          } catch (refreshError) {
            // ✅ Si falla el refresh, hacer logout
            console.error('Token refresh failed:', refreshError);
            await doLogout(false);
            return Promise.reject(refreshError);
          } finally {
            isRefreshingRef.current = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resId);
    };
  }, []); // ✅ Solo se registra UNA VEZ

  // ✅ BOOTSTRAP - Verificar sesión al cargar
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        // ✅ Intentar refresh con barra final
        const { data: refresh } = await api.post('/auth/refresh/');
        const newToken: string = (refresh as any).access_token;

        if (cancelled) return;
        
        // ✅ Obtener datos del usuario
        const meResp = await api.get<UserData>('/auth/me/', {
          headers: { Authorization: `Bearer ${newToken}` },
        });

        if (cancelled) return;
        
        // ✅ Actualizar estado Y ref
        const newAuth = { token: newToken, user: meResp.data };
        setAuth(newAuth);
        authRef.current = newAuth;
      } catch (error) {
        console.log('Bootstrap failed (no session found):', error);
        if (!cancelled) {
          setAuth(initialAuth);
          authRef.current = initialAuth;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthFromLogin = (response: AuthResponse): UserData | null => {
    if (!response?.access_token || !response?.user_data) {
      setAuth(initialAuth);
      authRef.current = initialAuth;
      return null;
    }
    const newAuth = { token: response.access_token, user: response.user_data };
    setAuth(newAuth);
    authRef.current = newAuth; // ✅ Actualizar ref también
    return response.user_data;
  };

  const doLogout = async (callServer = true) => {
    try {
      if (callServer) await api.post('/auth/logout/');
    } catch {
      // ignorar
    } finally {
      setAuth(initialAuth);
      authRef.current = initialAuth; // ✅ Limpiar ref también
    }
  };

  const logout = async () => doLogout(true);

  const hasRole = (...roles: string[]) => {
    // Verificar primero por nombre de usuario si roles está vacío
    const isSuperAdminByUsername = auth.user?.nombre_usuario?.toLowerCase() === 'superadmin';
    
    // Si es SuperAdmin por nombre de usuario, tiene acceso a todo
    if (isSuperAdminByUsername) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ SuperAdmin detected by username - granting access to all');
      }
      return true;
    }
    
    // Si no hay roles, retornar false (excepto si ya se detectó como SuperAdmin)
    if (!auth.user?.roles?.length) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 No roles found for user');
      }
      return false;
    }
    
    const userLower = new Set(auth.user.roles.map((r) => r.toLowerCase().trim()));
    
    // Debug: Log para ver qué roles tiene el usuario (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 User roles:', auth.user.roles);
      console.log('🔍 Checking for roles:', roles);
    }
    
    // Verificar si el usuario es SuperAdministrador (tiene acceso a todo)
    // Manejar múltiples variaciones del nombre - incluyendo "superadmin" sin guiones
    const superAdminVariations = [
      'superadministrador',
      'super_admin',
      'superadmin',
      'super administrador',
      'super-administrador',
      'super_administrador',
    ];
    
    // Verificar si alguno de los roles del usuario contiene "super" y "admin"
    const isSuperAdmin = superAdminVariations.some(variation => userLower.has(variation)) ||
                         Array.from(userLower).some(role => 
                           (role.includes('super') && role.includes('admin')) ||
                           role === 'superadmin'
                         );
    
    // Si es SuperAdministrador, tiene acceso a todo
    if (isSuperAdmin) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ User is SuperAdministrador - granting access to all');
      }
      return true;
    }
    
    // Sinónimos para roles comunes
    const getSynonyms = (r: string): string[] => {
      const lower = r.toLowerCase().trim();
      if (lower === 'admin' || lower === 'administrador') {
        return ['admin', 'administrador'];
      }
      if (lower.includes('super') && lower.includes('admin')) {
        return superAdminVariations;
      }
      return [lower];
    };
    
    const result = roles.some((r) => getSynonyms(r).some((s) => userLower.has(s)));
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Role check result:', result);
    }
    return result;
  };

  const value = useMemo<AuthContextType>(
    () => ({
      auth,
      setAuthFromLogin,
      logout,
      isAuthenticated: !!auth.token && !!auth.user,
      loading,
      hasRole,
    }),
    [auth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};