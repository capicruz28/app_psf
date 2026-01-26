// src/pages/admin/vacaciones/JerarquiaPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, RefreshCw, Save, X } from 'lucide-react';
import { 
  getJerarquias, 
  createJerarquia, 
  updateJerarquia, 
  deleteJerarquia,
  buscarAreas,
  buscarSecciones,
  buscarCargos,
  buscarTrabajadores,
} from '../../../services/vacaciones.service';
import type { Jerarquia, JerarquiaCreate, JerarquiaUpdate } from '../../../types/vacaciones.types';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { getErrorMessage } from '../../../services/error.service';
import { TIPO_RELACION_OPTIONS, ACTIVO_INACTIVO_OPTIONS } from '../../../types/vacaciones.types';
import AutocompleteSearch, { AutocompleteOption } from '../../../components/ui/AutocompleteSearch';

const JerarquiaPage: React.FC = () => {
  const [jerarquias, setJerarquias] = useState<Jerarquia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJerarquia, setEditingJerarquia] = useState<Jerarquia | null>(null);
  const [formData, setFormData] = useState<JerarquiaCreate>({
    codigo_trabajador_aprobador: '',
    tipo_relacion: 'J',
    nivel_jerarquico: 1,
    activo: 'S',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para los campos de búsqueda
  const [searchArea, setSearchArea] = useState('');
  const [searchSeccion, setSearchSeccion] = useState('');
  const [searchCargo, setSearchCargo] = useState('');
  const [searchTrabajador, setSearchTrabajador] = useState('');

  const fetchJerarquias = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getJerarquias(currentPage, limit);
      let jerarquiasData = response.jerarquias || [];
      
      // Enriquecer jerarquías con descripciones faltantes
      const jerarquiasEnriquecidas = await Promise.all(
        jerarquiasData.map(async (jerarquia) => {
          const enriquecida = { ...jerarquia };
          
          // Buscar descripción de área si no está disponible
          if (jerarquia.codigo_area && !jerarquia.area_nombre) {
            try {
              const areaResponse = await buscarAreas({ codigo: jerarquia.codigo_area.trim(), limit: 1 });
              if (areaResponse.items.length > 0) {
                enriquecida.area_nombre = areaResponse.items[0].descripcion;
              }
            } catch (error) {
              console.error('Error buscando área:', error);
            }
          }
          
          // Buscar descripción de sección si no está disponible
          if (jerarquia.codigo_seccion && !jerarquia.seccion_nombre) {
            try {
              const seccionResponse = await buscarSecciones({ codigo: jerarquia.codigo_seccion.trim(), limit: 1 });
              if (seccionResponse.items.length > 0) {
                enriquecida.seccion_nombre = seccionResponse.items[0].descripcion;
              }
            } catch (error) {
              console.error('Error buscando sección:', error);
            }
          }
          
          // Buscar descripción de cargo si no está disponible
          if (jerarquia.codigo_cargo && !jerarquia.cargo_nombre) {
            try {
              const cargoResponse = await buscarCargos({ codigo: jerarquia.codigo_cargo.trim(), limit: 1 });
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
      
      setJerarquias(jerarquiasEnriquecidas);
      setTotalPages(response.total_pages || 1);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar jerarquías');
      // Asegurar que siempre sea un array incluso en caso de error
      setJerarquias([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchJerarquias();
  }, [fetchJerarquias]);

  const handleOpenModal = async (jerarquia?: Jerarquia) => {
    if (jerarquia) {
      setEditingJerarquia(jerarquia);
      setFormData({
        codigo_area: jerarquia.codigo_area?.trim() || undefined,
        codigo_seccion: jerarquia.codigo_seccion?.trim() || undefined,
        codigo_cargo: jerarquia.codigo_cargo?.trim() || undefined,
        codigo_trabajador_aprobador: jerarquia.codigo_trabajador_aprobador,
        tipo_relacion: jerarquia.tipo_relacion,
        nivel_jerarquico: jerarquia.nivel_jerarquico,
        activo: jerarquia.activo,
        fecha_desde: jerarquia.fecha_desde,
        fecha_hasta: jerarquia.fecha_hasta || undefined,
        descripcion: jerarquia.descripcion || undefined,
      });
      
      // Buscar descripciones si no están disponibles
      let areaLabel = jerarquia.codigo_area?.trim() || '';
      let seccionLabel = jerarquia.codigo_seccion?.trim() || '';
      let cargoLabel = jerarquia.codigo_cargo?.trim() || '';
      
      // Buscar descripción de área si no está disponible
      if (jerarquia.codigo_area && !jerarquia.area_nombre) {
        try {
          const areaResponse = await buscarAreas({ codigo: jerarquia.codigo_area.trim(), limit: 1 });
          if (areaResponse.items.length > 0) {
            areaLabel = `${areaResponse.items[0].codigo} - ${areaResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando área:', error);
        }
      } else if (jerarquia.codigo_area && jerarquia.area_nombre) {
        areaLabel = `${jerarquia.codigo_area.trim()} - ${jerarquia.area_nombre}`;
      }
      
      // Buscar descripción de sección si no está disponible
      if (jerarquia.codigo_seccion && !jerarquia.seccion_nombre) {
        try {
          const seccionResponse = await buscarSecciones({ codigo: jerarquia.codigo_seccion.trim(), limit: 1 });
          if (seccionResponse.items.length > 0) {
            seccionLabel = `${seccionResponse.items[0].codigo} - ${seccionResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando sección:', error);
        }
      } else if (jerarquia.codigo_seccion && jerarquia.seccion_nombre) {
        seccionLabel = `${jerarquia.codigo_seccion.trim()} - ${jerarquia.seccion_nombre}`;
      }
      
      // Buscar descripción de cargo si no está disponible
      if (jerarquia.codigo_cargo && !jerarquia.cargo_nombre) {
        try {
          const cargoResponse = await buscarCargos({ codigo: jerarquia.codigo_cargo.trim(), limit: 1 });
          if (cargoResponse.items.length > 0) {
            cargoLabel = `${cargoResponse.items[0].codigo} - ${cargoResponse.items[0].descripcion}`;
          }
        } catch (error) {
          console.error('Error buscando cargo:', error);
        }
      } else if (jerarquia.codigo_cargo && jerarquia.cargo_nombre) {
        cargoLabel = `${jerarquia.codigo_cargo.trim()} - ${jerarquia.cargo_nombre}`;
      }
      
      setSearchArea(areaLabel);
      setSearchSeccion(seccionLabel);
      setSearchCargo(cargoLabel);
      
      const nombreAprobador = jerarquia.aprobador_nombre || jerarquia.nombre_aprobador;
      setSearchTrabajador(nombreAprobador 
        ? `${jerarquia.codigo_trabajador_aprobador} - ${nombreAprobador}` 
        : jerarquia.codigo_trabajador_aprobador);
    } else {
      setEditingJerarquia(null);
      setFormData({
        codigo_trabajador_aprobador: '',
        tipo_relacion: 'J',
        nivel_jerarquico: 1,
        activo: 'S',
      });
      // Limpiar campos de búsqueda
      setSearchArea('');
      setSearchSeccion('');
      setSearchCargo('');
      setSearchTrabajador('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJerarquia(null);
    setFormData({
      codigo_trabajador_aprobador: '',
      tipo_relacion: 'J',
      nivel_jerarquico: 1,
      activo: 'S',
    });
    // Limpiar campos de búsqueda
    setSearchArea('');
    setSearchSeccion('');
    setSearchCargo('');
    setSearchTrabajador('');
  };

  // Funciones de búsqueda para autocompletado
  const searchAreas = async (query: string): Promise<AutocompleteOption[]> => {
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
  };

  const searchSecciones = async (query: string): Promise<AutocompleteOption[]> => {
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
  };

  const searchCargos = async (query: string): Promise<AutocompleteOption[]> => {
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
  };

  const searchTrabajadores = async (query: string): Promise<AutocompleteOption[]> => {
    try {
      // Buscar por código si parece ser un código (solo números), sino por nombre
      const filters: any = {
        codigo_area: formData.codigo_area,
        limit: 20,
      };
      
      if (/^\d+$/.test(query.trim())) {
        filters.codigo = query.trim();
      } else {
        filters.nombre = query.trim();
      }
      
      const response = await buscarTrabajadores(filters);
      return response.items.map(item => ({
        value: item.codigo,
        label: `${item.codigo} - ${item.nombre_completo}`,
        subtitle: `${item.numero_dni || 'Sin DNI'}${item.codigo_area ? ` | Área: ${item.codigo_area}` : ''}`,
      }));
    } catch (error) {
      console.error('Error buscando trabajadores:', error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingJerarquia) {
        await updateJerarquia(editingJerarquia.id_jerarquia, formData as JerarquiaUpdate);
        toast.success('Jerarquía actualizada exitosamente');
      } else {
        await createJerarquia(formData);
        toast.success('Jerarquía creada exitosamente');
      }
      handleCloseModal();
      fetchJerarquias();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al guardar jerarquía');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro que desea eliminar esta jerarquía?')) return;

    try {
      await deleteJerarquia(id);
      toast.success('Jerarquía eliminada exitosamente');
      fetchJerarquias();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al eliminar jerarquía');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Jerarquías de Aprobación
        </h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Jerarquía
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprobador</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jerarquias && jerarquias.map((jerarquia) => (
                <tr key={jerarquia.id_jerarquia} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">
                    {jerarquia.codigo_area ? (
                      <>
                        {jerarquia.codigo_area.trim()}
                        {jerarquia.area_nombre && (
                          <span className="text-gray-500 ml-1">({jerarquia.area_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {jerarquia.codigo_seccion ? (
                      <>
                        {jerarquia.codigo_seccion.trim()}
                        {jerarquia.seccion_nombre && (
                          <span className="text-gray-500 ml-1">({jerarquia.seccion_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {jerarquia.codigo_cargo ? (
                      <>
                        {jerarquia.codigo_cargo.trim()}
                        {jerarquia.cargo_nombre && (
                          <span className="text-gray-500 ml-1">({jerarquia.cargo_nombre})</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Todos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {jerarquia.codigo_trabajador_aprobador}
                    {(jerarquia.aprobador_nombre || jerarquia.nombre_aprobador) && (
                      <span className="text-gray-500 ml-1">({jerarquia.aprobador_nombre || jerarquia.nombre_aprobador})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {TIPO_RELACION_OPTIONS.find(opt => opt.value === jerarquia.tipo_relacion)?.label}
                  </td>
                  <td className="px-4 py-3 text-sm">{jerarquia.nivel_jerarquico}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      jerarquia.activo === 'S' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {jerarquia.activo === 'S' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(jerarquia)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(jerarquia.id_jerarquia)}>
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
              {editingJerarquia ? 'Editar Jerarquía' : 'Nueva Jerarquía'}
            </DialogTitle>
            <DialogDescription>
              Configure la estructura de aprobación por área, sección o cargo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <AutocompleteSearch
                  label="Trabajador Aprobador"
                  value={searchTrabajador}
                  onChange={setSearchTrabajador}
                  onSelect={(option) => {
                    setFormData({ ...formData, codigo_trabajador_aprobador: option.value });
                    setSearchTrabajador(option.label);
                  }}
                  onSearch={searchTrabajadores}
                  placeholder="Buscar trabajador por código o nombre..."
                  required
                  minChars={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Relación *</label>
                <select
                  value={formData.tipo_relacion}
                  onChange={(e) => setFormData({ ...formData, tipo_relacion: e.target.value as 'J' | 'G' | 'D' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {TIPO_RELACION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nivel Jerárquico *</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.nivel_jerarquico}
                  onChange={(e) => setFormData({ ...formData, nivel_jerarquico: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
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

export default JerarquiaPage;
