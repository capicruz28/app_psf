import api from './api';
import {
    PaginatedUsersResponse,
    UserFormData,
    UserWithRoles,
    UserUpdateData,
    ExternalProfileResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ChangePasswordRequest,
    ChangePasswordResponse
} from '../types/usuario.types';

const BASE_URL = '/usuarios';

export const getUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<PaginatedUsersResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) {
      params.append('search', search);
    }
    // ✅ Ya tiene / al final - OK
    const response = await api.get<PaginatedUsersResponse>(`${BASE_URL}/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<UserWithRoles> => {
    try {
        // ✅ CAMBIO: Agregar / al final
        const response = await api.get<UserWithRoles>(`${BASE_URL}/${userId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        throw error;
    }
};

export const createUser = async (userData: UserFormData): Promise<UserWithRoles> => {
    try {
        // ✅ Ya tiene / al final - OK
        const response = await api.post<UserWithRoles>(`${BASE_URL}/`, userData);
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

export const updateUser = async (userId: number, userData: UserUpdateData): Promise<UserWithRoles> => {
    try {
        // ✅ CAMBIO: Agregar / al final
        const response = await api.put<UserWithRoles>(`${BASE_URL}/${userId}/`, userData);
        return response.data;
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error);
        throw error;
    }
};

export const deleteUser = async (userId: number): Promise<{ message: string; usuario_id: number }> => {
    try {
        // ✅ CAMBIO: Agregar / al final
        const response = await api.delete<{ message: string; usuario_id: number }>(`${BASE_URL}/${userId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting/deactivating user ${userId}:`, error);
        throw error;
    }
};

export const assignRoleToUser = async (userId: number, roleId: number): Promise<any> => {
    try {
        // ✅ CAMBIO: Agregar / al final
        const response = await api.post(`${BASE_URL}/${userId}/roles/${roleId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error assigning role ${roleId} to user ${userId}:`, error);
        throw error;
    }
};

export const revokeRoleFromUser = async (userId: number, roleId: number): Promise<any> => {
    try {
        // ✅ CAMBIO: Agregar / al final
        const response = await api.delete(`${BASE_URL}/${userId}/roles/${roleId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error revoking role ${roleId} from user ${userId}:`, error);
        throw error;
    }
};

export const fetchExternalProfile = async (codigoTrabajador: string): Promise<ExternalProfileResponse> => {
    try {
        const response = await api.get<ExternalProfileResponse>(
            `${BASE_URL}/consultar-perfil-externo/${codigoTrabajador}/`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching external profile for code ${codigoTrabajador}:`, error);
        throw error;
    }
};

/**
 * Reset de contraseña por administrador
 * Endpoint: POST /api/v1/usuarios/{usuario_id}/reset-password/
 * Permisos: Rol "Administrador"
 */
export const resetUserPassword = async (
    userId: number,
    data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
    try {
        const response = await api.post<ResetPasswordResponse>(
            `${BASE_URL}/${userId}/reset-password/`,
            data
        );
        return response.data;
    } catch (error) {
        console.error(`Error resetting password for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Cambio de contraseña propia del usuario autenticado
 * Endpoint: POST /api/v1/usuarios/{usuario_id}/change-password/
 * Permisos: Usuario autenticado (solo su propia contraseña)
 */
export const changeOwnPassword = async (
    userId: number,
    data: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
    try {
        const response = await api.post<ChangePasswordResponse>(
            `${BASE_URL}/${userId}/change-password/`,
            data
        );
        return response.data;
    } catch (error) {
        console.error(`Error changing password for user ${userId}:`, error);
        throw error;
    }
};