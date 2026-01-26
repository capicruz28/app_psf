// src/pages/admin/vacaciones/SaldosPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, Search, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { getSaldos } from '../../../services/vacaciones.service';
import type { SaldoVacaciones } from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { getErrorMessage } from '../../../services/error.service';

const SaldosPage: React.FC = () => {
  const [saldos, setSaldos] = useState<SaldoVacaciones[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [codigoArea, setCodigoArea] = useState('');
  const [codigoSeccion, setCodigoSeccion] = useState('');

  const fetchSaldos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getSaldos(
        codigoArea || undefined,
        codigoSeccion || undefined,
        currentPage,
        limit
      );
      // Asegurar que siempre sea un array
      setSaldos(response.saldos || []);
      setTotalPages(response.total_pages || 1);
      setTotal(response.total || 0);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar saldos');
      // Asegurar que siempre sea un array incluso en caso de error
      setSaldos([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, codigoArea, codigoSeccion]);

  useEffect(() => {
    fetchSaldos();
  }, [fetchSaldos]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getSaldoClass = (saldo: number) => {
    if (saldo > 10) return 'text-green-600 dark:text-green-400';
    if (saldo > 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reporte de Saldos de Vacaciones
        </h2>
        <Button onClick={fetchSaldos} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código Área
            </label>
            <input
              type="text"
              value={codigoArea}
              onChange={(e) => setCodigoArea(e.target.value)}
              placeholder="Filtrar por área..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código Sección
            </label>
            <input
              type="text"
              value={codigoSeccion}
              onChange={(e) => setCodigoSeccion(e.target.value)}
              placeholder="Filtrar por sección..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => { setCodigoArea(''); setCodigoSeccion(''); }} variant="outline" className="w-full">
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de saldos */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando saldos...</p>
          </div>
        ) : saldos.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">No se encontraron saldos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Trabajador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Área/Sección
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Días Asignados
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Días Usados
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Días Pendientes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Saldo Disponible
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {saldos && saldos.map((saldo, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {saldo.codigo_trabajador}
                          </div>
                          {saldo.trabajador_nombre && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {saldo.trabajador_nombre}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {saldo.area_nombre && (
                          <div>{saldo.area_nombre}</div>
                        )}
                        {saldo.seccion_nombre && (
                          <div className="text-xs">{saldo.seccion_nombre}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {saldo.dias_asignados_totales.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" />
                          {saldo.dias_usados.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
                        {saldo.dias_pendientes.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm font-semibold ${getSaldoClass(saldo.saldo_disponible)}`}>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {saldo.saldo_disponible.toFixed(2)} días
                          </div>
                        </div>
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
                  Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, total)} de {total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
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

export default SaldosPage;
