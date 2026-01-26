// src/services/vacaciones.service.ts

import api from './api';
import type {  
  SolicitudWithDetails,
  PaginatedSolicitudesResponse,
  SolicitudesFilters,
  ConfigFlujo,
  ConfigFlujoCreate,
  ConfigFlujoUpdate,
  PaginatedConfigFlujoResponse,
  Jerarquia,
  JerarquiaCreate,
  JerarquiaUpdate,
  PaginatedJerarquiaResponse,
  Sustituto,
  SustitutoCreate,
  SustitutoUpdate,
  PaginatedSustitutosResponse,
  Estadisticas,  
  PaginatedSaldosResponse,  
  AnularSolicitudResponse,
  AreaItem,
  SeccionItem,
  CargoItem,
  TrabajadorItem,
  PaginatedSearchResponse,
  BuscarAreasFilters,
  BuscarSeccionesFilters,
  BuscarCargosFilters,
  BuscarTrabajadoresFilters,
  PermisoItem,
  BuscarPermisosFilters,
} from '../types/vacaciones.types';

const BASE_URL = '/vacaciones/admin';

// ============================================
// SOLICITUDES
// ============================================

/**
 * Listar todas las solicitudes con paginación y filtros
 * GET /api/v1/vacaciones/admin/solicitudes
 */
export const getSolicitudes = async (
  filters: SolicitudesFilters = {}
): Promise<PaginatedSolicitudesResponse> => {
  try {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.codigo_trabajador) params.append('codigo_trabajador', filters.codigo_trabajador);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.tipo_solicitud) params.append('tipo_solicitud', filters.tipo_solicitud);
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

    // El backend devuelve { items, total, page, limit, pages }
    // Necesitamos adaptarlo a { solicitudes, total, page, limit, total_pages }
    const response = await api.get<{
      items: SolicitudWithDetails[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>(
      `${BASE_URL}/solicitudes`,
      { params }
    );
    
    // Adaptar la respuesta del backend al formato esperado
    return {
      solicitudes: response.data.items || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 10,
      total_pages: response.data.pages || 1,
    };
  } catch (error) {
    console.error('Error fetching solicitudes:', error);
    throw error;
  }
};

/**
 * Obtener detalle completo de una solicitud
 * GET /api/v1/vacaciones/admin/solicitud/{id_solicitud}
 */
export const getSolicitudById = async (
  idSolicitud: number
): Promise<SolicitudWithDetails> => {
  try {
    const response = await api.get<SolicitudWithDetails>(
      `${BASE_URL}/solicitud/${idSolicitud}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching solicitud ${idSolicitud}:`, error);
    throw error;
  }
};

/**
 * Anular una solicitud
 * POST /api/v1/vacaciones/admin/solicitud/{id_solicitud}/anular
 */
export const anularSolicitud = async (
  idSolicitud: number,
  motivo: string
): Promise<AnularSolicitudResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('motivo_anulacion', motivo);

    const response = await api.post<AnularSolicitudResponse>(
      `${BASE_URL}/solicitud/${idSolicitud}/anular`,
      null,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error(`Error anulando solicitud ${idSolicitud}:`, error);
    throw error;
  }
};

// ============================================
// CONFIGURACIÓN DE FLUJO
// ============================================

/**
 * Listar configuraciones de flujo
 * GET /api/v1/vacaciones/admin/config-flujo
 */
export const getConfigFlujos = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedConfigFlujoResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<ConfigFlujo[] | PaginatedConfigFlujoResponse>(
      `${BASE_URL}/config-flujo`,
      { params }
    );
    
    // Si la respuesta es un array directamente, convertirla al formato paginado
    if (Array.isArray(response.data)) {
      return {
        configuraciones: response.data,
        total: response.data.length,
        page: 1,
        limit: response.data.length,
        total_pages: 1,
      };
    }
    
    // Si ya es un objeto paginado, retornarlo tal cual
    return response.data as PaginatedConfigFlujoResponse;
  } catch (error) {
    console.error('Error fetching config flujos:', error);
    throw error;
  }
};

/**
 * Crear configuración de flujo
 * POST /api/v1/vacaciones/admin/config-flujo
 */
