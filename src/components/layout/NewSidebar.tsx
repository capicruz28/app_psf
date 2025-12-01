// src/components/layout/NewSidebar.tsx - PARTE 1 (VERSIÓN CORREGIDA)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBreadcrumb } from '../../context/BreadcrumbContext';
import * as LucideIcons from 'lucide-react';

import { menuService } from '../../services/menu.service'; 
import type { SidebarMenuItem, SidebarProps } from '../../types/menu.types'; 
import { administrationNavItems } from '../../config/adminMenu';

// --- CONSTANTES ---
const baseIconClasses = "w-5 h-5 text-current opacity-100 inline-block"; 
const transitionClass = 'transition-all duration-200 ease-in-out'; 

// --- FUNCIONES AUXILIARES ---
const getIcon = (iconName: string | null | undefined, FallbackIcon: React.ElementType = LucideIcons.Circle) => {
  if (!iconName) {
    return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
  }
  
  try {
    const normalizedName = iconName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    let IconComponent = (LucideIcons as any)[normalizedName];
    
    if (!IconComponent) {
      IconComponent = (LucideIcons as any)[iconName]; 
    }
    
    if (!IconComponent) {
      return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
    }
    
    return <IconComponent className={baseIconClasses} />;
  } catch (e) {
    return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
  }
};

// Normalizar ruta (soluciona error TS)
const normalizePath = (ruta: string | null | undefined): string => {
  if (!ruta || ruta === '#') return '#';
  return ruta.startsWith('/') ? ruta : `/${ruta}`;
};

// --- COMPONENTE TOOLTIP MEJORADO ---
interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const SidebarTooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8
      });
      setShow(true);
    }
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {show && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-1 duration-150">
            {text}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
          </div>
        </div>
      )}
    </>
  );
};

