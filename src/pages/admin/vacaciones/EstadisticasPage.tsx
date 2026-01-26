// src/pages/admin/vacaciones/EstadisticasPage.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, Calendar, TrendingUp, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getEstadisticas } from '../../../services/vacaciones.service';
import type { Estadisticas } from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { getErrorMessage } from '../../../services/error.service';

const EstadisticasPage: React.FC = () => {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchEstadisticas = async () => {
    setIsLoading(true);
    try {
      const data = await getEstadisticas(
        fechaDesde || undefined,
        fechaHasta || undefined
      );
      // Asegurar que siempre tenga la estructura correcta con valores por defecto
      const defaultStats = {
        total_solicitudes: 0,
        solicitudes_pendientes: 0,
        solicitudes_aprobadas: 0,
        solicitudes_rechazadas: 0,
        solicitudes_anuladas: 0,
        total_vacaciones: 0,
        total_permisos: 0,
        dias_solicitados_totales: 0,
        dias_aprobados_totales: 0,
        solicitudes_por_mes: [],
      };
      // Fusionar datos del backend con valores por defecto para asegurar que todos los campos existan
      setEstadisticas({
        ...defaultStats,
        ...(data || {}),
        dias_solicitados_totales: data?.dias_solicitados_totales ?? 0,
        dias_aprobados_totales: data?.dias_aprobados_totales ?? 0,
        solicitudes_por_mes: data?.solicitudes_por_mes ?? [],
      });
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar estadísticas');
      // Establecer valores por defecto en caso de error
      setEstadisticas({
        total_solicitudes: 0,
        solicitudes_pendientes: 0,
        solicitudes_aprobadas: 0,
        solicitudes_rechazadas: 0,
        solicitudes_anuladas: 0,
        total_vacaciones: 0,
        total_permisos: 0,
        dias_solicitados_totales: 0,
        dias_aprobados_totales: 0,
        solicitudes_por_mes: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const handleApplyFilters = () => {
    fetchEstadisticas();
  };

  if (isLoading && !estadisticas) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard de Estadísticas
        </h2>
        <Button onClick={fetchEstadisticas} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleApplyFilters} className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Solicitudes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {estadisticas.total_solicitudes}
              </p>
            </div>
            <FileText className="w-12 h-12 text-indigo-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aprobadas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {estadisticas.solicitudes_aprobadas}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                {estadisticas.solicitudes_pendientes}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rechazadas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {estadisticas.solicitudes_rechazadas}
              </p>
            </div>
            <XCircle className="w-12 h-12 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Estadísticas detalladas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Por Tipo de Solicitud
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Vacaciones</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {estadisticas.total_vacaciones}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Permisos</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {estadisticas.total_permisos}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Días Totales
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Días Solicitados</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {(estadisticas.dias_solicitados_totales ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Días Aprobados</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {(estadisticas.dias_aprobados_totales ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos adicionales si están disponibles */}
      {estadisticas.solicitudes_por_mes && estadisticas.solicitudes_por_mes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Solicitudes por Mes
          </h3>
          <div className="space-y-2">
            {estadisticas?.solicitudes_por_mes?.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-24">{item.mes}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                  <div
                    className="bg-indigo-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(item.cantidad / estadisticas.total_solicitudes) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">{item.cantidad}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasPage;
