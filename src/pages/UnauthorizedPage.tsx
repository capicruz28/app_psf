// src/pages/UnauthorizedPage.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();

  // Redirigir automáticamente si el usuario tiene roles (significa que acaba de recibirlos)
  useEffect(() => {
    if (auth.user?.roles && auth.user.roles.length > 0) {
      console.log('🔄 Usuario tiene roles, redirigiendo automáticamente desde /unauthorized');
      const returnPath = getReturnPath();
      navigate(returnPath, { replace: true });
    }
  }, [auth.user?.roles, navigate]);

  // Determinar la ruta de destino según los roles del usuario
  const getReturnPath = (): string => {
    // Verificar si es superadmin
    const isSuperAdminByUsername = auth.user?.nombre_usuario?.toLowerCase() === 'superadmin';
    if (isSuperAdminByUsername) {
      return '/admin/vacaciones';
    }

    // Verificar roles
    const userRoles = auth.user?.roles || [];
    const roleNames = userRoles.map(r => r.toLowerCase().trim());
    
    // Verificar si es SuperAdministrador
    const superAdminVariations = [
      'superadministrador',
      'super_admin',
      'superadmin',
      'super administrador',
      'super-administrador',
      'super_administrador',
    ];
    const isSuperAdmin = superAdminVariations.some(variation => roleNames.includes(variation)) ||
                         roleNames.some(role => 
                           (role.includes('super') && role.includes('admin')) ||
                           role === 'superadmin'
                         );
    
    if (isSuperAdmin) {
      return '/admin/vacaciones';
    }
    
    // Verificar si es Administrador
    if (roleNames.includes('administrador') || roleNames.includes('admin')) {
      return '/admin/usuarios';
    }
    
    // Por defecto, ir a /home
    return '/home';
  };

  const handleReturn = () => {
    const returnPath = getReturnPath();
    navigate(returnPath, { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold text-red-600 dark:text-red-500 mb-4">
        Acceso Denegado
      </h1>
      <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
        Lo sentimos, no tienes los permisos necesarios para acceder a esta página.
      </p>
      <button
        onClick={handleReturn}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors duration-200 text-lg"
      >
        Volver a mi página principal
      </button>
    </div>
  );
};

export default UnauthorizedPage;