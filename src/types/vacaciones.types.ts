// src/types/vacaciones.types.ts

// ============================================
// TIPOS BASE - Basados en estructura SQL
// ============================================

export type TipoSolicitud = 'V' | 'P'; // V=Vacaciones, P=Permiso
export type EstadoSolicitud = 'P' | 'A' | 'R' | 'N'; // P=Pendiente, A=Aprobado, R=Rechazado, N=Anulado
export type EstadoAprobacion = 'P' | 'A' | 'R'; // P=Pendiente, A=Aprobado, R=Rechazado
export type TipoRelacion = 'J' | 'G' | 'D'; // J=Jefe Directo, G=Gerente, D=Director
export type ActivoInactivo = 'S' | 'N'; // S=Activo, N=Inactivo

// ============================================
// SOLICITUDES
// ============================================

export interface Solicitud {
  id_solicitud: number;
  tipo_solicitud: TipoSolicitud;
  codigo_permiso: string | null;
  codigo_trabajador: string;
  fecha_inicio: string; // ISO date string
  fecha_fin: string; // ISO date string
  dias_solicitados: number;
  observacion: string | null;
  motivo: string | null;
  estado: EstadoSolicitud;
  fecha_registro: string; // ISO datetime string
  usuario_registro: string | null;
  fecha_modificacion: string | null;
  usuario_modificacion: string | null;
  fecha_anulacion: string | null;
  usuario_anulacion: string | null;
  motivo_anulacion: string | null;
  sregdi: string | null; // S=Ya se registró en días de descanso
  fecha_registro_planilla: string | null;
}

export interface SolicitudWithDetails extends Solicitud {
  // Datos adicionales del trabajador (desde vista)
  trabajador_nombre?: string;
  trabajador_dni?: string;
  trabajador_area?: string;
  trabajador_seccion?: string;
  trabajador_cargo?: string;
  // Descripción del permiso (desde backend)
  descripcion_permiso?: string | null;
  // Aprobaciones relacionadas
  aprobaciones?: Aprobacion[];
}

// ============================================
// APROBACIONES
// ============================================

export interface Aprobacion {
  id_aprobacion: number;
  id_solicitud: number;
  nivel: number;
  codigo_trabajador_aprueba: string;
  estado: EstadoAprobacion;
  observacion: string | null;
  fecha: string | null; // ISO datetime string
  usuario: string | null;
  ip_dispositivo: string | null;
  fecha_notificado: string | null;
  // Datos adicionales del aprobador
  aprobador_nombre?: string;
}

// ============================================
// CONFIGURACIÓN DE FLUJO
// ============================================

export interface ConfigFlujo {
  id_config: number;
  tipo_solicitud: TipoSolicitud;
  codigo_permiso: string | null;
  codigo_area: string | null;
  codigo_seccion: string | null;
  codigo_cargo: string | null;
  dias_desde: number | null;
  dias_hasta: number | null;
  niveles_requeridos: number;
  orden: number;
  activo: ActivoInactivo;
  fecha_desde: string; // ISO date string
  fecha_hasta: string | null;
  usuario_registro: string | null;
  fecha_registro: string; // ISO datetime string
  descripcion: string | null;
  // Datos adicionales
  area_nombre?: string;
  seccion_nombre?: string;
  cargo_nombre?: string;
}

export interface ConfigFlujoCreate {
  tipo_solicitud: TipoSolicitud;
  codigo_permiso?: string | null;
  codigo_area?: string | null;
  codigo_seccion?: string | null;
  codigo_cargo?: string | null;
  dias_desde?: number | null;
  dias_hasta?: number | null;
  niveles_requeridos: number;
  orden?: number;
  activo?: ActivoInactivo;
  fecha_desde?: string;
  fecha_hasta?: string | null;
  descripcion?: string | null;
}

export interface ConfigFlujoUpdate extends Partial<ConfigFlujoCreate> {
  activo?: ActivoInactivo;
  fecha_hasta?: string | null;
}

// ============================================
// JERARQUÍA
// ============================================

export interface Jerarquia {
  id_jerarquia: number;
  codigo_area: string | null;
  codigo_seccion: string | null;
  codigo_cargo: string | null;
  codigo_trabajador_aprobador: string;
  tipo_relacion: TipoRelacion;
  nivel_jerarquico: number;
  activo: ActivoInactivo;
  fecha_desde: string; // ISO date string
  fecha_hasta: string | null;
  usuario_registro: string | null;
  fecha_registro: string; // ISO datetime string
  descripcion: string | null;
  // Datos adicionales
  aprobador_nombre?: string;
  nombre_aprobador?: string; // Alias del backend
  area_nombre?: string;
  seccion_nombre?: string;
  cargo_nombre?: string;
}

export interface JerarquiaCreate {
  codigo_area?: string | null;
  codigo_seccion?: string | null;
  codigo_cargo?: string | null;
  codigo_trabajador_aprobador: string;
  tipo_relacion: TipoRelacion;
  nivel_jerarquico: number;
  activo?: ActivoInactivo;
  fecha_desde?: string;
  fecha_hasta?: string | null;
  descripcion?: string | null;
}

export interface JerarquiaUpdate extends Partial<JerarquiaCreate> {
  activo?: ActivoInactivo;
  fecha_hasta?: string | null;
}

