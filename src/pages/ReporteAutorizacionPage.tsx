import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getReporteAutorizacion } from "../services/autorizacion.service";
import { PendienteAutorizacion } from "../types/autorizacion.types";
import { Loader, FileText, Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from '../context/AuthContext';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Las funciones de formato de fecha y hora se mantienen intactas.

function formatDateYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Meses son 0-11
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Función para formatear fecha y hora a yyyy-MM-dd HH:mm
function formatDateTimeYYYYMMDDHHMM(dateTimeStr?: string) {
  if (!dateTimeStr) return "-";
  
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return "-";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Función para formatear hora a HH:MM
function formatTimeHHMM(timeStr?: string) {
  if (!timeStr) return "-";
  
  // Si ya viene en formato HH:MM, devolverlo tal como está
  if (timeStr.match(/^\d{2}:\d{2}$/)) {
    return timeStr;
  }
  
  // Si viene como fecha completa, extraer solo la hora
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // Si viene en otro formato, intentar parsearlo
  return timeStr.substring(0, 5) || "-";
}

const sortData = (data: PendienteAutorizacion[]): PendienteAutorizacion[] => {
  return [...data].sort((a, b) => {
    // Ordenar por fecha_destajo
    const dateA = new Date(a.fecha_destajo).getTime();
    const dateB = new Date(b.fecha_destajo).getTime();
    if (dateA !== dateB) return dateB - dateA;

    // Ordenar por producto
    const prodA = `${a.cod_producto} ${a.producto}`.toLowerCase();
    const prodB = `${b.cod_producto} ${b.producto}`.toLowerCase();
    if (prodA !== prodB) return prodB.localeCompare(prodA);

    // Ordenar por proceso
    const procA = `${a.cod_proceso} ${a.proceso}`.toLowerCase();
    const procB = `${b.cod_proceso} ${b.proceso}`.toLowerCase();
    if (procA !== procB) return procB.localeCompare(procA);

    // Ordenar por subproceso
    const subA = `${a.cod_subproceso || ''} ${a.subproceso || ''}`.toLowerCase();
    const subB = `${b.cod_subproceso || ''} ${b.subproceso || ''}`.toLowerCase();
    return subB.localeCompare(subA);
  });
};

// Función utilitaria para procesar datos en chunks asíncronos
const processDataInChunks = async <T, R>(
  data: T[],
  processor: (chunk: T[]) => R[],
  chunkSize = 1000
): Promise<R[]> => {
  const result: R[] = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const processed = processor(chunk);
    result.push(...processed);
    
    // Permitir que el navegador respire
    if (i + chunkSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return result;
};

const ReporteAutorizacionPage: React.FC = () => {
  const { auth } = useAuth();
  const today = new Date();
  // Obtener fecha local en formato YYYY-MM-DD (evita el desfase por toISOString/UTC)
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
 
  const [rawData, setRawData] = useState<PendienteAutorizacion[]>([]);
  const [processedData, setProcessedData] = useState<{
    cabeceras: PendienteAutorizacion[];
    kpis: { total: number; pendientes: number; rechazados: number; aprobados: number };
  }>({ cabeceras: [], kpis: { total: 0, pendientes: 0, rechazados: 0, aprobados: 0 } });
  
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Ambos siempre inicializados con la fecha actual
  const [fechaInicio, setFechaInicio] = useState<string>(todayStr);
  const [fechaFin, setFechaFin] = useState<string>(todayStr);
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  // Estados para vista móvil
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Referencias para cancelar procesamiento
  const processingRef = useRef<boolean>(false);

  // Procesar datos raw de forma asíncrona
  const processRawData = useCallback(async (data: PendienteAutorizacion[]) => {
    if (processingRef.current || data.length === 0) return;
    
    processingRef.current = true;
    setProcessing(true);

    try {
      // Procesar cabeceras en chunks para no bloquear UI
      const cabeceras = await processDataInChunks(
        data,
        (chunk) => {
          const map = new Map<string, PendienteAutorizacion>();
          chunk.forEach(item => {
            const key = `${item.fecha_destajo}_${item.cod_producto}_${
              item.cod_subproceso || ""
            }_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`;
            if (!map.has(key)) map.set(key, item);
          });
          return sortData(Array.from(map.values()));
        }
      );

      // Eliminar duplicados finales
      const uniqueCabeceras = Array.from(
        new Map(cabeceras.map(item => [
          `${item.fecha_destajo}_${item.cod_producto}_${item.cod_subproceso || ""}_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`,
          item
        ])).values()
      );

      // Calcular KPIs de forma eficiente
      const kpis = {
        total: uniqueCabeceras.length,
        pendientes: uniqueCabeceras.filter(d => d.estado_autorizado === "P").length,
        rechazados: uniqueCabeceras.filter(d => d.estado_autorizado === "R").length,
        aprobados: uniqueCabeceras.filter(d => d.estado_autorizado === "A").length,
      };

      setProcessedData({ cabeceras: uniqueCabeceras, kpis });
      
      // Auto-seleccionar primer registro
      if (uniqueCabeceras.length > 0) {
        setSelectedRow(uniqueCabeceras[0]);
      }

    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Error procesando los datos");
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, []);

  // Filtrar datos procesados (más eficiente)
  const filteredCabeceras = useMemo(() => {
    let filtered = processedData.cabeceras;
    
    // Filtro por estado (más rápido primero)
    if (estadoFiltro) {
      filtered = filtered.filter(d => d.estado_autorizado === estadoFiltro);
    }
    
    // Filtro por búsqueda solo si hay término
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        // Búsqueda optimizada con early return
        return formatDateYYYYMMDD(item.fecha_destajo).includes(term) ||
               (item.cod_producto && item.cod_producto.toLowerCase().includes(term)) ||
               (item.producto && item.producto.toLowerCase().includes(term)) ||
               (item.cod_proceso && item.cod_proceso.toLowerCase().includes(term)) ||
               (item.proceso && item.proceso.toLowerCase().includes(term)) ||
               (item.cod_subproceso && item.cod_subproceso.toLowerCase().includes(term)) ||
               (item.subproceso && item.subproceso.toLowerCase().includes(term)) ||
               (item.cliente && item.cliente.toLowerCase().includes(term)) ||
               (item.lote && item.lote.toLowerCase().includes(term)) ||
               (item.estado_autorizado && item.estado_autorizado.toLowerCase().includes(term));
      });
    }
    
    return filtered;
  }, [processedData.cabeceras, estadoFiltro, searchTerm]);

  // Paginación memoizada
  const paginatedCabeceras = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCabeceras.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCabeceras, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCabeceras.length / itemsPerPage);

  // Detalle optimizado - solo buscar cuando es necesario
  const detalle = useMemo(() => {
    if (!selectedRow) return [];
    
    return rawData.filter(p => 
      p.lote === selectedRow.lote &&
      p.fecha_destajo === selectedRow.fecha_destajo &&
      p.cod_proceso === selectedRow.cod_proceso &&
      (p.cod_subproceso || "") === (selectedRow.cod_subproceso || "")
    );
  }, [rawData, selectedRow?.lote, selectedRow?.fecha_destajo, selectedRow?.cod_proceso, selectedRow?.cod_subproceso]);

  // Cargar datos con indicador de progreso
  const fetchData = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error("Seleccione rango de fechas válido");
      return;
    }

    setLoading(true);
    setProcessedData({ cabeceras: [], kpis: { total: 0, pendientes: 0, rechazados: 0, aprobados: 0 } });
    setSelectedRow(null);
    
    try {
      const result = await getReporteAutorizacion(
        fechaInicio ,
        fechaFin,
        auth.user?.codigo_trabajador_externo
      );

      const dataArray = result || [];
      setRawData(dataArray);
      
      // Procesar datos de forma asíncrona
      if (dataArray.length > 0) {
        processRawData(dataArray);
        toast.success(`${dataArray.length} registros cargados - Procesando...`);
      } else {
        toast.success("Consulta completada - No se encontraron registros");
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error cargando datos");
      setRawData([]);
    } finally {
      setLoading(false);
      setCurrentPage(1);
    }
  }, [fechaInicio, fechaFin, processRawData]);

  // Resetear página cuando cambien filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [estadoFiltro, searchTerm]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Funciones de filtro optimizadas con useCallback
 const handleEstadoFilter = useCallback((estado: string | null) => {
  setEstadoFiltro(estado);

  // Después de aplicar el filtro, seleccionar automáticamente el primer registro visible
  setTimeout(() => {
    const filtered = processedData.cabeceras.filter((d) =>
      estado ? d.estado_autorizado === estado : true
    );
    if (filtered.length > 0) {
      setSelectedRow(filtered[0]);
    } else {
      setSelectedRow(null);
    }
  }, 0);
}, [processedData.cabeceras]);

  const handleRowClick = useCallback((item: PendienteAutorizacion) => {
    setSelectedRow(item);
  }, []);

  // Función para obtener el detalle de un item específico (para móvil)
  const getDetalleForItem = (item: PendienteAutorizacion) => {
    return rawData.filter(
      (p) =>
        p.lote === item.lote &&
        p.fecha_destajo === item.fecha_destajo &&
        p.cod_proceso === item.cod_proceso &&
        (p.cod_subproceso || "") === (item.cod_subproceso || "")
    );
  };

  // Función para toggle de expansión de cards en móvil
  const toggleCardExpansion = (key: string) => {
    setExpandedCards(prev => {
      const updated = new Set(prev);
      updated.has(key) ? updated.delete(key) : updated.add(key);
      return updated;
    });
  };

  // Función para verificar si una fila está seleccionada
  const isRowSelected = (item: PendienteAutorizacion) => 
    selectedRow?.lote === item.lote &&
    selectedRow?.fecha_destajo === item.fecha_destajo &&
    selectedRow?.cod_proceso === item.cod_proceso &&
    (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "");