export const createConfigFlujo = async (
  data: ConfigFlujoCreate
): Promise<ConfigFlujo> => {
  try {
    const response = await api.post<ConfigFlujo>(
      `${BASE_URL}/config-flujo`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating config flujo:', error);
    throw error;
  }
};

/**
 * Actualizar configuración de flujo
 * PUT /api/v1/vacaciones/admin/config-flujo/{id_config}
 */
export const updateConfigFlujo = async (
  idConfig: number,
  data: ConfigFlujoUpdate
): Promise<ConfigFlujo> => {
  try {
    const response = await api.put<ConfigFlujo>(
      `${BASE_URL}/config-flujo/${idConfig}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating config flujo ${idConfig}:`, error);
    throw error;
  }
};

/**
 * Eliminar/Desactivar configuración de flujo
 * DELETE /api/v1/vacaciones/admin/config-flujo/{id_config}
 */
export const deleteConfigFlujo = async (
  idConfig: number
): Promise<{ message: string; id_config: number }> => {
  try {
    const response = await api.delete<{ message: string; id_config: number }>(
      `${BASE_URL}/config-flujo/${idConfig}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error deleting config flujo ${idConfig}:`, error);
    throw error;
  }
};

// ============================================
// JERARQUÍA
// ============================================

/**
 * Listar jerarquías de aprobación
 * GET /api/v1/vacaciones/admin/jerarquia
 */
export const getJerarquias = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedJerarquiaResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<Jerarquia[] | PaginatedJerarquiaResponse>(
      `${BASE_URL}/jerarquia`,
      { params }
    );
    
    // Si la respuesta es un array directamente, convertirla al formato paginado
    if (Array.isArray(response.data)) {
      return {
        jerarquias: response.data,
        total: response.data.length,
        page: 1,
        limit: response.data.length,
        total_pages: 1,
      };
    }
    
    // Si ya es un objeto paginado, retornarlo tal cual
    return response.data as PaginatedJerarquiaResponse;
  } catch (error) {
    console.error('Error fetching jerarquias:', error);
    throw error;
  }
};

/**
 * Crear jerarquía
 * POST /api/v1/vacaciones/admin/jerarquia
 */
export const createJerarquia = async (
  data: JerarquiaCreate
): Promise<Jerarquia> => {
  try {
    const response = await api.post<Jerarquia>(
      `${BASE_URL}/jerarquia`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating jerarquia:', error);
    throw error;
  }
};

/**
 * Actualizar jerarquía
 * PUT /api/v1/vacaciones/admin/jerarquia/{id_jerarquia}
 */
export const updateJerarquia = async (
  idJerarquia: number,
  data: JerarquiaUpdate
): Promise<Jerarquia> => {
  try {
    const response = await api.put<Jerarquia>(
      `${BASE_URL}/jerarquia/${idJerarquia}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating jerarquia ${idJerarquia}:`, error);
    throw error;
  }
};

/**
 * Eliminar/Desactivar jerarquía
 * DELETE /api/v1/vacaciones/admin/jerarquia/{id_jerarquia}
 */
export const deleteJerarquia = async (
  idJerarquia: number
): Promise<{ message: string; id_jerarquia: number }> => {
  try {
    const response = await api.delete<{ message: string; id_jerarquia: number }>(
      `${BASE_URL}/jerarquia/${idJerarquia}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error deleting jerarquia ${idJerarquia}:`, error);
    throw error;
  }
};

// ============================================
// SUSTITUTOS
// ============================================

/**
 * Listar sustitutos
 * GET /api/v1/vacaciones/admin/sustitutos
 */
export const getSustitutos = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedSustitutosResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<PaginatedSustitutosResponse>(
      `${BASE_URL}/sustitutos`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching sustitutos:', error);
    throw error;
  }
};

/**
 * Crear sustituto
 * POST /api/v1/vacaciones/admin/sustituto
 */
