// src/services/autorizacion.service.ts
import api from './api';
import {
  PendienteAutorizacion,
  AutorizacionUpdate,
  AutorizacionResponse,
  AutorizacionMultipleResponse,
  AutorizacionCountResponse,
  FinalizarTareoRequest, 
  FinalizarTareoResponse
} from '../types/autorizacion.types';

const BASE_URL = '/autorizacion';

/**
 * Obtiene la lista de registros pendientes de autorización.
 */
export const getPendientesAutorizacion = async (): Promise<PendienteAutorizacion[]> => {
  try {
    const response = await api.get<PendienteAutorizacion[]>(`${BASE_URL}/pendientes`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pendientes de autorización:', error);
    throw error;
  }
};

/**
 * Obtiene el conteo total de pendientes de autorización.
 */
export const getConteoPendientes = async (): Promise<AutorizacionCountResponse> => {
  try {
    const response = await api.get<AutorizacionCountResponse>(`${BASE_URL}/pendientes/count`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conteo de pendientes:', error);
    throw error;
  }
};

/**
 * Autoriza un registro específico.
 */
export const autorizarProceso = async (
  data: AutorizacionUpdate
): Promise<AutorizacionResponse> => {
  try {
    const response = await api.put<AutorizacionResponse>(`${BASE_URL}/autorizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error autorizando proceso:', error);
    throw error;
  }
};

/**
 * Autoriza múltiples registros seleccionados.
 */
export const autorizarMultipleProcesos = async (
  data: AutorizacionUpdate[]
): Promise<AutorizacionMultipleResponse> => {
  try {
    const response = await api.put<AutorizacionMultipleResponse>(
      `${BASE_URL}/autorizar-multiple`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error en autorización múltiple:', error);
    throw error;
  }
};

export const finalizarTareo = async (
  data: FinalizarTareoRequest
): Promise<FinalizarTareoResponse> => {
  try {
    const response = await api.put<FinalizarTareoResponse>(`${BASE_URL}/finalizar-tareo`, data);
    return response.data;
  } catch (error) {
    console.error('Error finalizando tareo:', error);
    throw error;
  }
};