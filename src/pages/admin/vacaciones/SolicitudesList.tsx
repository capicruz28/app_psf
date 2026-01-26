// src/pages/admin/vacaciones/SolicitudesList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Eye, 
  XCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { getSolicitudes, buscarTrabajadores } from '../../../services/vacaciones.service';
import type { 
  SolicitudWithDetails, 
  SolicitudesFilters,
  TipoSolicitud,
  EstadoSolicitud,
} from '../../../types/vacaciones.types';
import { 
  TIPO_SOLICITUD_OPTIONS,
  ESTADO_SOLICITUD_OPTIONS
} from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { getErrorMessage } from '../../../services/error.service';

interface SolicitudesListProps {
  onViewDetail: (solicitud: SolicitudWithDetails) => void;
}

const SolicitudesList: React.FC<SolicitudesListProps> = ({ onViewDetail }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filtros
  const [filters, setFilters] = useState<SolicitudesFilters>({
    page: 1,
    limit,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchCodigoTrabajador, setSearchCodigoTrabajador] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoSolicitud | ''>('');
  const [filterTipoSolicitud, setFilterTipoSolicitud] = useState<TipoSolicitud | ''>('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  const fetchSolicitudes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getSolicitudes(filters);
      let solicitudesData = response.solicitudes || [];
      
      // Enriquecer solicitudes con nombres de trabajadores
      // La descripción del permiso ya viene del backend en descripcion_permiso
      const solicitudesEnriquecidas = await Promise.all(
        solicitudesData.map(async (solicitud) => {
          const enriquecida = { ...solicitud };
          
          // Buscar nombre del trabajador si no está disponible
          if (solicitud.codigo_trabajador && !solicitud.trabajador_nombre) {
            try {
              const trabajadorResponse = await buscarTrabajadores({ codigo: solicitud.codigo_trabajador.trim(), limit: 1 });
              if (trabajadorResponse.items.length > 0) {
                enriquecida.trabajador_nombre = trabajadorResponse.items[0].nombre_completo;
              }
            } catch (error) {
              console.error('Error buscando trabajador:', error);
            }
          }
          
          return enriquecida;
        })
      );
      
      setSolicitudes(solicitudesEnriquecidas);
      setTotalPages(response.total_pages || 1);
      setTotal(response.total || 0);
      setCurrentPage(response.page || 1);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar solicitudes');
      console.error('Error fetching solicitudes:', error);
      // Asegurar que siempre sea un array incluso en caso de error
      setSolicitudes([]);
      setTotalPages(1);
      setTotal(0);
      setCurrentPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleApplyFilters = () => {
    const newFilters: SolicitudesFilters = {
      page: 1,
      limit,
    };

    if (searchCodigoTrabajador.trim()) {
      newFilters.codigo_trabajador = searchCodigoTrabajador.trim();
    }
    if (filterEstado) {
      newFilters.estado = filterEstado;
    }
    if (filterTipoSolicitud) {
      newFilters.tipo_solicitud = filterTipoSolicitud;
    }
    if (filterFechaDesde) {
      newFilters.fecha_desde = filterFechaDesde;
    }
    if (filterFechaHasta) {
      newFilters.fecha_hasta = filterFechaHasta;
    }

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchCodigoTrabajador('');
    setFilterEstado('');
    setFilterTipoSolicitud('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    const newFilters: SolicitudesFilters = { page: 1, limit };
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
      setCurrentPage(newPage);
    }
  };

  const getEstadoBadgeClass = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'P':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'A':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'R':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'N':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoLabel = (estado: EstadoSolicitud) => {
    return ESTADO_SOLICITUD_OPTIONS.find(opt => opt.value === estado)?.label || estado;
  };

  const getTipoLabel = (tipo: TipoSolicitud) => {
    return TIPO_SOLICITUD_OPTIONS.find(opt => opt.value === tipo)?.label || tipo;
  };

  return (
    <div className="space-y-4">
      {/* Header con búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por código de trabajador..."
              value={searchCodigoTrabajador}
              onChange={(e) => setSearchCodigoTrabajador(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Button
            variant="outline"
            onClick={fetchSolicitudes}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as EstadoSolicitud | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                {ESTADO_SOLICITUD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Solicitud
              </label>
              <select
                value={filterTipoSolicitud}
                onChange={(e) => setFilterTipoSolicitud(e.target.value as TipoSolicitud | '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                {TIPO_SOLICITUD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de solicitudes */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando solicitudes...</p>
          </div>
        ) : !solicitudes || solicitudes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">No se encontraron solicitudes</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fechas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Días
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id_solicitud} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{solicitud.id_solicitud}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {solicitud.codigo_trabajador}
                        {solicitud.trabajador_nombre && (
                          <span className="text-gray-500 ml-1">({solicitud.trabajador_nombre})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {solicitud.tipo_solicitud === 'P' && solicitud.codigo_permiso ? (
                          <>
                            {getTipoLabel(solicitud.tipo_solicitud)}
                            {' '}
                            <span className="text-gray-500">
                              ({solicitud.codigo_permiso}
                              {solicitud.descripcion_permiso && ` - ${solicitud.descripcion_permiso.trim()}`})
                            </span>
                          </>
                        ) : (
                          getTipoLabel(solicitud.tipo_solicitud)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div>{new Date(solicitud.fecha_inicio).toLocaleDateString('es-PE')}</div>
                            <div className="text-xs text-gray-500">hasta {new Date(solicitud.fecha_fin).toLocaleDateString('es-PE')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {solicitud.dias_solicitados} días
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadgeClass(solicitud.estado)}`}>
                          {getEstadoLabel(solicitud.estado)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetail(solicitud)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, total)} de {total} solicitudes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Página {currentPage} de {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SolicitudesList;
