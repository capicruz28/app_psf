// src/pages/ChangePasswordPage.tsx

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Loader, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changeOwnPassword } from '../services/usuario.service';
import { getErrorMessage } from '../services/error.service';

type FormErrors = { [key: string]: string | undefined };

const ChangePasswordPage: React.FC = () => {
  const { auth } = useAuth();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'La contraseña actual es requerida.';
      isValid = false;
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'La nueva contraseña es requerida.';
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres.';
      isValid = false;
    } else if (currentPassword === newPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual.';
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'La confirmación de contraseña es requerida.';
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm() || !auth.user) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changeOwnPassword(auth.user.usuario_id, {
        contrasena_actual: currentPassword,
        nueva_contrasena: newPassword,
      });

      toast.success('Contraseña cambiada exitosamente.');
      
      // Limpiar formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (err) {
      console.error('Error changing password:', err);
      const errorData = getErrorMessage(err);
      toast.error(errorData.message || 'Error al cambiar la contraseña. Verifica que la contraseña actual sea correcta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    value: string
  ) => {
    if (field === 'currentPassword') {
      setCurrentPassword(value);
      if (errors.currentPassword) {
        setErrors(prev => ({ ...prev, currentPassword: undefined }));
      }
    } else if (field === 'newPassword') {
      setNewPassword(value);
      if (errors.newPassword) {
        setErrors(prev => ({ ...prev, newPassword: undefined }));
      }
      // Si cambia la nueva contraseña, también limpiar error de confirmación si existe
      if (errors.confirmPassword && confirmPassword) {
        // Revalidar confirmación
        if (value === confirmPassword) {
          setErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }
      }
    } else if (field === 'confirmPassword') {
      setConfirmPassword(value);
      if (errors.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  if (!auth.user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Debes iniciar sesión para cambiar tu contraseña.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Key className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cambiar Contraseña
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Actualiza tu contraseña de acceso al sistema
            </p>
          </div>
        </div>

        {/* Información del usuario */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Usuario:</span> {auth.user.nombre_usuario}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Nombre:</span> {auth.user.nombre} {auth.user.apellido}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5">
            {/* Contraseña actual */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Contraseña Actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleFieldChange('currentPassword', e.target.value)
                  }
                  className={`w-full px-4 py-2 pr-10 border rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white ${
                    errors.currentPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleFieldChange('newPassword', e.target.value)
                  }
                  className={`w-full px-4 py-2 pr-10 border rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white ${
                    errors.newPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.newPassword}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirmar Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleFieldChange('confirmPassword', e.target.value)
                  }
                  className={`w-full px-4 py-2 pr-10 border rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting && <Loader className="animate-spin h-4 w-4 mr-2" />}
              {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