// --- COMPONENTE PRINCIPAL ---
const NewSidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { logout, hasRole } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isAdmin = useMemo(() => hasRole('admin'), [hasRole]);
  
  // Estados principales
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Estados para expansión temporal en hover
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [currentPath, isMobile]);

  // Manejar hover para expansión temporal
  const handleMouseEnter = useCallback(() => {
    if (isCollapsed && !isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverExpanded(true);
      }, 300);
    }
  }, [isCollapsed, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverExpanded(false);
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Función para buscar breadcrumb
  const findBreadcrumbPath = useCallback((
    items: SidebarMenuItem[], 
    targetPath: string, 
    currentBreadcrumb: Array<{nombre: string, ruta?: string | null}> = []
  ): Array<{nombre: string, ruta?: string | null}> | null => {
    for (const item of items) {
      const itemPath = normalizePath(item.ruta);
      const newBreadcrumb = [...currentBreadcrumb, { nombre: item.nombre, ruta: item.ruta }];
      
      if (item.ruta && itemPath === targetPath) {
        return newBreadcrumb;
      }
      
      if (item.children && item.children.length > 0) {
        const childResult = findBreadcrumbPath(item.children, targetPath, newBreadcrumb);
        if (childResult) {
          return childResult;
        }
      }
      
      if (item.ruta && targetPath.startsWith(itemPath) && itemPath !== '/') {
        return newBreadcrumb;
      }
    }
    return null;
  }, []);

  // Actualizar breadcrumb
  useEffect(() => {
    let breadcrumb = findBreadcrumbPath(menuItems, currentPath);
    
    if (!breadcrumb && isAdmin) {
      const adminItem = administrationNavItems.find(item => {
        if (item.isSeparator) return false;
        const itemPath = normalizePath(item.ruta);
        return currentPath === itemPath || currentPath.startsWith(itemPath);
      });
      
      if (adminItem) {
        breadcrumb = [
          { nombre: 'Administración', ruta: null }, 
          { nombre: adminItem.nombre, ruta: adminItem.ruta }
        ];
      }
    }
    
    if (breadcrumb) {
      setBreadcrumbs(breadcrumb);
    } else {
      setBreadcrumbs([]);
    }
  }, [currentPath, menuItems, isAdmin, findBreadcrumbPath, setBreadcrumbs]);

  const handleNavigate = useCallback((path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    navigate(normalizedPath);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [navigate, isMobile]);

  const getItemIdentifier = useCallback((item: SidebarMenuItem): string => {
    return `${item.menu_id}-${item.nombre}`;
  }, []);

  const toggleExpanded = useCallback((identifier: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(identifier)) {
        newSet.delete(identifier);
      } else {
        newSet.add(identifier);
      }
      return newSet;
    });
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await menuService.getSidebarMenu();
        setMenuItems(items);
      } catch (err) {
        console.error('❌ Error fetching sidebar data:', err);
        setError(`No se pudieron cargar los datos del menú. Intente recargar.`);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Expand Parents
  useEffect(() => {
    const findAndExpandParents = (
      items: SidebarMenuItem[], 
      targetPath: string, 
      currentExpanded: Set<string>
    ) => {
      let found = false;
      
      for (const item of items) {
        const itemIdentifier = getItemIdentifier(item);
        const itemPath = normalizePath(item.ruta);

        if (item.ruta && targetPath.startsWith(itemPath) && targetPath !== '/') {
          return true;
        }
        
        if (item.children && item.children.length > 0) {
          if (findAndExpandParents(item.children, targetPath, currentExpanded)) {
            currentExpanded.add(itemIdentifier);
            found = true;
          }
        }
      }
      return found;
    };

    const newExpanded = new Set<string>();
    if (menuItems.length > 0 && !isMobile) {
      findAndExpandParents(menuItems, currentPath, newExpanded);
    }
    setExpandedItems(newExpanded);
    
  }, [menuItems, currentPath, getItemIdentifier, isMobile]);

  // Determinar si el sidebar debe estar visualmente expandido
  const isVisuallyExpanded = !isCollapsed || isHoverExpanded;
  const collapsedWidthClass = 'w-[72px]';
  const expandedWidthClass = 'w-64';
  const widthClass = isVisuallyExpanded ? expandedWidthClass : collapsedWidthClass;

  // Obtención de clases de link
  const getLinkClasses = useCallback((path: string, exactMatch: boolean = false) => {
    const normalizedPath = path === '#' ? '#' : (path.startsWith('/') ? path : `/${path}`);
    const isActive = exactMatch ? currentPath === normalizedPath : currentPath.startsWith(normalizedPath);
    
    return `
      flex items-center p-2 rounded-lg relative
      ${!isVisuallyExpanded && !isMobile ? 'justify-center' : 'w-full'}
      ${transitionClass}
      ${isActive
        ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-medium before:content-[""] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-600 before:rounded-lg shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm'
      }
    `;
  }, [currentPath, isVisuallyExpanded, transitionClass, isMobile]);

  // Renderizar contenido del link
  const renderLinkContent = useCallback((item: SidebarMenuItem, hasChildren: boolean, isExpanded: boolean) => {
    const Icon = getIcon(item.icono, LucideIcons.Circle);
    return (
      <>
        <div className="flex-shrink-0 text-current relative">
          {Icon}
          {hasChildren && !isVisuallyExpanded && !isMobile && (
            <div className="absolute -top-0.5 -right-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-gray-900"></div>
            </div>
          )}
        </div>
        {(isVisuallyExpanded || isMobile) && (
          <>
            <span className="ml-3 text-sm flex-1 truncate">{item.nombre}</span>
            {hasChildren && (
              <LucideIcons.ChevronDown 
                className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            )}
          </>
        )}
      </>
    );
  }, [isVisuallyExpanded, isMobile]);

  // src/components/layout/NewSidebar.tsx - PARTE 2 (VERSIÓN CORREGIDA)
// CONTINUACIÓN desde la Parte 1...

  // Renderizar wrapper del item
  const renderItemWrapper = useCallback((
    item: SidebarMenuItem, 
    isExpanded: boolean, 
    isChildActive: boolean, 
    indentClass: string
  ) => {
    const itemIdentifier = getItemIdentifier(item);
    const itemPath = normalizePath(item.ruta);
    const hasValidRoute = item.ruta && item.ruta !== '#' && item.es_activo;
    const hasChildren = item.children && item.children.length > 0;
    
    if (hasValidRoute) {
      return (
        <div className={`flex items-stretch gap-1 ${indentClass}`}>
          <NavLink
            to={itemPath}
            className={`flex-1 text-left ${getLinkClasses(itemPath, true)}`}
            end={true}
          >
            <div className="flex items-center w-full">
              {renderLinkContent(item, false, false)} 
            </div>
          </NavLink>
          
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(itemIdentifier)}
              className={`
                flex items-center justify-center p-2 rounded-lg flex-shrink-0 w-8
                ${transitionClass}
                ${isExpanded || isChildActive
                  ? 'bg-gray-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              <LucideIcons.ChevronDown 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          )}
        </div>
      );
    } 
    
    if (hasChildren && !hasValidRoute) {
      return (
        <button
          onClick={() => toggleExpanded(itemIdentifier)}
          className={`
            flex items-center p-2 rounded-lg w-full text-left
            ${transitionClass} ${indentClass}
            ${isExpanded || isChildActive
              ? 'bg-gray-100 dark:bg-gray-700 font-semibold text-indigo-700 dark:text-indigo-400' 
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
        >
          {renderLinkContent(item, hasChildren, isExpanded)}
        </button>
      );
    }
    
    return null; 
  }, [getItemIdentifier, getLinkClasses, toggleExpanded, transitionClass, renderLinkContent]);

  // Renderizar item de menú
  const renderMenuItem = useCallback((item: SidebarMenuItem, level: number = 0) => {
    const itemIdentifier = getItemIdentifier(item);
    const hasChildren = item.children && item.children.length > 0;
    const itemPath = normalizePath(item.ruta);
    const hasValidRoute = item.ruta && item.ruta !== '#' && item.es_activo;
    const isExpanded = expandedItems.has(itemIdentifier);
    
    const isChildActive = hasChildren && item.children?.some(child => {
      if (!child.ruta) return false;
      const childPath = normalizePath(child.ruta);
      return currentPath.startsWith(childPath);
    });
    const isDirectlyActive = hasValidRoute && currentPath.startsWith(itemPath);
    const isActive = isDirectlyActive || isChildActive; 

    const indentClass = level > 0 ? 'pl-4' : '';

    // Si el sidebar está colapsado y no hay hover, solo mostrar icono con tooltip
    if (!isVisuallyExpanded && !isMobile) {
      return (
        <SidebarTooltip key={itemIdentifier} text={item.nombre}>
          <button
            onClick={() => {
              if (hasValidRoute && !hasChildren) {
                handleNavigate(itemPath);
              }
            }}
            className={`
              ${getLinkClasses(itemPath)}
              ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400' : ''}
              w-full
            `}
          >
            {renderLinkContent(item, hasChildren, isExpanded)}
          </button>
        </SidebarTooltip>
      );
    }

    // Modo expandido (normal o por hover)
    if (!hasValidRoute && !hasChildren) {
      return null;
    }

    return (
      <div key={itemIdentifier}>
        {renderItemWrapper(item, isExpanded, isChildActive, indentClass)}
        
        {hasChildren && (
          <div 
            className={`
              ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} 
              overflow-hidden ${transitionClass}
              ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3
            `}
          >
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [
    getItemIdentifier, expandedItems, currentPath, isVisuallyExpanded, getLinkClasses, 
    renderItemWrapper, transitionClass, renderLinkContent, isMobile, handleNavigate
  ]);

  // Renderizar menú dinámico
  const renderDynamicMenu = useMemo(() => {
    const menuByArea = menuItems.reduce((acc, item) => {
      const areaName = item.area_nombre || 'General';
      if (!acc[areaName]) {
        acc[areaName] = [];
      }
      acc[areaName].push(item);
      return acc;
    }, {} as Record<string, SidebarMenuItem[]>);

    return Object.entries(menuByArea).map(([areaName, items]) => (
      <div key={areaName} className="mt-4 first:mt-0"> 
        {(isVisuallyExpanded || isMobile) && areaName !== 'General' && (
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 pl-2">
            {areaName}
          </h3>
        )}
        <div className="space-y-1">
          {items.map(item => renderMenuItem(item))}
        </div>
      </div>
    ));
  }, [menuItems, isVisuallyExpanded, renderMenuItem, isMobile]);

  // Renderizar menú de administración
  const renderAdminStaticMenu = useMemo(() => (
    <div className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-3">
      {(isVisuallyExpanded || isMobile) && (
        <div className="mb-2 pl-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <LucideIcons.Shield className="w-4 h-4" />
            Administración
          </h2>
        </div>
      )}
      
      {!isVisuallyExpanded && !isMobile && (
        <div className="mb-3 px-1">
          <div className="p-2 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <LucideIcons.Shield className="w-5 h-5" />
          </div>
        </div>
      )}
      
      <div className="space-y-1">
        {administrationNavItems.map((item) => {
          if (item.isSeparator) { 
            if (!isVisuallyExpanded && !isMobile) return null; 
            return (
              <h3 
                key={item.menu_id}
                className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 pl-2 mt-4"
              >
                {item.nombre}
              </h3>
            );
          }
          
          const IconComponent = getIcon(item.icono, LucideIcons.LayoutDashboard);
          const itemPath = normalizePath(item.ruta);

          const linkElement = (
            <NavLink
              to={itemPath}
              className={getLinkClasses(itemPath, true)}
              end={true}
            >
              {IconComponent}
              {(isVisuallyExpanded || isMobile) && (
                <span className="ml-3 text-sm flex-1 truncate">{item.nombre}</span>
              )}
            </NavLink>
          );

          // Envolver con tooltip solo en modo colapsado
          if (!isVisuallyExpanded && !isMobile) {
            return (
              <SidebarTooltip key={item.menu_id} text={item.nombre}>
                {linkElement}
              </SidebarTooltip>
            );
          }

          return <div key={item.menu_id}>{linkElement}</div>;
        })}
      </div>
    </div>
  ), [isVisuallyExpanded, getLinkClasses, isMobile]);

  // src/components/layout/NewSidebar.tsx - PARTE 3 (VERSIÓN CORREGIDA)
// CONTINUACIÓN desde la Parte 2...

  // RENDERIZADO PRINCIPAL - MÓVIL
  if (isMobile) {
    return (
      <>
        {/* Overlay cuando el menú está abierto */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Panel de menú deslizante desde abajo */}
        <div 
          className={`
            fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 
            border-t border-gray-200 dark:border-gray-800 z-50
            transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'}
            max-h-[80vh] rounded-t-2xl shadow-2xl
            overflow-y-auto overflow-x-hidden
          `}
        >
          {/* Handle para arrastrar */}
          <div className="flex justify-center py-2 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          </div>

          <div className="p-4">
            {loading && (
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <LucideIcons.Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando...</span>
              </div>
            )}

            {error && (
              <div className="p-4 flex flex-col items-center text-center">
                <LucideIcons.AlertCircle className="w-6 h-6 text-red-500" />
                <span className="mt-2 text-sm text-red-500">{error}</span>
              </div>
            )}

            {!loading && !error && (
              <nav>
                {isAdmin && renderAdminStaticMenu}
                
                {menuItems.length > 0 && (
                  <div className="space-y-1"> 
                    {isAdmin && (
                      <div className="pl-2 mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <LucideIcons.Boxes className="w-4 h-4" />
                          Módulos
                        </h2>
                      </div>
                    )}
                    
                    {renderDynamicMenu}
                  </div>
                )}
              </nav>
            )}
          </div>
        </div>

        {/* Barra de navegación inferior (Tab Bar) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 safe-area-inset-bottom shadow-lg">
          <div className="flex items-center justify-around h-16 px-2">
            <button
              onClick={() => navigate('/')}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-200
                ${currentPath === '/' 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <LucideIcons.Home className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">Inicio</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-200
                ${mobileMenuOpen 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}
            >
              {mobileMenuOpen ? (
                <LucideIcons.X className="w-6 h-6" />
              ) : (
                <LucideIcons.Menu className="w-6 h-6" />
              )}
              <span className="text-xs mt-1 font-medium">Menú</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 dark:text-gray-400 transition-colors duration-200"
            >
              {isDarkMode ? (
                <LucideIcons.Sun className="w-6 h-6 text-yellow-500" />
              ) : (
                <LucideIcons.Moon className="w-6 h-6" />
              )}
              <span className="text-xs mt-1 font-medium">Tema</span>
            </button>

            <button
              onClick={logout}
              className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors duration-200"
            >
              <LucideIcons.LogOut className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">Salir</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // RENDERIZADO PRINCIPAL - DESKTOP
  return (
    <div 
      ref={sidebarRef}
      className={`
        fixed top-0 left-0 h-full z-30 
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        flex flex-col flex-shrink-0
        ${widthClass} ${transitionClass}
        shadow-lg
        overflow-hidden
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className={`
        flex items-center h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800
        ${!isVisuallyExpanded ? 'justify-center' : 'justify-between px-4'}
      `}>
        {isVisuallyExpanded ? (
          <div className="font-bold text-lg text-gray-900 dark:text-white truncate">
            Peruvian Sea Food
          </div>
        ) : (
          <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <LucideIcons.Waves className="w-6 h-6" />
          </div>
        )}
        <button
          onClick={toggleSidebar} 
          className={`
            flex items-center p-2 rounded-lg 
            ${transitionClass} 
            hover:bg-gray-100 dark:hover:bg-gray-700
            text-gray-500 dark:text-gray-400 flex-shrink-0
            ${!isVisuallyExpanded ? 'justify-center mt-2' : ''}
          `}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {isCollapsed ? (
            <LucideIcons.PanelLeftOpen className="w-5 h-5" />
          ) : (
            <LucideIcons.PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Contenido del menú - CON OVERFLOW CONTROLADO */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <style>{`
          /* Ocultar scrollbar horizontal completamente */
          .sidebar-content::-webkit-scrollbar-horizontal {
            display: none;
          }
          .sidebar-content {
            scrollbar-width: thin;
            scrollbar-color: rgb(156, 163, 175) transparent;
          }
          .dark .sidebar-content {
            scrollbar-color: rgb(75, 85, 99) transparent;
          }
          /* Scrollbar vertical elegante */
          .sidebar-content::-webkit-scrollbar {
            width: 6px;
          }
          .sidebar-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-content::-webkit-scrollbar-thumb {
            background-color: rgb(156, 163, 175);
            border-radius: 3px;
          }
          .dark .sidebar-content::-webkit-scrollbar-thumb {
            background-color: rgb(75, 85, 99);
          }
          .sidebar-content::-webkit-scrollbar-thumb:hover {
            background-color: rgb(107, 114, 128);
          }
          .dark .sidebar-content::-webkit-scrollbar-thumb:hover {
            background-color: rgb(55, 65, 81);
          }
        `}</style>
        
        <div className="sidebar-content px-2 pb-4">
          {loading && (
            <div className="p-4 flex flex-col items-center justify-center text-center">
              <LucideIcons.Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              {isVisuallyExpanded && (
                <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando menú...</span>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 flex flex-col items-center text-center">
              <LucideIcons.AlertCircle className="w-6 h-6 text-red-500" />
              {isVisuallyExpanded && (
                <span className="mt-2 text-sm text-red-500">{error}</span>
              )}
            </div>
          )}

          {!loading && !error && (
            <nav>
              {isAdmin && renderAdminStaticMenu}
              
              {menuItems.length > 0 && (
                <div className="space-y-1"> 
                  {isVisuallyExpanded && isAdmin && (
                    <div className="pl-2 mb-4 mt-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <LucideIcons.Boxes className="w-4 h-4" />
                        Módulos
                      </h2>
                    </div>
                  )}

                  {!isVisuallyExpanded && isAdmin && (
                    <div className="px-1 mb-1 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3"> 
                      <div className="p-2 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <LucideIcons.Boxes className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                  
                  {renderDynamicMenu}
                </div>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Footer con acciones */}
      <div
        className={`
          border-t border-gray-200 dark:border-gray-800 flex-shrink-0
          h-auto flex flex-col justify-center p-2
        `}
      >
        <div className="flex flex-col space-y-1"> 
          {/* Botón de tema */}
          <SidebarTooltip text={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <button
              onClick={toggleDarkMode}
              className={`
                flex items-center p-2 rounded-lg 
                ${transitionClass}
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300
                ${!isVisuallyExpanded ? 'justify-center' : 'w-full'}
              `}
            >
              {isDarkMode ? (
                <LucideIcons.Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <LucideIcons.Moon className="w-5 h-5" />
              )}
              {isVisuallyExpanded && (
                <span className="ml-3 text-sm flex-1 text-left">
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              )}
            </button>
          </SidebarTooltip>
          
          {/* Botón de cerrar sesión */}
          <SidebarTooltip text="Cerrar sesión">
            <button
              onClick={logout}
              className={`
                flex items-center p-2 rounded-lg 
                ${transitionClass}
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300 hover:text-red-500
                ${!isVisuallyExpanded ? 'justify-center' : 'w-full'}
              `}
            >
              <LucideIcons.LogOut className="w-5 h-5" />
              {isVisuallyExpanded && (
                <span className="ml-3 text-sm flex-1 text-left">Cerrar Sesión</span>
              )}
            </button>
          </SidebarTooltip>
        </div>
      </div>
    </div>
  );
};

export default NewSidebar;