// --- FUNCIONALIDAD MODIFICADA ---

const generarResumenPDF = useCallback(() => {
    if (filteredCabeceras.length === 0) {
        toast.error("No hay registros filtrados para generar el resumen.");
        return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Orientación horizontal (L) para más columnas
    const fechaReporte = formatDateYYYYMMDD(new Date().toISOString());

    // 1. Cabecera y Pie de Página del Resumen - MODIFICADA
    const addHeaderFooterResumen = (data: any) => {
        doc.addImage("/psf_ok.png", "PNG", 10, 5, 30, 12);
        doc.setFontSize(16);
        doc.text("Resumen de Reporte de Destajo", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

        // Texto centrado debajo del título principal
        doc.setFontSize(10);
        doc.text(`Rango de Fecha: ${fechaInicio} a ${fechaFin}`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });

        doc.text(`${fechaReporte}`, doc.internal.pageSize.getWidth() - 15, 10, { align: "right" });

        const pageCount = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(9);
        doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.getWidth() - 15,
            doc.internal.pageSize.getHeight() - 10,
            { align: "right" }
        );
    };

    // Header modificado - eliminadas las columnas Estado y Fec. Autoriz., y reordenadas
    const header = [
        ["Fecha Destajo", "Producto", "Proceso", "Subproceso", "Lote", "Cliente"],
    ];
    
    // Mapear los datos filtrados con el nuevo orden de columnas
    const bodyData = filteredCabeceras.map((row) => [
        formatDateYYYYMMDD(row.fecha_destajo),
        `${row.cod_producto} ${row.producto}`,
        `${row.cod_proceso} ${row.proceso}`,
        row.subproceso ? `${row.cod_subproceso} ${row.subproceso}` : "-",
        row.lote,
        row.cliente,
    ]);
    
    autoTable(doc, {
        startY: 30,
        theme: "grid",
        head: header,
        body: bodyData,
        margin: { top: 35, left: 10, right: 10 },
        styles: { overflow: 'linebreak', cellPadding: 1, fontSize: 8 },
        headStyles: {
            fillColor: [68, 114, 196], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            minCellHeight: 8,
        },
        columnStyles: {
            // Ajustar el ancho de las columnas para A4 Horizontal con nuevo orden
            0: { cellWidth: 25 }, // Fecha Destajo
            1: { cellWidth: 50 }, // Producto
            2: { cellWidth: 40 }, // Proceso
            3: { cellWidth: 40 }, // Subproceso
            4: { cellWidth: 25 }, // Lote
            5: { cellWidth: 45 }, // Cliente
        },
        didDrawPage: addHeaderFooterResumen,
    });

    // Construir el nombre del archivo
    const estadoArchivo = estadoFiltro || "Todos";
    doc.save(`resumen_destajo_${estadoArchivo}_${fechaInicio}_a_${fechaFin}.pdf`);
    toast.success("Resumen PDF generado correctamente.");

}, [filteredCabeceras, estadoFiltro, fechaInicio, fechaFin]);

