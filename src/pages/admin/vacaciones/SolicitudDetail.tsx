// src/pages/admin/vacaciones/SolicitudDetail.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {   
  Calendar, 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  XSquare
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { getSolicitudById, anularSolicitud } from '../../../services/vacaciones.service';
import type { SolicitudWithDetails, EstadoSolicitud } from '../../../types/vacaciones.types';
import { getErrorMessage } from '../../../services/error.service';
import { ESTADO_SOLICITUD_OPTIONS, TIPO_SOLICITUD_OPTIONS } from '../../../types/vacaciones.types';

interface SolicitudDetailProps {
  solicitudId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAnulada?: () => void;
}

const SolicitudDetail: React.FC<SolicitudDetailProps> = ({ 
  solicitudId, 
  isOpen, 
  onClose,
  onAnulada 
}) => {
  const [solicitud, setSolicitud] = useState<SolicitudWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnularDialog, setShowAnularDialog] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);

  const fetchSolicitud = async () => {
    if (!solicitudId) return;
    
    setIsLoading(true);
    try {
      const data = await getSolicitudById(solicitudId);
      setSolicitud(data);
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al cargar detalle de solicitud');
      console.error('Error fetching solicitud:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && solicitudId) {
      fetchSolicitud();
    } else {
      setSolicitud(null);
      setMotivoAnulacion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, solicitudId]);

  const handleAnular = async () => {
    if (!solicitudId || !motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo de anulación');
      return;
    }

    setIsAnulando(true);
    try {
      await anularSolicitud(solicitudId, motivoAnulacion.trim());
      toast.success('Solicitud anulada exitosamente');
      setShowAnularDialog(false);
      setMotivoAnulacion('');
      if (onAnulada) {
        onAnulada();
      }
      onClose();
    } catch (error) {
      const errorInfo = getErrorMessage(error);
      toast.error(errorInfo.message || 'Error al anular solicitud');
      console.error('Error anulando solicitud:', error);
    } finally {
      setIsAnulando(false);
    }
  };

  const getEstadoBadgeClass = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'P':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'A':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'R':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'N':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoLabel = (estado: EstadoSolicitud) => {
    return ESTADO_SOLICITUD_OPTIONS.find(opt => opt.value === estado)?.label || estado;
  };

  const getTipoLabel = (tipo: string) => {
    return TIPO_SOLICITUD_OPTIONS.find(opt => opt.value === tipo)?.label || tipo;
  };

  const getEstadoIcon = (estado: EstadoSolicitud) => {
    switch (estado) {
      case 'P':
        return <Clock className="w-5 h-5" />;
      case 'A':
        return <CheckCircle className="w-5 h-5" />;
      case 'R':
        return <XCircle className="w-5 h-5" />;
      case 'N':
        return <XSquare className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalle de Solicitud #{solicitudId}
            </DialogTitle>
            <DialogDescription>
              Información completa de la solicitud de vacaciones o permiso
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando detalles...</p>
            </div>
          ) : solicitud ? (
            <div className="space-y-6">
              {/* Información Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Trabajador</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {solicitud.codigo_trabajador}
                  </div>
                  {solicitud.trabajador_nombre && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {solicitud.trabajador_nombre}
                    </div>
                  )}
                  {solicitud.trabajador_dni && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      DNI: {solicitud.trabajador_dni}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {getTipoLabel(solicitud.tipo_solicitud)}
                  </div>
                  {solicitud.codigo_permiso && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Código: {solicitud.codigo_permiso}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Período</span>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <div>Desde: {new Date(solicitud.fecha_inicio).toLocaleDateString('es-PE', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                    <div className="mt-1">Hasta: {new Date(solicitud.fecha_fin).toLocaleDateString('es-PE', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Días solicitados: {solicitud.dias_solicitados}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getEstadoIcon(solicitud.estado)}
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</span>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeClass(solicitud.estado)}`}>
                    {getEstadoLabel(solicitud.estado)}
                  </span>
                </div>
              </div>

              {/* Información del Trabajador */}
              {(solicitud.trabajador_area || solicitud.trabajador_seccion || solicitud.trabajador_cargo) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Información del Trabajador
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {solicitud.trabajador_area && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Área: </span>
                        <span className="text-gray-900 dark:text-gray-100">{solicitud.trabajador_area}</span>
                      </div>
                    )}
                    {solicitud.trabajador_seccion && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Sección: </span>
                        <span className="text-gray-900 dark:text-gray-100">{solicitud.trabajador_seccion}</span>
                      </div>
                    )}
                    {solicitud.trabajador_cargo && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Cargo: </span>
                        <span className="text-gray-900 dark:text-gray-100">{solicitud.trabajador_cargo}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {solicitud.observacion && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Observaciones
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    {solicitud.observacion}
                  </div>
                </div>
              )}

              {/* Aprobaciones */}
              {solicitud.aprobaciones && solicitud.aprobaciones.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Historial de Aprobaciones
                  </h3>
                  <div className="space-y-2">
                    {solicitud.aprobaciones.map((aprobacion) => (
                      <div 
                        key={aprobacion.id_aprobacion}
                        className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border-l-4 border-indigo-500"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                Nivel {aprobacion.nivel}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadgeClass(aprobacion.estado as EstadoSolicitud)}`}>
                                {getEstadoLabel(aprobacion.estado as EstadoSolicitud)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              Aprobador: {aprobacion.codigo_trabajador_aprueba}
                              {aprobacion.aprobador_nombre && (
                                <span className="text-gray-500 ml-1">({aprobacion.aprobador_nombre})</span>
                              )}
                            </div>
                            {aprobacion.observacion && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {aprobacion.observacion}
                              </div>
                            )}
                            {aprobacion.fecha && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(aprobacion.fecha).toLocaleString('es-PE')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de Anulación */}
              {solicitud.estado === 'N' && solicitud.motivo_anulacion && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                    Información de Anulación
                  </h3>
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <div className="mb-1">
                      <strong>Motivo:</strong> {solicitud.motivo_anulacion}
                    </div>
                    {solicitud.fecha_anulacion && (
                      <div>
                        <strong>Fecha:</strong> {new Date(solicitud.fecha_anulacion).toLocaleString('es-PE')}
                      </div>
                    )}
                    {solicitud.usuario_anulacion && (
                      <div>
                        <strong>Usuario:</strong> {solicitud.usuario_anulacion}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información de Auditoría */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Información de Auditoría
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>Fecha de registro:</strong> {new Date(solicitud.fecha_registro).toLocaleString('es-PE')}
                  </div>
                  {solicitud.usuario_registro && (
                    <div>
                      <strong>Usuario registro:</strong> {solicitud.usuario_registro}
                    </div>
                  )}
                  {solicitud.fecha_modificacion && (
                    <div>
                      <strong>Última modificación:</strong> {new Date(solicitud.fecha_modificacion).toLocaleString('es-PE')}
                    </div>
                  )}
                  {solicitud.usuario_modificacion && (
                    <div>
                      <strong>Usuario modificación:</strong> {solicitud.usuario_modificacion}
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              {solicitud.estado !== 'N' && (
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="destructive"
                    onClick={() => setShowAnularDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <XSquare className="w-4 h-4" />
                    Anular Solicitud
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">No se pudo cargar la información</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para anular */}
      <Dialog open={showAnularDialog} onOpenChange={setShowAnularDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Solicitud</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea anular esta solicitud? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo de Anulación *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ingrese el motivo de anulación..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAnularDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnular}
                disabled={!motivoAnulacion.trim() || isAnulando}
              >
                {isAnulando ? 'Anulando...' : 'Confirmar Anulación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SolicitudDetail;