// ============================================
// SUSTITUTOS
// ============================================

export interface Sustituto {
  id_sustituto: number;
  codigo_trabajador_titular: string;
  codigo_trabajador_sustituto: string;
  fecha_desde: string; // ISO date string
  fecha_hasta: string; // ISO date string
  motivo: string | null;
  observacion: string | null;
  activo: ActivoInactivo;
  usuario_registro: string | null;
  fecha_registro: string; // ISO datetime string
  // Datos adicionales
  titular_nombre?: string;
  sustituto_nombre?: string;
}

export interface SustitutoCreate {
  codigo_trabajador_titular: string;
  codigo_trabajador_sustituto: string;
  fecha_desde: string;
  fecha_hasta: string;
  motivo?: string | null;
  observacion?: string | null;
  activo?: ActivoInactivo;
}

export interface SustitutoUpdate extends Partial<SustitutoCreate> {
  activo?: ActivoInactivo;
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface Estadisticas {
  total_solicitudes: number;
  solicitudes_pendientes: number;
  solicitudes_aprobadas: number;
  solicitudes_rechazadas: number;
  solicitudes_anuladas: number;
  total_vacaciones: number;
  total_permisos: number;
  dias_solicitados_totales: number;
  dias_aprobados_totales: number;
  // Por tipo de permiso
  permisos_por_tipo?: Record<string, number>;
  // Por área
  solicitudes_por_area?: Record<string, number>;
  // Por mes
  solicitudes_por_mes?: Array<{
    mes: string;
    cantidad: number;
  }>;
}

// ============================================
// SALDOS DE VACACIONES
// ============================================

export interface SaldoVacaciones {
  codigo_trabajador: string;
  trabajador_nombre?: string;
  codigo_area?: string;
  area_nombre?: string;
  codigo_seccion?: string;
  seccion_nombre?: string;
  dias_asignados_totales: number;
  dias_usados: number;
  dias_pendientes: number;
  saldo_disponible: number;
}

// ============================================
// FILTROS Y PAGINACIÓN
// ============================================

export interface SolicitudesFilters {
  page?: number;
  limit?: number;
  codigo_trabajador?: string;
  estado?: EstadoSolicitud;
  tipo_solicitud?: TipoSolicitud;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface PaginatedSolicitudesResponse {
  solicitudes: SolicitudWithDetails[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedConfigFlujoResponse {
  configuraciones: ConfigFlujo[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedJerarquiaResponse {
  jerarquias: Jerarquia[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedSustitutosResponse {
  sustitutos: Sustituto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedSaldosResponse {
  saldos: SaldoVacaciones[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================
// RESPUESTAS DE API
// ============================================

export interface AnularSolicitudRequest {
  motivo_anulacion: string;
}

export interface AnularSolicitudResponse {
  message: string;
  id_solicitud: number;
  estado: EstadoSolicitud;
}

// ============================================
// OPCIONES PARA SELECTS
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export const TIPO_SOLICITUD_OPTIONS: SelectOption[] = [
  { value: 'V', label: 'Vacaciones' },
  { value: 'P', label: 'Permiso' },
];

export const ESTADO_SOLICITUD_OPTIONS: SelectOption[] = [
  { value: 'P', label: 'Pendiente' },
  { value: 'A', label: 'Aprobado' },
  { value: 'R', label: 'Rechazado' },
  { value: 'N', label: 'Anulado' },
];

export const TIPO_RELACION_OPTIONS: SelectOption[] = [
  { value: 'J', label: 'Jefe Directo' },
  { value: 'G', label: 'Gerente' },
  { value: 'D', label: 'Director' },
];

export const ACTIVO_INACTIVO_OPTIONS: SelectOption[] = [
  { value: 'S', label: 'Activo' },
  { value: 'N', label: 'Inactivo' },
];

// ============================================
// BÚSQUEDA DE CATÁLOGOS
// ============================================

export interface AreaItem {
  codigo: string;
  descripcion: string;
}

export interface SeccionItem {
  codigo: string;
  descripcion: string;
}

export interface CargoItem {
  codigo: string;
  descripcion: string;
}

export interface TrabajadorItem {
  codigo: string;
  nombre_completo: string;
  codigo_area: string | null;
  codigo_seccion: string | null;
  codigo_cargo: string | null;
  numero_dni: string | null;
}

export interface PaginatedSearchResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BuscarAreasFilters {
  codigo?: string;
  descripcion?: string;
  page?: number;
  limit?: number;
}

export interface BuscarSeccionesFilters {
  codigo?: string;
  descripcion?: string;
  page?: number;
  limit?: number;
}

export interface BuscarCargosFilters {
  codigo?: string;
  descripcion?: string;
  page?: number;
  limit?: number;
}

export interface BuscarTrabajadoresFilters {
  codigo?: string;
  nombre?: string;
  codigo_area?: string;
  codigo_seccion?: string;
  codigo_cargo?: string;
  numero_dni?: string;
  page?: number;
  limit?: number;
}

// ============================================
// CATÁLOGO DE PERMISOS
// ============================================

export interface PermisoItem {
  codigo: string;
  descripcion: string;
}

export interface BuscarPermisosFilters {
  codigo?: string;
  descripcion?: string;
  page?: number;
  limit?: number;
}
