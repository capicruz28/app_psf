import React, { useEffect, useState, useCallback } from "react";
import {
  getPendientesAutorizacion,
  finalizarTareo,
} from "../services/autorizacion.service";
import {
  PendienteAutorizacion,
  FinalizarTareoRequest,
} from "../types/autorizacion.types";
import { Loader, Save, Copy, Search, ChevronDown, ChevronUp, Clock, Package } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from '../context/AuthContext';

function formatDateYYYYMMDD(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const sortData = (data: PendienteAutorizacion[]): PendienteAutorizacion[] => {
  return [...data].sort((a, b) => {
    const dateA = new Date(a.fecha_destajo).getTime();
    const dateB = new Date(b.fecha_destajo).getTime();
    if (dateA !== dateB) return dateB - dateA;

    const prodA = `${a.cod_producto} ${a.producto}`.toLowerCase();
    const prodB = `${b.cod_producto} ${b.producto}`.toLowerCase();
    if (prodA !== prodB) return prodB.localeCompare(prodA);

    const procA = `${a.cod_proceso} ${a.proceso}`.toLowerCase();
    const procB = `${b.cod_proceso} ${b.proceso}`.toLowerCase();
    if (procA !== procB) return procB.localeCompare(procA);

    const subA = `${a.cod_subproceso || ''} ${a.subproceso || ''}`.toLowerCase();
    const subB = `${b.cod_subproceso || ''} ${b.subproceso || ''}`.toLowerCase();
    return subB.localeCompare(subA);
  });
};

interface DetalleEditable {
  cod_trabajador: string;
  trabajador: string;
  hora_inicio: string;
  hora_fin: string;
  horas: number;
  kilos: number;
  detalle_observacion: string;
}

/** Calcula diferencia en horas entre hora_inicio y hora_fin (formato HH:mm, 24h).
 * Maneja cruce de medianoche: 20:00 → 07:00 = 11h, 06:00 → 16:00 = 10h.
 * Retorna null si formato inválido. */
function calcularDiferenciaHoras(horaInicio: string, horaFin: string): number | null {
  if (!horaInicio || !horaFin || !/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(horaInicio) || !/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(horaFin)) {
    return null;
  }
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  const minutosInicio = hI * 60 + mI;
  let minutosFin = hF * 60 + mF;
  if (minutosFin < minutosInicio) {
    minutosFin += 24 * 60; // cruce medianoche
  }
  return Math.round((minutosFin - minutosInicio) / 60 * 100) / 100;
}

// Componente separado para el formulario móvil (solo prorrateo - se muestra cuando effectiveTipo === "kilos")
const MobileFormSection = React.memo(({
  tipoValor,
  setTipoValor,
  tipoLocked,
  valorInput,
  setValorInput,
  prorratear,
  setProrratear,
  observacion,
  setObservacion,
  handleAplicarValor,
  showFormMobile,
  setShowFormMobile
}: {
  tipoValor: "horas" | "kilos";
  setTipoValor: (value: "horas" | "kilos") => void;
  tipoLocked: boolean;
  valorInput: number;
  setValorInput: (value: number) => void;
  prorratear: boolean;
  setProrratear: (value: boolean) => void;
  observacion: string;
  setObservacion: (value: string) => void;
  handleAplicarValor: () => void;
  showFormMobile: boolean;
  setShowFormMobile: (value: boolean) => void;
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <button
        onClick={() => setShowFormMobile(!showFormMobile)}
        className="w-full flex items-center justify-between text-sm font-medium text-indigo-600 dark:text-indigo-400 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Configurar Valores</span>
        </div>
        {showFormMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showFormMobile && (
        <div className="mt-3 space-y-3">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Tipo</label>
                <select
                  value={tipoValor}
                  onChange={(e) => setTipoValor(e.target.value as "horas" | "kilos")}
                  disabled={tipoLocked}
                  className="border rounded w-full p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="horas">Horas</option>
                  <option value="kilos">Kilos</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Valor</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorInput}
                  onChange={(e) => setValorInput(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="border rounded w-full p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-6">
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={prorratear}
                    onChange={(e) => setProrratear(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className="font-semibold">Prorratear</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Observación General</label>
              <textarea
                rows={2}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="border rounded w-full p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                placeholder="Ingrese observación..."
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
          <button
            onClick={handleAplicarValor}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 font-medium"
          >
            <Copy className="h-4 w-4" /> Aplicar Valor
          </button>
        </div>
      )}
    </div>
  );
});

const FinalizarTareoPage: React.FC = () => {
  const { auth } = useAuth();
  const [pendientes, setPendientes] = useState<PendienteAutorizacion[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tipoValor, setTipoValor] = useState<"horas" | "kilos">("horas");
  const [valorInput, setValorInput] = useState<number>(0);
  const [prorratear, setProrratear] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detalleEditable, setDetalleEditable] = useState<DetalleEditable[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showFormMobile, setShowFormMobile] = useState(false);

  // Funciones originales - SIN CAMBIOS
  const formatearHora = (value: string): string => {
    let val = value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length > 2) {
      val = val.slice(0, 2) + ":" + val.slice(2);
    }
    return val;
  };

  const validarHora = (hora: string): boolean => {
    return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(hora);
  };

  const extraerHora = (datetimeStr?: string): string => {
    if (!datetimeStr) return "";
    if (datetimeStr.includes("T")) {
      return datetimeStr.split("T")[1].slice(0, 5);
    }
    if (datetimeStr.includes(":")) {
      return datetimeStr.slice(0, 5);
    }
    return "";
  };

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
    return sortData(Array.from(map.values()));
  }, [pendientes]);

  const filteredCabeceras = React.useMemo(() => {
    if (!searchTerm.trim()) return cabeceras;
    const term = searchTerm.toLowerCase().trim();
    return cabeceras.filter(item => 
      formatDateYYYYMMDD(item.fecha_destajo).toLowerCase().includes(term) ||
      (item.cod_producto || "").toLowerCase().includes(term) ||
      (item.producto || "").toLowerCase().includes(term) ||
      (item.cod_proceso || "").toLowerCase().includes(term) ||
      (item.proceso || "").toLowerCase().includes(term) ||
      (item.cod_subproceso || "").toLowerCase().includes(term) ||
      (item.subproceso || "").toLowerCase().includes(term) ||
      (item.cliente || "").toLowerCase().includes(term) ||
      (item.lote || "").toLowerCase().includes(term)
    );
  }, [cabeceras, searchTerm]);

  const totalPages = Math.ceil(filteredCabeceras.length / itemsPerPage);
  const paginatedCabeceras = filteredCabeceras.slice(
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

  const cosCosteo = React.useMemo(() => detalle[0]?.cos_costeo ?? undefined, [detalle]);
  const tipoLocked = cosCosteo === "02" || cosCosteo === "03";
  const effectiveTipo: "horas" | "kilos" =
    cosCosteo === "02" ? "kilos" : cosCosteo === "03" ? "horas" : tipoValor;

  const toggleCardExpansion = useCallback((key: string) => {
    setExpandedCards(prev => {
      const updated = new Set(prev);
      updated.has(key) ? updated.delete(key) : updated.add(key);
      return updated;
    });
  }, []);

  /** Recalcula el campo horas de una fila según hora_inicio y hora_fin. Validación: máx 24h. */
  const recalcularHorasFila = useCallback((idx: number) => {
    setDetalleEditable((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      const diff = calcularDiferenciaHoras(row.hora_inicio, row.hora_fin);
      if (diff === null) return prev;
      if (diff > 24) {
        toast.error("La diferencia entre hora inicio y fin no puede superar 24 horas.");
        return prev;
      }
      return prev.map((r, i) => i === idx ? { ...r, horas: Number(diff.toFixed(2)) } : r);
    });
  }, []);

  useEffect(() => {
    // No hacer llamadas si es superadmin o no tiene codigo_trabajador_externo
    const isSuperAdmin = auth.user?.nombre_usuario?.toLowerCase() === 'superadmin';
    const hasCodigoTrabajador = auth.user?.codigo_trabajador_externo?.trim();
    
    if (isSuperAdmin || !hasCodigoTrabajador) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getPendientesAutorizacion(hasCodigoTrabajador);
        setPendientes(data);
      } catch {
        toast.error("Error al cargar pendientes.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auth.user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (filteredCabeceras.length > 0 && !selectedRow) {
      const firstItem = filteredCabeceras[0];
      setSelectedRow({
        lote: firstItem.lote,
        fecha_destajo: firstItem.fecha_destajo,
        cod_proceso: firstItem.cod_proceso,
        cod_subproceso: firstItem.cod_subproceso,
        producto: firstItem.producto,
        proceso: firstItem.proceso,
        subproceso: firstItem.subproceso,
        cliente: firstItem.cliente,
      });
    }
  }, [filteredCabeceras, selectedRow]);

  useEffect(() => {
    if (detalle.length > 0) {
      const first = detalle[0];
      setObservacion(first.observacion || "");
      setDetalleEditable(
        detalle.map((d) => ({
          cod_trabajador: d.cod_trabajador,
          trabajador: d.trabajador,
          hora_inicio: extraerHora(d.hora_inicio),
          hora_fin: extraerHora(d.hora_fin),
          horas: d.horas,
          kilos: d.kilos,
          detalle_observacion: d.detalle_observacion || "",
        }))
      );
      if (first.cos_costeo === "02") setTipoValor("kilos");
      else if (first.cos_costeo === "03") setTipoValor("horas");
    } else {
      setObservacion("");
      setDetalleEditable([]);
    }
    setValorInput(0);
    setProrratear(false);
  }, [detalle]);

  // FUNCIONES ORIGINALES - SIN MODIFICAR
  const handleAplicarValor = useCallback(() => {
    if (valorInput <= 0) {
      toast.error("Ingrese un valor válido.");
      return;
    }
    const nuevoDetalle = [...detalleEditable];
    if (prorratear) {
      const val = valorInput / nuevoDetalle.length;
      nuevoDetalle.forEach((item) => {
        if (tipoValor === "horas") {
          item.horas = Number(val.toFixed(2));
          item.kilos = 0;
        } else {
          item.kilos = Number(val.toFixed(2));
          item.horas = 0;
        }
      });
    } else {
      nuevoDetalle.forEach((item) => {
        if (tipoValor === "horas") {
          item.horas = valorInput;
          item.kilos = 0;
        } else {
          item.kilos = valorInput;
          item.horas = 0;
        }
      });
    }
    setDetalleEditable(nuevoDetalle);
    toast.success(`Valor aplicado ${prorratear ? "prorrateado" : ""}`);
    setShowFormMobile(false);
  }, [valorInput, detalleEditable, prorratear, tipoValor]);

  const handleGuardar = async () => {
    if (!selectedRow || detalleEditable.length === 0) return;
    for (const item of detalleEditable) {
      if (item.hora_inicio && !validarHora(item.hora_inicio)) {
        toast.error(`Hora de inicio inválida para ${item.trabajador}. Use formato HH:mm (00:00 - 23:59)`);
        return;
      }
      if (item.hora_fin && !validarHora(item.hora_fin)) {
        toast.error(`Hora de fin inválida para ${item.trabajador}. Use formato HH:mm (00:00 - 23:59)`);
        return;
      }
      if (effectiveTipo === "horas" && item.hora_inicio && item.hora_fin) {
        const diff = calcularDiferenciaHoras(item.hora_inicio, item.hora_fin);
        if (diff !== null && diff > 24) {
          toast.error(`La diferencia de horas para ${item.trabajador} no puede superar 24 horas.`);
          return;
        }
      }
      if (item.horas > 0 && item.kilos > 0) {
        toast.error(`El trabajador ${item.trabajador} tiene valores en Horas y Kilos a la vez.`);
        return;
      }
      if (item.horas === 0 && item.kilos === 0) {
        toast.error(`El trabajador ${item.trabajador} debe tener al menos un valor en Horas o Kilos.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      for (const item of detalleEditable) {
        const req: FinalizarTareoRequest = {
          fecha_destajo: selectedRow.fecha_destajo,
          lote: selectedRow.lote,
          cod_proceso: selectedRow.cod_proceso!,
          cod_subproceso: selectedRow.cod_subproceso,
          cod_trabajador: item.cod_trabajador,
          hora_inicio: item.hora_inicio || undefined,
          hora_fin: item.hora_fin || undefined,
          horas: item.horas,
          kilos: item.kilos,
          observacion: observacion || undefined,
          detalle_observacion: item.detalle_observacion || undefined,
        };
        await finalizarTareo(req);
      }
      // Solo recargar si tiene codigo_trabajador_externo válido
      const codigoTrabajador = auth.user?.codigo_trabajador_externo?.trim();
      if (codigoTrabajador) {
        const data = await getPendientesAutorizacion(codigoTrabajador);
        setPendientes(data);
      }
      toast.success("Tareo finalizado correctamente.");
      setSelectedRow(null);
      setCurrentPage(1);
    } catch {
      toast.error("Error al guardar tareo.");
    } finally {
      setIsSaving(false);
    }
  };

  const isRowSelected = (item: PendienteAutorizacion) => 
    selectedRow?.lote === item.lote &&
    selectedRow?.fecha_destajo === item.fecha_destajo &&
    selectedRow?.cod_proceso === item.cod_proceso &&
    (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "");

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en cualquier columna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleGuardar}
          disabled={isSaving}
          className="hidden md:flex px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 items-center gap-2 disabled:opacity-50 text-sm"
        >
          {isSaving && <Loader className="animate-spin h-4 w-4" />}
          <Save className="h-4 w-4" /> {isSaving ? "Guardando..." : "Registrar Destajo"}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-6">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <p className="ml-3 text-gray-500 dark:text-gray-400 text-sm">Cargando pendientes...</p>
        </div>
      )}

      {/* VISTA DESKTOP - MANTENIENDO CÓDIGO ORIGINAL */}
      <div className="hidden md:block">
        {/* ... (código desktop exactamente igual al original) ... */}
        {!loading && (
          <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
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
                    const selected = isRowSelected(item);
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRow(item)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                          selected ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500" : ""
                        }`}
                      >
                        <td className={`px-2 py-1 text-table-cell ${
                          selected ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500" : ""
                        }`}>
                          {formatDateYYYYMMDD(item.fecha_destajo)}
                        </td>
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
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                      {searchTerm ? "No se encontraron registros que coincidan con la búsqueda." : "No hay registros disponibles"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredCabeceras.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-300">registros</span>
              {searchTerm && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  (mostrando {filteredCabeceras.length} de {cabeceras.length} registros filtrados)
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 border border-gray-300 dark:border-gray-600"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 border border-gray-300 dark:border-gray-600"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {selectedRow && (
          <div className={`grid grid-cols-1 gap-4 ${effectiveTipo === "kilos" ? "md:grid-cols-10" : "md:grid-cols-1"}`}>
            {effectiveTipo === "kilos" && (
            <div className="col-span-3 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Tipo</label>
                    <select
                      value={tipoValor}
                      onChange={(e) => setTipoValor(e.target.value as any)}
                      disabled={tipoLocked}
                      className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="horas">Horas</option>
                      <option value="kilos">Kilos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Valor</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorInput}
                      onChange={(e) => setValorInput(Number(e.target.value))}
                      onMouseDown={(e) => {
                        const target = e.currentTarget;
                        setTimeout(() => target.select(), 0);
                      }}
                      className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="pt-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={prorratear}
                        onChange={(e) => setProrratear(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-indigo-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                      />
                      <span className="font-semibold">Prorratear</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Observación General</label>
                  <textarea
                    rows={2}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    onMouseDown={(e) => {
                      const target = e.currentTarget;
                      setTimeout(() => target.select(), 0);
                    }}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ingrese observación..."
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAplicarValor}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                >
                  <Copy className="h-4 w-4" /> Aplicar
                </button>
              </div>
            </div>
            )}

            <div className={effectiveTipo === "kilos" ? "col-span-7" : "col-span-1"}>
              {effectiveTipo === "horas" && (
                <div className="mb-3">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Observación General</label>
                  <textarea
                    rows={2}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 mt-1"
                    placeholder="Ingrese observación..."
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              )}
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
                <h3 className="font-semibold text-sm">
                  Detalle seleccionado → Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | 
                  Lote: {selectedRow.lote} | 
                  Proceso: {selectedRow.proceso}
                  {selectedRow.subproceso && ` | Subproceso: ${selectedRow.subproceso}`}
                  {selectedRow.cliente && ` | Cliente: ${selectedRow.cliente}`}
                </h3>
              </div>

              <div className="shadow-md rounded-b-lg border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left text-table-header">Cod Trabajador</th>
                      <th className="px-2 py-1 text-left text-table-header">Trabajador</th>
                      {effectiveTipo === "horas" && (
                        <>
                          <th className="px-2 py-1 text-left text-table-header">Hora Inicio</th>
                          <th className="px-2 py-1 text-left text-table-header">Hora Fin</th>
                        </>
                      )}
                      {effectiveTipo === "horas" && <th className="px-2 py-1 text-left text-table-header">Horas</th>}
                      {effectiveTipo === "kilos" && <th className="px-2 py-1 text-left text-table-header">Kilos</th>}
                      <th className="px-2 py-1 text-left text-table-header">Obs. Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {detalleEditable.map((d, i) => {
                      const diffHoras = effectiveTipo === "horas" ? calcularDiferenciaHoras(d.hora_inicio, d.hora_fin) : null;
                      const excede24 = diffHoras !== null && diffHoras > 24;
                      const horasCorrectas = diffHoras !== null && diffHoras <= 24 && Math.abs((d.horas || 0) - diffHoras) < 0.01;
                      return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                        <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                        {effectiveTipo === "horas" && (
                          <>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={d.hora_inicio}
                                onChange={(e) => {
                                  const formatted = formatearHora(e.target.value);
                                  setDetalleEditable((prev) =>
                                    prev.map((row, idx) =>
                                      idx === i ? { ...row, hora_inicio: formatted } : row
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  if (d.hora_inicio && !validarHora(d.hora_inicio)) {
                                    toast.error("Hora de inicio inválida. Use formato HH:mm");
                                  } else {
                                    recalcularHorasFila(i);
                                  }
                                }}
                                onMouseDown={(e) => { setTimeout(() => e.currentTarget.select(), 0); }}
                                placeholder="HH:mm"
                                maxLength={5}
                                className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={d.hora_fin}
                                onChange={(e) => {
                                  const formatted = formatearHora(e.target.value);
                                  setDetalleEditable((prev) =>
                                    prev.map((row, idx) =>
                                      idx === i ? { ...row, hora_fin: formatted } : row
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  if (d.hora_fin && !validarHora(d.hora_fin)) {
                                    toast.error("Hora de fin inválida. Use formato HH:mm");
                                  } else {
                                    recalcularHorasFila(i);
                                  }
                                }}
                                onMouseDown={(e) => { setTimeout(() => e.currentTarget.select(), 0); }}
                                placeholder="HH:mm"
                                maxLength={5}
                                className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={d.horas}
                                onChange={(e) =>
                                  setDetalleEditable((prev) =>
                                    prev.map((row, idx) =>
                                      idx === i ? { ...row, horas: Number(e.target.value) } : row
                                    )
                                  )
                                }
                                onMouseDown={(e) => {
                                  const target = e.currentTarget;
                                  setTimeout(() => target.select(), 0);
                                }}
                                className={`border rounded px-2 py-1 w-full text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 ${
                                  diffHoras !== null
                                    ? excede24 || !horasCorrectas
                                      ? "bg-red-100 dark:bg-red-900/40 border-red-500"
                                      : "bg-green-100 dark:bg-green-900/40 border-green-500"
                                    : "bg-white dark:bg-gray-700"
                                }`}
                              />
                            </td>
                          </>
                        )}
                        {effectiveTipo === "kilos" && (
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              value={d.kilos}
                              onChange={(e) =>
                                setDetalleEditable((prev) =>
                                  prev.map((row, idx) =>
                                    idx === i ? { ...row, kilos: Number(e.target.value) } : row
                                  )
                                )
                              }
                              onMouseDown={(e) => { setTimeout(() => e.currentTarget.select(), 0); }}
                              className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                        )}
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={d.detalle_observacion}
                            onChange={(e) =>
                              setDetalleEditable((prev) =>
                                prev.map((row, idx) =>
                                  idx === i ? { ...row, detalle_observacion: e.target.value } : row
                                )
                              )
                            }
                            onMouseDown={(e) => {
                              const target = e.currentTarget;
                              setTimeout(() => target.select(), 0);
                            }}
                            className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Observación..."
                            style={{ textTransform: 'uppercase' }}
                          />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VISTA MOBILE - CON MEJORAS UX/UI */}
      <div className="block md:hidden">
        {!loading && paginatedCabeceras.length > 0 ? (
          <div className="space-y-3">
            {paginatedCabeceras.map((item, idx) => {
              const key = `${item.lote}_${item.fecha_destajo}_${item.cod_proceso}_${item.cod_subproceso || ""}`;
              const isExpanded = expandedCards.has(key);
              const isSelected = isRowSelected(item);
              
              return (
                <div
                  key={idx}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 overflow-hidden transition-all ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div 
                    onClick={() => setSelectedRow(item)}
                    className={`p-4 border-b cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white"
                        : "bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className={`text-xs font-semibold block mb-1 ${isSelected ? "text-indigo-100" : "text-indigo-700 dark:text-indigo-300"}`}>
                          {formatDateYYYYMMDD(item.fecha_destajo)}
                        </span>
                        <h3 className={`text-sm font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
                          {item.cod_producto} {item.producto}
                        </h3>
                      </div>
                      {isSelected && <Package className="ml-2 h-5 w-5 text-white" />}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Proceso:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.cod_proceso} {item.proceso}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Lote:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{item.lote}</p>
                      </div>
                      {item.subproceso && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Subproceso:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{item.cod_subproceso} {item.subproceso}</p>
                        </div>
                      )}
                      {item.cliente && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Cliente:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{item.cliente}</p>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <>
                        {effectiveTipo === "horas" && (
                          <div className="mb-3">
                            <label className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Observación General</label>
                            <textarea
                              rows={2}
                              value={observacion}
                              onChange={(e) => setObservacion(e.target.value)}
                              className="border rounded w-full p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white mt-1"
                              placeholder="Ingrese observación..."
                              style={{ textTransform: 'uppercase' }}
                            />
                          </div>
                        )}
                        {effectiveTipo === "kilos" && (
                        <MobileFormSection
                          tipoValor={tipoValor}
                          setTipoValor={setTipoValor}
                          tipoLocked={tipoLocked}
                          valorInput={valorInput}
                          setValorInput={setValorInput}
                          prorratear={prorratear}
                          setProrratear={setProrratear}
                          observacion={observacion}
                          setObservacion={setObservacion}
                          handleAplicarValor={handleAplicarValor}
                          showFormMobile={showFormMobile}
                          setShowFormMobile={setShowFormMobile}
                        />
                        )}

                        {detalleEditable.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleCardExpansion(key)}
                              className="flex items-center justify-between w-full text-sm font-medium text-indigo-600 dark:text-indigo-400 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md"
                            >
                              <span>Ver/Editar Detalle ({detalleEditable.length} trabajadores)</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                                {detalleEditable.map((d, i) => {
                                  const diffHoras = effectiveTipo === "horas" ? calcularDiferenciaHoras(d.hora_inicio, d.hora_fin) : null;
                                  const excede24 = diffHoras !== null && diffHoras > 24;
                                  const horasCorrectas = diffHoras !== null && diffHoras <= 24 && Math.abs((d.horas || 0) - diffHoras) < 0.01;
                                  return (
                                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 text-sm border border-gray-200 dark:border-gray-600 space-y-2">
                                    <div className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">
                                      {d.cod_trabajador} - {d.trabajador}
                                    </div>
                                    {effectiveTipo === "horas" && (
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-500 dark:text-gray-400">Hora Inicio</label>
                                          <input
                                            type="text"
                                            value={d.hora_inicio}
                                            onChange={(e) => {
                                              const formatted = formatearHora(e.target.value);
                                              setDetalleEditable((prev) =>
                                                prev.map((row, idx) =>
                                                  idx === i ? { ...row, hora_inicio: formatted } : row
                                                )
                                              );
                                            }}
                                            onBlur={() => {
                                              if (d.hora_inicio && !validarHora(d.hora_inicio)) {
                                                toast.error("Hora de inicio inválida. Use formato HH:mm");
                                              } else {
                                                recalcularHorasFila(i);
                                              }
                                            }}
                                            placeholder="HH:mm"
                                            maxLength={5}
                                            onFocus={(e) => e.target.select()}
                                            className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 dark:text-gray-400">Hora Fin</label>
                                          <input
                                            type="text"
                                            value={d.hora_fin}
                                            onChange={(e) => {
                                              const formatted = formatearHora(e.target.value);
                                              setDetalleEditable((prev) =>
                                                prev.map((row, idx) =>
                                                  idx === i ? { ...row, hora_fin: formatted } : row
                                                )
                                              );
                                            }}
                                            onBlur={() => {
                                              if (d.hora_fin && !validarHora(d.hora_fin)) {
                                                toast.error("Hora de fin inválida. Use formato HH:mm");
                                              } else {
                                                recalcularHorasFila(i);
                                              }
                                            }}
                                            placeholder="HH:mm"
                                            maxLength={5}
                                            onFocus={(e) => e.target.select()}
                                            className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 dark:text-gray-400">Horas</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={d.horas}
                                            onChange={(e) =>
                                              setDetalleEditable((prev) =>
                                                prev.map((row, idx) =>
                                                  idx === i ? { ...row, horas: Number(e.target.value) } : row
                                                )
                                              )
                                            }
                                            onFocus={(e) => e.target.select()}
                                            className={`border rounded px-2 py-1 w-full text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 ${
                                              diffHoras !== null
                                                ? excede24 || !horasCorrectas
                                                  ? "bg-red-100 dark:bg-red-900/40 border-red-500"
                                                  : "bg-green-100 dark:bg-green-900/40 border-green-500"
                                                : "bg-white dark:bg-gray-700"
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {effectiveTipo === "kilos" && (
                                      <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400">Kilos</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={d.kilos}
                                          onChange={(e) =>
                                            setDetalleEditable((prev) =>
                                              prev.map((row, idx) =>
                                                idx === i ? { ...row, kilos: Number(e.target.value) } : row
                                              )
                                            )
                                          }
                                          onFocus={(e) => e.target.select()}
                                          className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <label className="text-xs text-gray-500 dark:text-gray-400">Observación:</label>
                                      <input
                                        type="text"
                                        value={d.detalle_observacion}
                                        onChange={(e) =>
                                          setDetalleEditable((prev) =>
                                            prev.map((row, idx) =>
                                              idx === i ? { ...row, detalle_observacion: e.target.value } : row
                                            )
                                          )
                                        }
                                        onFocus={(e) => e.target.select()}
                                        className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Observación..."
                                        style={{ textTransform: 'uppercase' }}
                                      />
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={handleGuardar}
                          disabled={isSaving}
                          className="w-full mt-3 px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 font-medium shadow-md"
                        >
                          {isSaving && <Loader className="animate-spin h-5 w-5" />}
                          <Save className="h-5 w-5" />
                          {isSaving ? "Guardando..." : "Registrar Destajo"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? "No se encontraron registros que coincidan con la búsqueda." : "No hay registros disponibles"}
          </div>
        ) : null}

        {filteredCabeceras.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>registros</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 border border-gray-300 dark:border-gray-600"
              >
                Anterior
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 border border-gray-300 dark:border-gray-600"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalizarTareoPage;