import React, { useEffect, useState } from "react";
import {
  getPendientesAutorizacion,
  autorizarMultipleProcesos,
} from "../services/autorizacion.service";
import {
  PendienteAutorizacion,
  AutorizacionUpdate,
} from "../types/autorizacion.types";
import { Loader, CheckSquare } from "lucide-react";
import { toast } from "react-hot-toast";

function formatDateYYYYMMDD(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const AutorizacionPage: React.FC = () => {
  const [pendientes, setPendientes] = useState<PendienteAutorizacion[]>([]);
  const [selectedLotes, setSelectedLotes] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<{
    lote: string;
    fecha_destajo: string;
    cod_proceso?: string;
    cod_subproceso?: string;
    producto?: string;
    proceso?: string;
    subproceso?: string;
    cliente?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Agrupar cabeceras únicas
  const cabeceras = React.useMemo(() => {
    const map = new Map<string, PendienteAutorizacion>();
    for (const item of pendientes) {
      const key = `${item.fecha_destajo}_${item.cod_producto}_${
        item.cod_subproceso || ""
      }_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }, [pendientes]);

  const totalPages = Math.ceil(cabeceras.length / itemsPerPage);

  const paginatedCabeceras = cabeceras.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const detalle = React.useMemo(() => {
    if (!selectedRow) return [];
    return pendientes.filter(
      (p) =>
        p.lote === selectedRow.lote &&
        p.fecha_destajo === selectedRow.fecha_destajo &&
        p.cod_proceso === selectedRow.cod_proceso &&
        (p.cod_subproceso || "") === (selectedRow.cod_subproceso || "")
    );
  }, [pendientes, selectedRow]);

  // Cargar lista de pendientes
  const fetchPendientes = async () => {
    setLoading(true);
    try {
      const data = await getPendientesAutorizacion();
      setPendientes(data);
    } catch (err) {
      toast.error("Error al cargar pendientes de autorización.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const toggleCheckbox = (
    lote: string,
    fecha_destajo: string,
    cod_proceso: string,
    cod_subproceso?: string
  ) => {
    const key = `${lote}_${fecha_destajo}_${cod_proceso}_${cod_subproceso || ""}`;
    const updated = new Set(selectedLotes);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    setSelectedLotes(updated);
  };

  const handleRowClick = (item: PendienteAutorizacion) => {
    setSelectedRow({
      lote: item.lote,
      fecha_destajo: item.fecha_destajo,
      cod_proceso: item.cod_proceso,
      cod_subproceso: item.cod_subproceso,
      producto: item.producto,
      proceso: item.proceso,
      subproceso: item.subproceso,
      cliente: item.cliente,
    });
  };

  const handleAutorizar = async () => {
    if (selectedLotes.size === 0) {
      toast.error("Seleccione al menos un registro.");
      return;
    }
    setIsAuthorizing(true);
    try {
      const payload: AutorizacionUpdate[] = [];
      selectedLotes.forEach((key) => {
        const [lote, fecha_destajo, cod_proceso, cod_subproceso] = key.split("_");
        payload.push({
          lote,
          fecha_destajo,
          cod_proceso,
          cod_subproceso: cod_subproceso || undefined,
          nuevo_estado: 1,
        });
      });
      const result = await autorizarMultipleProcesos(payload);
      if (result.exitosos > 0) {
        toast.success(
          `✔ ${result.exitosos} procesos autorizados. ❌ ${result.fallidos} fallidos`
        );
      } else {
        toast.error("No se autorizó ningún proceso.");
      }
      await fetchPendientes();
      setSelectedLotes(new Set());
      setSelectedRow(null);
      setCurrentPage(1);
    } catch (err) {
      toast.error("Error al autorizar procesos.");
      console.error(err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Encabezado con título y botón alineados */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-indigo-600" />
          Autorización de Procesos
        </h2>
        <button
          onClick={handleAutorizar}
          disabled={isAuthorizing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 text-sm"
        >
          {isAuthorizing && <Loader className="animate-spin h-4 w-4" />}
          {isAuthorizing ? "Autorizando..." : "Autorizar Destajo"}
        </button>
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-6">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <p className="ml-3 text-gray-500 dark:text-gray-400 text-sm">
            Cargando pendientes...
          </p>
        </div>
      )}

      {/* Tabla Cabeceras */}
      {!loading && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1 text-left text-table-header">Fecha Destajo</th>
                <th className="px-2 py-1 text-left text-table-header">Producto</th>
                <th className="px-2 py-1 text-left text-table-header">Proceso</th>
                <th className="px-2 py-1 text-left text-table-header">Subproceso</th>
                <th className="px-2 py-1 text-left text-table-header">Cliente</th>
                <th className="px-2 py-1 text-left text-table-header">Lote</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCabeceras.length > 0 ? (
                paginatedCabeceras.map((item, idx) => {
                  const key = `${item.lote}_${item.fecha_destajo}_${item.cod_proceso}_${item.cod_subproceso || ""}`;
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleRowClick(item)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        selectedRow?.lote === item.lote &&
                        selectedRow?.fecha_destajo === item.fecha_destajo &&
                        selectedRow?.cod_proceso === item.cod_proceso &&
                        (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "")
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLotes.has(key)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() =>
                            toggleCheckbox(item.lote, item.fecha_destajo, item.cod_proceso, item.cod_subproceso)
                          }
                          className="text-table-cell"
                        />
                      </td>
                      <td className="px-2 py-1 text-table-cell">{formatDateYYYYMMDD(item.fecha_destajo)}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_producto} {item.producto}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_proceso} {item.proceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_subproceso} {item.subproceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cliente}</td>
                      <td className="px-2 py-1 text-table-cell">{item.lote}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                    No hay registros pendientes de autorización.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {cabeceras.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm">registros</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Tabla Detalle con título */}
      {selectedRow && (
        <div className="mb-4">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-semibold text-sm">
              Detalle: Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | 
              Lote: {selectedRow.lote} | 
              Proceso: {selectedRow.proceso}
              {selectedRow.subproceso && ` | Subproceso: ${selectedRow.subproceso}`}
              {selectedRow.cliente && ` | Cliente: ${selectedRow.cliente}`}
            </h3>
          </div>
          <div className="shadow-md rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 overflow-x-auto max-h-72 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-1 text-left text-table-header">Cod Trabajador</th>
                  <th className="px-2 py-1 text-left text-table-header">Trabajador</th>
                  <th className="px-2 py-1 text-left text-table-header">Horas</th>
                  <th className="px-2 py-1 text-left text-table-header">Kilos</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {detalle.length > 0 ? (
                  detalle.map((d, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.horas}</td>
                      <td className="px-2 py-1 text-table-cell">{d.kilos}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-500 text-table-detail">
                      No hay detalle para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutorizacionPage;