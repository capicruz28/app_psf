// src/pages/admin/vacaciones/ConfigFlujoPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, RefreshCw, Save, X } from 'lucide-react';
import { 
  getConfigFlujos, 
  createConfigFlujo, 
  updateConfigFlujo, 
  deleteConfigFlujo,
  buscarAreas,
  buscarSecciones,
  buscarCargos,
} from '../../../services/vacaciones.service';
import type { ConfigFlujo, ConfigFlujoCreate, ConfigFlujoUpdate } from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { getErrorMessage } from '../../../services/error.service';
import { TIPO_SOLICITUD_OPTIONS, ACTIVO_INACTIVO_OPTIONS } from '../../../types/vacaciones.types';
import AutocompleteSearch, { AutocompleteOption } from '../../../components/ui/AutocompleteSearch';

const ConfigFlujoPage: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigFlujo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 10;
  const currentPage = 1; // P?gina fija ya que el backend no devuelve paginaci?n

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigFlujo | null>(null);
  const [formData, setFormData] = useState<ConfigFlujoCreate>({
    tipo_solicitud: 'V',
    niveles_requeridos: 2,
    activo: 'S',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para los campos de b?squeda
  const [searchArea, setSearchArea] = useState('');
  const [searchSeccion, setSearchSeccion] = useState('');
  const [searchCargo, setSearchCargo] = useState('');

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getConfigFlujos(currentPage, limit);
      let configsData = response.configuraciones || [];
      
      // Enriquecer configuraciones con descripciones faltantes
      const configsEnriquecidas = await Promise.all(
        configsData.map(async (config) => {
          const enriquecida = { ...config };
          
          // Buscar descripci?n de ?rea si no est? disponible
          if (config.codigo_area && !config.area_nombre) {
            try {
              const areaResponse = await buscarAreas({ codigo: config.codigo_area.trim(), limit: 1 });
              if (areaResponse.items.length > 0) {
                enriquecida.area_nombre = areaResponse.items[0].descripcion;
              }
            } catch (error) {
              console.error('Error buscando ?rea:', error);
            }
          }
          
          // Buscar descripci?n de secci?n si no est? disponible
          if (config.codigo_seccion && !config.seccion_nombre) {
            try {
              const seccionResponse = await buscarSecciones({ codigo: config.codigo_seccion.trim(), limit: 1 });
              if (seccionResponse.items.length > 0) {
                enriquecida.seccion_nombre = seccionResponse.items[0].descripcion;
              }
            } catch (error) {
              console.error('Error buscando secci?n:', error);
            }
          }
          
          // Buscar descripci?n de cargo si no est? disponible
          if (config.codigo_cargo && !config.cargo_nombre) {
            try {
              const cargoResponse = await buscarCargos({ codigo: config.codigo_cargo.trim(), limit: 1 });
              if (cargoResponse.items.length > 0) {
                enriquecida.cargo_nombre = cargoResponse.items[0].descripcion;
              }
            } catch (error) {
              console.error('Error buscando cargo:', error);
            }
          }
          
          return enriquecida;
        })
      );
      
      setConfigs(configsEnriquecidas);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar configuraciones');
      // Asegurar que siempre sea un array incluso en caso de error
      setConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleOpenModal = async (config?: ConfigFlujo) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        tipo_solicitud: config.tipo_solicitud,
        codigo_permiso: config.codigo_permiso || undefined,
        codigo_area: config.codigo_area?.trim() || undefined,
        codigo_seccion: config.codigo_seccion?.trim() || undefined,
        codigo_cargo: config.codigo_cargo?.trim() || undefined,
        dias_desde: config.dias_desde || undefined,
        dias_hasta: config.dias_hasta || undefined,
        niveles_requeridos: config.niveles_requeridos,
        orden: config.orden,
        activo: config.activo,
        fecha_desde: config.fecha_desde,
        fecha_hasta: config.fecha_hasta || undefined,
        descripcion: config.descripcion || undefined,
      });
      
      // Buscar descripciones si no est?n disponibles
      let areaLabel = config.codigo_area?.trim() || '';
      let seccionLabel = config.codigo_seccion?.trim() || '';
      let cargoLabel = config.codigo_cargo?.trim() || '';
      
      // Buscar descripci?n de ?rea si no est? disponible
      if (config.codigo_area && !config.area_nombre) {
        try {
          const areaResponse = await buscarAreas({ codigo: config.codigo_area.trim(), limit: 1 });
          if (areaResponse.items.length > 0) {
            areaLabel = `${areaResponse.items[0].codigo} - ${areaResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando ?rea:', error);
        }
      } else if (config.codigo_area && config.area_nombre) {
        areaLabel = `${config.codigo_area.trim()} - ${config.area_nombre}`;
      }
      
      // Buscar descripci?n de secci?n si no est? disponible
      if (config.codigo_seccion && !config.seccion_nombre) {
        try {
          const seccionResponse = await buscarSecciones({ codigo: config.codigo_seccion.trim(), limit: 1 });
          if (seccionResponse.items.length > 0) {
            seccionLabel = `${seccionResponse.items[0].codigo} - ${seccionResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando secci?n:', error);
        }
      } else if (config.codigo_seccion && config.seccion_nombre) {
        seccionLabel = `${config.codigo_seccion.trim()} - ${config.seccion_nombre}`;
      }
      
      // Buscar descripci?n de cargo si no est? disponible
      if (config.codigo_cargo && !config.cargo_nombre) {
        try {
          const cargoResponse = await buscarCargos({ codigo: config.codigo_cargo.trim(), limit: 1 });
          if (cargoResponse.items.length > 0) {
            cargoLabel = `${cargoResponse.items[0].codigo} - ${cargoResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando cargo:', error);
        }
      } else if (config.codigo_cargo && config.cargo_nombre) {
        cargoLabel = `${config.codigo_cargo.trim()} - ${config.cargo_nombre}`;
      }
      
      setSearchArea(areaLabel);
      setSearchSeccion(seccionLabel);
      setSearchCargo(cargoLabel);
    } else {
      setEditingConfig(null);
      setFormData({
        tipo_solicitud: 'V',
        niveles_requeridos: 2,
        activo: 'S',
      });
      // Limpiar campos de búsqueda
      setSearchArea('');
      setSearchSeccion('');
      setSearchCargo('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
    setFormData({
      tipo_solicitud: 'V',
      niveles_requeridos: 2,
      activo: 'S',
    });
    // Limpiar campos de b?squeda
    setSearchArea('');
    setSearchSeccion('');
    setSearchCargo('');
  };

  // Funciones de búsqueda para autocompletado
  const searchAreas = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return [];
      
      let filters: any = { limit: 20 };
      
      // Si el query tiene formato "codigo - descripcion", extraer solo la descripción
      if (trimmedQuery.includes(' - ')) {
        const parts = trimmedQuery.split(' - ');
        if (parts.length > 1) {
          filters.descripcion = parts.slice(1).join(' - ').trim();
        } else {
          filters.descripcion = trimmedQuery;
        }
      } else {
        // Buscar siempre por descripción ya que el backend hace "contains" en descripción
        // Esto permite encontrar códigos parciales (ej: "3" encuentra "03") y descripciones
        filters.descripcion = trimmedQuery;
      }
      
      const response = await buscarAreas(filters);
      return response.items.map(item => ({
        value: item.codigo,
        label: `${item.codigo} - ${item.descripcion}`,
        subtitle: item.descripcion,
      }));
    } catch (error) {
      console.error('Error buscando áreas:', error);
      return [];
    }
  }, []);

  const searchSecciones = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return [];
      
      let filters: any = { limit: 20 };
      
      if (trimmedQuery.includes(' - ')) {
        const parts = trimmedQuery.split(' - ');
        if (parts.length > 1) {
          filters.descripcion = parts.slice(1).join(' - ').trim();
        } else {
          filters.descripcion = trimmedQuery;
        }
      } else {
        // Buscar siempre por descripción ya que el backend hace "contains"
        filters.descripcion = trimmedQuery;
      }
      
      const response = await buscarSecciones(filters);
      return response.items.map(item => ({
        value: item.codigo,
        label: `${item.codigo} - ${item.descripcion}`,
        subtitle: item.descripcion,
      }));
    } catch (error) {
      console.error('Error buscando secciones:', error);
      return [];
    }
  }, []);

  const searchCargos = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return [];
      
      let filters: any = { limit: 20 };
      
      if (trimmedQuery.includes(' - ')) {
        const parts = trimmedQuery.split(' - ');
        if (parts.length > 1) {
          filters.descripcion = parts.slice(1).join(' - ').trim();
        } else {
          filters.descripcion = trimmedQuery;
        }
      } else {
        // Buscar siempre por descripción ya que el backend hace "contains"
        filters.descripcion = trimmedQuery;
      }
      
      const response = await buscarCargos(filters);
      return response.items.map(item => ({
        value: item.codigo,
        label: `${item.codigo} - ${item.descripcion}`,
        subtitle: item.descripcion,
      }));
    } catch (error) {
      console.error('Error buscando cargos:', error);
      return [];
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingConfig) {
        await updateConfigFlujo(editingConfig.id_config, formData as ConfigFlujoUpdate);
        toast.success('Configuración actualizada exitosamente');
      } else {
        await createConfigFlujo(formData);
        toast.success('Configuración creada exitosamente');
      }
      handleCloseModal();
      fetchConfigs();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al guardar configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro que desea eliminar esta configuración?')) return;

    try {
      await deleteConfigFlujo(id);
      toast.success('Configuración eliminada exitosamente');
      fetchConfigs();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al eliminar configuración');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Configuración de Flujos
        </h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Configuración
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Desde</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Hasta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveles</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {configs && configs.map((config) => (
                <tr key={config.id_config} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">
                    {TIPO_SOLICITUD_OPTIONS.find(opt => opt.value === config.tipo_solicitud)?.label}
                    {config.codigo_permiso && ` (${config.codigo_permiso})`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {config.codigo_area ? (
                      <>
                        {config.codigo_area.trim()}
                        {config.area_nombre && (
                          <span className="text-gray-500 ml-1">({config.area_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {config.codigo_seccion ? (
                      <>
                        {config.codigo_seccion.trim()}
                        {config.seccion_nombre && (
                          <span className="text-gray-500 ml-1">({config.seccion_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {config.codigo_cargo ? (
                      <>
                        {config.codigo_cargo.trim()}
                        {config.cargo_nombre && (
                          <span className="text-gray-500 ml-1">({config.cargo_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {config.dias_desde !== null ? config.dias_desde : <span className="text-gray-400 italic">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {config.dias_hasta !== null ? config.dias_hasta : <span className="text-gray-400 italic">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{config.niveles_requeridos}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      config.activo === 'S' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {config.activo === 'S' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(config)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id_config)}>
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
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
            <DialogDescription>
              Configure las reglas de aprobación para solicitudes
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Solicitud *</label>
                <select
                  value={formData.tipo_solicitud}
                  onChange={(e) => setFormData({ ...formData, tipo_solicitud: e.target.value as 'V' | 'P' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {TIPO_SOLICITUD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Niveles Requeridos *</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.niveles_requeridos}
                  onChange={(e) => setFormData({ ...formData, niveles_requeridos: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <AutocompleteSearch
                  label="Área"
                  value={searchArea}
                  onChange={(value) => {
                    setSearchArea(value);
                    if (!value.trim()) {
                      setFormData({ ...formData, codigo_area: undefined });
                    }
                  }}
                  onSelect={(option) => {
                    setFormData({ ...formData, codigo_area: option.value });
                    setSearchArea(option.label);
                  }}
                  onSearch={searchAreas}
                  placeholder="Buscar área (dejar vacío para todas)..."
                  minChars={2}
                />
              </div>

              <div>
                <AutocompleteSearch
                  label="Sección"
                  value={searchSeccion}
                  onChange={(value) => {
                    setSearchSeccion(value);
                    if (!value.trim()) {
                      setFormData({ ...formData, codigo_seccion: undefined });
                    }
                  }}
                  onSelect={(option) => {
                    setFormData({ ...formData, codigo_seccion: option.value });
                    setSearchSeccion(option.label);
                  }}
                  onSearch={searchSecciones}
                  placeholder="Buscar sección (dejar vacío para todas)..."
                  minChars={2}
                />
              </div>

              <div>
                <AutocompleteSearch
                  label="Cargo"
                  value={searchCargo}
                  onChange={(value) => {
                    setSearchCargo(value);
                    if (!value.trim()) {
                      setFormData({ ...formData, codigo_cargo: undefined });
                    }
                  }}
                  onSelect={(option) => {
                    setFormData({ ...formData, codigo_cargo: option.value });
                    setSearchCargo(option.label);
                  }}
                  onSearch={searchCargos}
                  placeholder="Buscar cargo (dejar vacío para todos)..."
                  minChars={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Días Desde</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dias_desde || ''}
                  onChange={(e) => setFormData({ ...formData, dias_desde: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Mínimo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Días Hasta</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dias_hasta || ''}
                  onChange={(e) => setFormData({ ...formData, dias_hasta: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Máximo"
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

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input
                  type="text"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Descripción opcional"
                />
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

export default ConfigFlujoPage;