export const createSustituto = async (
  data: SustitutoCreate
): Promise<Sustituto> => {
  try {
    const response = await api.post<Sustituto>(
      `${BASE_URL}/sustituto`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating sustituto:', error);
    throw error;
  }
};

/**
 * Actualizar sustituto
 * PUT /api/v1/vacaciones/admin/sustituto/{id_sustituto}
 */
export const updateSustituto = async (
  idSustituto: number,
  data: SustitutoUpdate
): Promise<Sustituto> => {
  try {
    const response = await api.put<Sustituto>(
      `${BASE_URL}/sustituto/${idSustituto}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating sustituto ${idSustituto}:`, error);
    throw error;
  }
};

/**
 * Eliminar/Desactivar sustituto
 * DELETE /api/v1/vacaciones/admin/sustituto/{id_sustituto}
 */
export const deleteSustituto = async (
  idSustituto: number
): Promise<{ message: string; id_sustituto: number }> => {
  try {
    const response = await api.delete<{ message: string; id_sustituto: number }>(
      `${BASE_URL}/sustituto/${idSustituto}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error deleting sustituto ${idSustituto}:`, error);
    throw error;
  }
};

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Obtener estadísticas
 * GET /api/v1/vacaciones/admin/estadisticas
 */
export const getEstadisticas = async (
  fechaDesde?: string,
  fechaHasta?: string
): Promise<Estadisticas> => {
  try {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);

    const response = await api.get<Estadisticas>(
      `${BASE_URL}/estadisticas`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching estadisticas:', error);
    throw error;
  }
};

// ============================================
// SALDOS
// ============================================

/**
 * Listar saldos de vacaciones
 * GET /api/v1/vacaciones/admin/saldos
 */
export const getSaldos = async (
  codigoArea?: string,
  codigoSeccion?: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedSaldosResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (codigoArea) params.append('codigo_area', codigoArea);
    if (codigoSeccion) params.append('codigo_seccion', codigoSeccion);

    const response = await api.get<PaginatedSaldosResponse>(
      `${BASE_URL}/saldos`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching saldos:', error);
    throw error;
  }
};

// ============================================
// BÚSQUEDA DE CATÁLOGOS
// ============================================

/**
 * Buscar áreas
 * GET /api/v1/vacaciones/admin/buscar/areas
 */
export const buscarAreas = async (
  filters: BuscarAreasFilters = {}
): Promise<PaginatedSearchResponse<AreaItem>> => {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.descripcion) params.append('descripcion', filters.descripcion);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedSearchResponse<AreaItem>>(
      `${BASE_URL}/buscar/areas`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error buscando áreas:', error);
    throw error;
  }
};

/**
 * Buscar secciones
 * GET /api/v1/vacaciones/admin/buscar/secciones
 */
export const buscarSecciones = async (
  filters: BuscarSeccionesFilters = {}
): Promise<PaginatedSearchResponse<SeccionItem>> => {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.descripcion) params.append('descripcion', filters.descripcion);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedSearchResponse<SeccionItem>>(
      `${BASE_URL}/buscar/secciones`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error buscando secciones:', error);
    throw error;
  }
};

/**
 * Buscar cargos
 * GET /api/v1/vacaciones/admin/buscar/cargos
 */
export const buscarCargos = async (
  filters: BuscarCargosFilters = {}
): Promise<PaginatedSearchResponse<CargoItem>> => {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.descripcion) params.append('descripcion', filters.descripcion);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedSearchResponse<CargoItem>>(
      `${BASE_URL}/buscar/cargos`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error buscando cargos:', error);
    throw error;
  }
};

/**
 * Buscar trabajadores
 * GET /api/v1/vacaciones/admin/buscar/trabajadores
 */
export const buscarTrabajadores = async (
  filters: BuscarTrabajadoresFilters = {}
): Promise<PaginatedSearchResponse<TrabajadorItem>> => {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.nombre) params.append('nombre', filters.nombre);
    if (filters.codigo_area) params.append('codigo_area', filters.codigo_area);
    if (filters.codigo_seccion) params.append('codigo_seccion', filters.codigo_seccion);
    if (filters.codigo_cargo) params.append('codigo_cargo', filters.codigo_cargo);
    if (filters.numero_dni) params.append('numero_dni', filters.numero_dni);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<PaginatedSearchResponse<TrabajadorItem>>(
      `${BASE_URL}/buscar/trabajadores`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error buscando trabajadores:', error);
    throw error;
  }
};

/**
 * Buscar permisos (configuraciones mconfa00)
 * GET /api/v1/vacaciones/admin/buscar/permisos
 * O alternativamente: /api/v1/vacaciones/admin/buscar/configuraciones
 */
export const buscarPermisos = async (
  filters: BuscarPermisosFilters = {}
): Promise<PaginatedSearchResponse<PermisoItem>> => {
  try {
    const params = new URLSearchParams();
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.descripcion) params.append('descripcion', filters.descripcion);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    // Intentar primero con /buscar/permisos
    try {
      const response = await api.get<PaginatedSearchResponse<PermisoItem>>(
        `${BASE_URL}/buscar/permisos`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      // Si falla con 404, intentar con /buscar/configuraciones
      if (error?.response?.status === 404) {
        console.warn('Endpoint /buscar/permisos no existe, intentando con /buscar/configuraciones');
        const response = await api.get<PaginatedSearchResponse<PermisoItem>>(
          `${BASE_URL}/buscar/configuraciones`,
          { params }
        );
        return response.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error buscando permisos:', error);
    throw error;
  }
};
