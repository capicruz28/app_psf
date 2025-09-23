// src/components/layout/Header.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Settings, LogOut, ChevronDown } from 'lucide-react';

const Header = () => {
  const { auth, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (auth.user?.nombre && auth.user?.apellido) {
      return `${auth.user.nombre.charAt(0)}${auth.user.apellido.charAt(0)}`;
    }
    return 'U';
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-16 w-full">
      <div className="h-full px-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Sistema Web Peruvian Sea Food
        </h1>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-3 focus:outline-none"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                {getInitials()}
              </div>
              <span className="text-gray-600 dark:text-gray-300 hidden md:block">
                {auth.user?.nombre} {auth.user?.apellido}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {auth.user?.nombre} {auth.user?.apellido}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {auth.user?.correo}
                </p>
              </div>

              <div className="py-1">
                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <User className="w-4 h-4 mr-3" />
                  Mi perfil
                </button>

                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Mail className="w-4 h-4 mr-3" />
                  Bandeja de entrada
                </button>

                <button
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Configuraciones de la cuenta
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                <button
                  onClick={logout}
                  className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;