// src/pages/admin/vacaciones/SustitutosPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, RefreshCw, Save, X, Calendar } from 'lucide-react';
import { 
  getSustitutos, 
  createSustituto, 
  updateSustituto, 
  deleteSustituto 
} from '../../../services/vacaciones.service';
import type { Sustituto, SustitutoCreate, SustitutoUpdate } from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { getErrorMessage } from '../../../services/error.service';
import { ACTIVO_INACTIVO_OPTIONS } from '../../../types/vacaciones.types';

const SustitutosPage: React.FC = () => {
  const [sustitutos, setSustitutos] = useState<Sustituto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 10;
  const currentPage = 1; // Página fija ya que el backend no devuelve paginación

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSustituto, setEditingSustituto] = useState<Sustituto | null>(null);
  const [formData, setFormData] = useState<SustitutoCreate>({
    codigo_trabajador_titular: '',
    codigo_trabajador_sustituto: '',
    fecha_desde: '',
    fecha_hasta: '',
    activo: 'S',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSustitutos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getSustitutos(currentPage, limit);
      // Asegurar que siempre sea un array
      setSustitutos(response.sustitutos || []);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar sustitutos');
      // Asegurar que siempre sea un array incluso en caso de error
      setSustitutos([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchSustitutos();
  }, [fetchSustitutos]);

  const handleOpenModal = (sustituto?: Sustituto) => {
    if (sustituto) {
      setEditingSustituto(sustituto);
      setFormData({
        codigo_trabajador_titular: sustituto.codigo_trabajador_titular,
        codigo_trabajador_sustituto: sustituto.codigo_trabajador_sustituto,
        fecha_desde: sustituto.fecha_desde,
        fecha_hasta: sustituto.fecha_hasta,
        motivo: sustituto.motivo || undefined,
        observacion: sustituto.observacion || undefined,
        activo: sustituto.activo,
      });
    } else {
      setEditingSustituto(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        codigo_trabajador_titular: '',
        codigo_trabajador_sustituto: '',
        fecha_desde: today,
        fecha_hasta: today,
        activo: 'S',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSustituto(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      codigo_trabajador_titular: '',
      codigo_trabajador_sustituto: '',
      fecha_desde: today,
      fecha_hasta: today,
      activo: 'S',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(formData.fecha_desde) > new Date(formData.fecha_hasta)) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSustituto) {
        await updateSustituto(editingSustituto.id_sustituto, formData as SustitutoUpdate);
        toast.success('Sustituto actualizado exitosamente');
      } else {
        await createSustituto(formData);
        toast.success('Sustituto creado exitosamente');
      }
      handleCloseModal();
      fetchSustitutos();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al guardar sustituto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro que desea eliminar este sustituto?')) return;

    try {
      await deleteSustituto(id);
      toast.success('Sustituto eliminado exitosamente');
      fetchSustitutos();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al eliminar sustituto');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gestión de Sustitutos
        </h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Sustituto
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titular</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sustituto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sustitutos && sustitutos.map((sustituto) => (
                <tr key={sustituto.id_sustituto} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">
                    {sustituto.codigo_trabajador_titular}
                    {sustituto.titular_nombre && (
                      <span className="text-gray-500 ml-1">({sustituto.titular_nombre})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {sustituto.codigo_trabajador_sustituto}
                    {sustituto.sustituto_nombre && (
                      <span className="text-gray-500 ml-1">({sustituto.sustituto_nombre})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div>{new Date(sustituto.fecha_desde).toLocaleDateString('es-PE')}</div>
                        <div className="text-xs text-gray-500">hasta {new Date(sustituto.fecha_hasta).toLocaleDateString('es-PE')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {sustituto.motivo || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sustituto.activo === 'S' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {sustituto.activo === 'S' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(sustituto)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(sustituto.id_sustituto)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSustituto ? 'Editar Sustituto' : 'Nuevo Sustituto'}
            </DialogTitle>
            <DialogDescription>
              Configure la sustitución temporal de un aprobador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código Trabajador Titular *</label>
                <input
                  type="text"
                  value={formData.codigo_trabajador_titular}
                  onChange={(e) => setFormData({ ...formData, codigo_trabajador_titular: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Código Trabajador Sustituto *</label>
                <input
                  type="text"
                  value={formData.codigo_trabajador_sustituto}
                  onChange={(e) => setFormData({ ...formData, codigo_trabajador_sustituto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Desde *</label>
                <input
                  type="date"
                  value={formData.fecha_desde}
                  onChange={(e) => setFormData({ ...formData, fecha_desde: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Hasta *</label>
                <input
                  type="date"
                  value={formData.fecha_hasta}
                  onChange={(e) => setFormData({ ...formData, fecha_hasta: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Motivo</label>
                <input
                  type="text"
                  value={formData.motivo || ''}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Vacaciones, Licencia, etc."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Observación</label>
                <textarea
                  value={formData.observacion || ''}
                  onChange={(e) => setFormData({ ...formData, observacion: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.value as 'S' | 'N' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {ACTIVO_INACTIVO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SustitutosPage;
