// src/pages/admin/vacaciones/VacacionesAdminPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  FileText, 
  Settings, 
  Users, 
  UserCheck, 
  BarChart3, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import SolicitudesList from './SolicitudesList';
import SolicitudDetail from './SolicitudDetail';
import ConfigFlujoPage from './ConfigFlujoPage';
import JerarquiaPage from './JerarquiaPage';
import SustitutosPage from './SustitutosPage';
import EstadisticasPage from './EstadisticasPage';
import SaldosPage from './SaldosPage';
import type { SolicitudWithDetails } from '../../../types/vacaciones.types';

type TabType = 'solicitudes' | 'estadisticas' | 'saldos' | 'config-flujo' | 'jerarquia' | 'sustitutos';

const VacacionesAdminPage: React.FC = () => {
  const { hasRole, auth } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('solicitudes');
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Verificar rol SuperAdministrador (la ruta ya está protegida, pero esto es una capa adicional)
  // Verificar por nombre de usuario también
  useEffect(() => {
    const isSuperAdmin = hasRole('SuperAdministrador', 'superadministrador', 'super_admin') ||
                         auth.user?.nombre_usuario?.toLowerCase() === 'superadmin';
    if (!isSuperAdmin) {
      // La ruta ya está protegida, pero por si acaso redirigimos
      navigate('/unauthorized', { replace: true });
    }
  }, [hasRole, navigate, auth.user?.nombre_usuario]);

  const handleViewDetail = (solicitud: SolicitudWithDetails) => {
    setSelectedSolicitud(solicitud);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedSolicitud(null);
  };

  const handleAnulada = () => {
    // Recargar la lista si es necesario
    window.location.reload();
  };

  const tabs = [
    { id: 'solicitudes' as TabType, label: 'Solicitudes', icon: FileText },
    { id: 'estadisticas' as TabType, label: 'Estadísticas', icon: BarChart3 },
    { id: 'saldos' as TabType, label: 'Saldos', icon: Calendar },
    { id: 'config-flujo' as TabType, label: 'Config. Flujo', icon: Settings },
    { id: 'jerarquia' as TabType, label: 'Jerarquías', icon: Users },
    { id: 'sustitutos' as TabType, label: 'Sustitutos', icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Administración de Vacaciones y Permisos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Gestión completa del sistema de vacaciones y permisos
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'solicitudes' && (
          <SolicitudesList onViewDetail={handleViewDetail} />
        )}
        {activeTab === 'estadisticas' && <EstadisticasPage />}
        {activeTab === 'saldos' && <SaldosPage />}
        {activeTab === 'config-flujo' && <ConfigFlujoPage />}
        {activeTab === 'jerarquia' && <JerarquiaPage />}
        {activeTab === 'sustitutos' && <SustitutosPage />}
      </div>

      {/* Dialog de Detalle de Solicitud */}
      {selectedSolicitud && (
        <SolicitudDetail
          solicitudId={selectedSolicitud.id_solicitud}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onAnulada={handleAnulada}
        />
      )}
    </div>
  );
};

export default VacacionesAdminPage;