// --- FIN DE FUNCIONALIDAD MODIFICADA ---


  // Generar PDF optimizado (FUNCIONALIDAD ORIGINAL)
  const generarPDF = useCallback((item?: PendienteAutorizacion) => {
    const targetItem = item || selectedRow;
    
    if (!targetItem) {
      toast.error("Seleccione un registro para generar el PDF");
      return;
    }
    
    const doc = new jsPDF();
    const fechaReporte = formatDateYYYYMMDD(new Date().toISOString());
    const estadoLegible = targetItem.estado_autorizado === "P" ? "PENDIENTE" :
                        targetItem.estado_autorizado === "A" ? "APROBADO" : "RECHAZADO";

    const addHeaderFooter = (data: any) => {
      doc.addImage("/psf_ok.png", "PNG", 10, 5, 30, 12);
      doc.setFontSize(16);
      doc.text("Reporte de Destajo", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      
      doc.setFontSize(12);
      const centerX = doc.internal.pageSize.getWidth() / 2;
      
      // Escribir "Estado: " en negro
      doc.setTextColor(0, 0, 0);
      const estadoTexto = "Estado: ";
      const estadoTextoWidth = doc.getTextWidth(estadoTexto);
      const startX = centerX - (doc.getTextWidth(`Estado: ${estadoLegible}`) / 2);
      
      doc.text(estadoTexto, startX, 22);
      
      // Escribir solo el estado en color
      if (targetItem.estado_autorizado === "A") {
        doc.setTextColor(22, 163, 74); // Verde equivalente a bg-green-600 (#16a34a)
      } else if (targetItem.estado_autorizado === "R") {
        doc.setTextColor(220, 38, 38); // Rojo equivalente a bg-red-600 (#dc2626)
      } else {
        doc.setTextColor(75, 85, 99); // Gris para pendiente (#4b5563)
      }
      
      doc.text(estadoLegible, startX + estadoTextoWidth, 22);
      
      // Restaurar color negro para el resto
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${fechaReporte}`, doc.internal.pageSize.getWidth() - 15, 10, { align: "right" });
      
      const pageCount = (doc.internal as any).getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 15,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      );
    };

    const row = targetItem;
    const headerData = [
      ["Fecha:", formatDateYYYYMMDD(row.fecha_destajo), "Producto:", `${row.cod_producto} ${row.producto}`],
      ["Proceso:", `${row.cod_proceso} ${row.proceso}`, "Subproceso:", row.subproceso ? `${row.cod_subproceso} ${row.subproceso}` : "-"],
      ["Cliente:", `${row.cod_cliente} ${row.cliente}`, "Lote:", row.lote],
      ["Hora Inicio:", formatTimeHHMM(row.hora_inicio), "Hora Fin:", formatTimeHHMM(row.hora_fin)],
      ["Supervisor:", row.lote, "Fecha Autor.:", formatDateTimeYYYYMMDDHHMM(row.fecha_autorizacion)],
      ["Observación:", { content: row.observacion_autorizacion || "-", colSpan: 3, styles: { fontStyle: 'normal' } }],
    ];

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const usablePageWidth = pageWidth - marginX * 2;

    autoTable(doc, {
      startY: 30,
      theme: "grid",
      head: [["", "", "", ""]],
      body: headerData,
      margin: { left: marginX, right: marginX, top: 40 },
      columnStyles: {
        0: { cellWidth: usablePageWidth * 0.15, fontStyle: 'bold' },
        1: { cellWidth: usablePageWidth * 0.35 },
        2: { cellWidth: usablePageWidth * 0.15, fontStyle: 'bold' },
        3: { cellWidth: usablePageWidth * 0.35 },
      },
      styles: { overflow: 'linebreak', cellPadding: 2, fontSize: 10 },
      headStyles: {
        fillColor: [68, 114, 196], // Ejemplo: Azul ([R, G, B])
        textColor: [255, 255, 255], // Color de texto blanco
      },
      didDrawCell: function(data: any) {
        // Aplicar negrita solo a las columnas 0 y 2 (títulos)
        if ((data.column.index === 0 || data.column.index === 2) && data.section === 'body') {
          doc.setFont('helvetica', 'bold'); // Especificar la fuente explícitamente
        } else if (data.section === 'body') {
          doc.setFont('helvetica', 'normal'); // Resetear a normal para otras celdas
        }
      },
      didDrawPage: addHeaderFooter,
    });

    const detalleItem = getDetalleForItem(targetItem);
    if (detalleItem.length > 0) {
      autoTable(doc, {
        theme: "grid",
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Cod Trabajador", "Trabajador", "Horas", "Kilos"]],
        body: detalleItem.map((d) => [
          d.cod_trabajador,
          d.trabajador,
          { content: d.horas, styles: { halign: 'right' } },
          { content: d.kilos, styles: { halign: 'right' } }
        ]),
        margin: { top: 40 },
        headStyles: {
        fillColor: [68, 114, 196], // Ejemplo: Azul ([R, G, B])
        textColor: [255, 255, 255], // Color de texto blanco
        },
        didDrawPage: addHeaderFooter,
      });
    }

    doc.save(`reporte_${row.lote}_${formatDateYYYYMMDD(row.fecha_destajo)}.pdf`);
  }, [selectedRow, getDetalleForItem]);

  return (
    <div className="w-full">
      {/* Encabezado con buscador y filtros (desktop al mismo nivel) */}
      <div className="flex justify-between items-center mb-4 gap-4">
         <div className="flex-1 max-w-md">
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-5 w-5 text-gray-400" />
             </div>
             <input
               type="text"
               placeholder="Buscar en cualquier columna..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
             />
           </div>
         </div>
        {/* Desktop: filtros, consultar y acciones (alineados a la derecha). No afectan móvil */}
        <div className="hidden md:flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading || processing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Consultando..." : "Consultar"}
          </button>
          {/* Botón Generar Detalle PDF (usa selectedRow) */}
          <button
            onClick={() => generarPDF()}
            disabled={!selectedRow}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generar Detalle PDF
          </button>
          {/* Botón Generar Resumen PDF (usa filteredCabeceras) */}
          <button
            onClick={generarResumenPDF}
            disabled={filteredCabeceras.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generar Resumen PDF
          </button>
        </div>
       </div>

      {/* VISTA DESKTOP - MANTENIENDO CÓDIGO ORIGINAL */}
      <div className="hidden md:block">
        {/* filtros movidos al encabezado principal (desktop). */}
        <div className="mb-4" />

        {/* Estado de procesamiento */}
        {processing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <Loader className="animate-spin h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                Procesando {rawData.length} registros en segundo plano...
              </span>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => handleEstadoFilter(null)}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === null ? 'bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500' : 'bg-white dark:bg-gray-800'
            }`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">Total Destajos</p>
            <p className="text-xl font-bold">{processedData.kpis.total}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("P")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "P" ? 'bg-yellow-200 border-l-4 border-yellow-500' : 'bg-yellow-100'
            }`}
          >
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-xl font-bold">{processedData.kpis.pendientes}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("R")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "R" ? 'bg-red-200 border-l-4 border-red-500' : 'bg-red-100'
            }`}
          >
            <p className="text-sm text-gray-600">Rechazados</p>
            <p className="text-xl font-bold">{processedData.kpis.rechazados}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("A")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "A" ? 'bg-green-200 border-l-4 border-green-500' : 'bg-green-100'
            }`}
          >
            <p className="text-sm text-gray-600">Aprobados</p>
            <p className="text-xl font-bold">{processedData.kpis.aprobados}</p>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
            <span className="ml-2">Cargando datos desde el servidor...</span>
          </div>
        ) : (
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
                  <th className="px-2 py-1 text-left text-table-header">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedCabeceras.length > 0 ? (
                  paginatedCabeceras.map((item, idx) => {
                    const isSelected = 
                      selectedRow?.lote === item.lote &&
                      selectedRow?.fecha_destajo === item.fecha_destajo &&
                      selectedRow?.cod_proceso === item.cod_proceso &&
                      (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "");

                    return (
                      <tr
                        key={`${item.lote}-${item.fecha_destajo}-${idx}`}
                        onClick={() => handleRowClick(item)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-100 dark:bg-indigo-900/50"
                            : ""
                        }`}
                      >
                        <td
                          className={`px-2 py-1 text-table-cell ${
                            isSelected
                              ? "border-l-4 border-indigo-500"
                              : ""
                          }`}
                        >
                          {formatDateYYYYMMDD(item.fecha_destajo)}
                        </td>
                        <td className="px-2 py-1 text-table-cell">{item.cod_producto} {item.producto}</td>
                        <td className="px-2 py-1 text-table-cell">{item.cod_proceso} {item.proceso}</td>
                        <td className="px-2 py-1 text-table-cell">{item.cod_subproceso} {item.subproceso}</td>
                        <td className="px-2 py-1 text-table-cell">{item.cliente}</td>
                        <td className="px-2 py-1 text-table-cell">{item.lote}</td>
                        <td className="px-2 py-1 text-table-cell">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.estado_autorizado === 'P' ? 'bg-yellow-100 text-yellow-800' :
                            item.estado_autorizado === 'A' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.estado_autorizado === 'P' ? 'Pendiente' :
                              item.estado_autorizado === 'A' ? 'Aprobado' : 'Rechazado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                      {processing ? "Procesando datos..." : 
                      searchTerm || estadoFiltro ? "No se encontraron registros que coincidan con los filtros." : 
                      "No hay registros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
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
              {(searchTerm || estadoFiltro) && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  (mostrando {filteredCabeceras.length} de {processedData.kpis.total} registros filtrados)
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

        {/* Tabla Detalle */}
        {selectedRow && (
          <div className="mb-4">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-sm">
                Detalle seleccionado → Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | Lote:{" "}
                {selectedRow.lote} | Proceso: {selectedRow.proceso}
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
                      <tr key={`${d.cod_trabajador}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                        <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                        <td className="px-2 py-1 text-table-cell">{d.horas}</td>
                        <td className="px-2 py-1 text-table-cell">{d.kilos}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-500 text-table-detail">
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

      {/* VISTA MÓVIL - NUEVA IMPLEMENTACIÓN */}
      <div className="block md:hidden">
        {/* Filtros para móvil */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <button
              onClick={fetchData}
              disabled={loading || processing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 px-4 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4" />
                  Consultando...
                </>
              ) : (
                "Consultar"
              )}
            </button>
          </div>
        </div>

        {/* Botón Generar Resumen PDF para móvil */}
        <button
          onClick={generarResumenPDF}
          disabled={filteredCabeceras.length === 0}
          className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          <FileText className="h-4 w-4" />
          Generar Resumen PDF
        </button>

        {/* Estado de procesamiento móvil */}
        {processing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <Loader className="animate-spin h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                Procesando {rawData.length} registros en segundo plano...
              </span>
            </div>
          </div>
        )}

        {/* KPIs Móvil */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            onClick={() => handleEstadoFilter(null)}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === null ? 'bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500' : 'bg-white dark:bg-gray-800'
            }`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">Total Destajos</p>
            <p className="text-xl font-bold">{processedData.kpis.total}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("P")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "P" ? 'bg-yellow-200 border-l-4 border-yellow-500' : 'bg-yellow-100'
            }`}
          >
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-xl font-bold">{processedData.kpis.pendientes}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("R")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "R" ? 'bg-red-200 border-l-4 border-red-500' : 'bg-red-100'
            }`}
          >
            <p className="text-sm text-gray-600">Rechazados</p>
            <p className="text-xl font-bold">{processedData.kpis.rechazados}</p>
          </div>
          <div
            onClick={() => handleEstadoFilter("A")}
            className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
              estadoFiltro === "A" ? 'bg-green-200 border-l-4 border-green-500' : 'bg-green-100'
            }`}
          >
            <p className="text-sm text-gray-600">Aprobados</p>
            <p className="text-xl font-bold">{processedData.kpis.aprobados}</p>
          </div>
        </div>

        {/* Cards de registros móvil */}
        {!loading && paginatedCabeceras.length > 0 ? (
          <div className="space-y-3">
            {paginatedCabeceras.map((item, idx) => {
              const key = `${item.lote}_${item.fecha_destajo}_${item.cod_proceso}_${item.cod_subproceso || ""}`;
              const isExpanded = expandedCards.has(key);
              const detalleItem = getDetalleForItem(item);
              const isSelected = isRowSelected(item);
              
              return (
                <div
                  key={idx}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 overflow-hidden ${
                    isSelected 
                      ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800" 
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div 
                    onClick={() => handleRowClick(item)}
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
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Subproceso:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{item.cod_subproceso} {item.subproceso}</p>
                        </div>
                      )}
                      {item.cliente && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Cliente:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{item.cliente}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Estado:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.estado_autorizado === 'P' ? 'bg-yellow-100 text-yellow-800' :
                          item.estado_autorizado === 'A' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.estado_autorizado === 'P' ? 'Pendiente' :
                            item.estado_autorizado === 'A' ? 'Aprobado' : 'Rechazado'}
                        </span>
                      </div>
                    </div>

                    {detalleItem.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleCardExpansion(key)}
                          className="flex items-center justify-between w-full text-sm font-medium text-indigo-600 dark:text-indigo-400 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md"
                        >
                          <span>Ver Detalle ({detalleItem.length} trabajadores)</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 text-xs border border-gray-200 dark:border-gray-600">
                              <div className="grid grid-cols-4 gap-2 font-semibold text-gray-700 dark:text-gray-300 pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                                <span>Código</span>
                                <span className="col-span-2">Trabajador</span>
                                <span>Horas/Kilos</span>
                              </div>
                            {detalleItem.map((d, i) => (
                              <div key={i} className="grid grid-cols-4 gap-2 py-1 text-xs border-b border-gray-100 dark:border-gray-600 last:border-0">
                                <span className="text-gray-600 dark:text-gray-400">{d.cod_trabajador}</span>
                                <span className="col-span-2 text-gray-900 dark:text-white">{d.trabajador}</span>
                                <span className="text-gray-900 dark:text-white">
                                  {d.horas > 0 ? `${d.horas}h` : `${d.kilos}kg`}
                                </span>
                              </div>
                            ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botón de acción para móvil - Generar PDF Individual */}
                    <button
                      onClick={() => generarPDF(item)}
                      className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Generar Detalle PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {processing ? "Procesando datos..." : 
             searchTerm || estadoFiltro ? "No se encontraron registros que coincidan con los filtros." : 
             "No hay registros."}
          </div>
        ) : null}

        {/* Paginación móvil */}
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

export default ReporteAutorizacionPage;