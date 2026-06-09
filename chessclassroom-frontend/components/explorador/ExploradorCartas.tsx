// TarjetaCarpeta, TarjetaDatabase, FilaPartida y helpers visuales compartidos
'use client';

import { Folder, Database, FileText, Calendar, User, Eye, EyeOff, Tag, Trash2, Clock, CheckCircle2, PlayCircle, AlertCircle } from 'lucide-react';
import { Carpeta, Archivo, Categoria, CATEGORIA_LABELS, formatFecha, nombreProfesor } from '@/types/explorador';

// Helpers visuales

export function VisibilidadPill({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
      <Eye className="w-2.5 h-2.5" /> Visible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
      <EyeOff className="w-2.5 h-2.5" /> Oculto
    </span>
  );
}

export function CategoriaTag({ categoria }: { categoria?: Categoria }) {
  if (!categoria || !CATEGORIA_LABELS[categoria]) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
      Sin categoría
    </span>
  );
  const { label, color } = CATEGORIA_LABELS[categoria];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      <Tag className="w-2.5 h-2.5" />{label}
    </span>
  );
}

export function BtnVisibilidad({ visible, onClick }: {
  visible: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={visible ? 'Ocultar para alumnos' : 'Hacer visible para alumnos'}
      className={`p-1.5 rounded-lg transition-all cursor-pointer ${visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </button>
  );
}

// Helpers para Ejercicios

export function EstadoEjercicioPill({ fechaEntrega, solucionGuardada }: { fechaEntrega?: string | null; solucionGuardada?: boolean }) {
  if (!fechaEntrega || !solucionGuardada) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200" title="Falta establecer la fecha o grabar la solución para asignar a los alumnos.">
        <AlertCircle className="w-2.5 h-2.5" /> Inactivo
      </span>
    );
  }

  const superado = new Date() > new Date(fechaEntrega);

  if (superado) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100" title="La fecha de entrega ha pasado.">
        <CheckCircle2 className="w-2.5 h-2.5" /> Finalizado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100" title="Asignado a los alumnos y dentro del plazo.">
      <PlayCircle className="w-2.5 h-2.5" /> Activo
    </span>
  );
}

export function EstadoAlumnoPill({ estado }: { estado?: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO' }) {
  if (!estado) return null;

  switch (estado) {
    case 'COMPLETADO':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <CheckCircle2 className="w-2.5 h-2.5" /> Completado
        </span>
      );
    case 'EN_PROGRESO':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <Clock className="w-2.5 h-2.5" /> En Progreso
        </span>
      );
    case 'NO_INICIADO':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          <AlertCircle className="w-2.5 h-2.5" /> No Iniciado
        </span>
      );
  }
}

// Tarjetas
export function TarjetaCarpeta({ carpeta, esProfesor, onClick, onEliminar, onToggleVisibilidad }: {
  carpeta: Carpeta;
  esProfesor: boolean;
  onClick: () => void;
  onEliminar: () => void;
  onToggleVisibilidad: () => void;
}) {
  return (
    <div className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${!carpeta.visible ? 'opacity-70' : 'hover:border-amber-300'} border-slate-200`}>
      <button onClick={onClick} className="flex items-center gap-4 w-full text-left cursor-pointer">
        <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
          <Folder className="w-6 h-6" />
        </div>
        <div className="overflow-hidden min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors" title={carpeta.nombre}>{carpeta.nombre}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{nombreProfesor(carpeta.usuarios)}</span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatFecha(carpeta.created_at)}</span>
          </div>
          {esProfesor && <div className="mt-1.5"><VisibilidadPill visible={carpeta.visible} /></div>}
        </div>
      </button>

      {esProfesor && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <BtnVisibilidad visible={carpeta.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar carpeta" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function TarjetaDatabase({ archivo, esProfesor, onClick, onToggleVisibilidad, onEliminar }: {
  archivo: Archivo;
  esProfesor: boolean;
  onClick: () => void;
  onToggleVisibilidad: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${!archivo.visible ? 'opacity-70' : 'hover:border-violet-300'} border-slate-200`}>
      <button onClick={onClick} className="w-full text-left flex items-center gap-4 cursor-pointer">
        <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-violet-50 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all shadow-sm">
          <Database className="w-6 h-6" />
        </div>
        <div className="overflow-hidden min-w-0 flex-1 pr-12">
          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors" title={archivo.nombre}>{archivo.nombre}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{nombreProfesor(archivo.usuarios)}</span>
            <span className="text-[11px] text-violet-600 font-semibold">{archivo.metadata.total_partidas} partidas</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatFecha(archivo.created_at)}</span>
            {esProfesor && <VisibilidadPill visible={archivo.visible} />}
          </div>
        </div>
      </button>

      {esProfesor && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <BtnVisibilidad visible={archivo.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Fila Partida

export function FilaPartida({ archivo, esProfesor, onClick, onToggleVisibilidad, onEliminar, onFechaEntrega }: {
  archivo: Archivo;
  esProfesor: boolean;
  onClick?: () => void;
  onToggleVisibilidad: () => void;
  onEliminar: () => void;
  onFechaEntrega?: () => void;
}) {
  const partida = archivo.metadata?.partidas?.[0];
  
  const metaEj = archivo.metadata_ejercicio;
  const esModuloEjercicio = !!onFechaEntrega || !!metaEj;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer ${!archivo.visible ? 'opacity-70' : 'hover:border-blue-200'} border-slate-200`}
    >
      {/* Zona Izquierda: Icono e Info Básica */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors text-sm" title={archivo.nombre}>{archivo.nombre}</p>
          
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <CategoriaTag categoria={archivo.categoria} />
            
            {esModuloEjercicio ? (
              <>
                <EstadoEjercicioPill 
                  fechaEntrega={metaEj?.fecha_entrega} 
                  solucionGuardada={!!metaEj?.solucion_pgn} 
                />
                {metaEj?.fecha_entrega && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> Vence: {formatFecha(metaEj.fecha_entrega)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatFecha(archivo.created_at)}</span>
            )}

            {esProfesor && <VisibilidadPill visible={archivo.visible} />}
          </div>
        </div>
      </div>

      {/* Zona Derecha: Jugadores, Estado del Alumno y Botones */}
      <div className="flex items-center flex-wrap gap-3 shrink-0">
        {partida && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 inline-block" />{partida.blancas}
              </span>
              <span className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" />{partida.negras}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <span className="text-sm font-black text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm min-w-[40px] text-center">
              {partida.resultado}
            </span>
          </div>
        )}

        {/* Estado personal del alumno */}
        {!esProfesor && esModuloEjercicio && metaEj?.estado_alumno && (
          <EstadoAlumnoPill estado={metaEj.estado_alumno} />
        )}

        {/* Botones de acción del profesor */}
        {esProfesor && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onFechaEntrega && (
              <button
                onClick={e => { e.stopPropagation(); onFechaEntrega(); }}
                title="Establecer fecha de entrega"
                className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}
            <BtnVisibilidad visible={archivo.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
            <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}