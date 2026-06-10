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

// Helpers para ejercicios

export function EstadoEjercicioPill({
  fechaInicio,
  fechaEntrega,
  solucionPgn
}: {
  fechaInicio?: string | null;
  fechaEntrega?: string | null;
  solucionPgn?: string | null;
}) {
  if (!solucionPgn) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
        title="Añade la solución para que los alumnos puedan verlo">
        <AlertCircle className="w-2.5 h-2.5" /> Sin solución
      </span>
    );
  }

  const ahora = new Date();

  if (fechaInicio && new Date(fechaInicio) > ahora) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <Clock className="w-2.5 h-2.5" /> Próximamente
      </span>
    );
  }

  if (fechaEntrega && new Date(fechaEntrega) < ahora) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100">
        <CheckCircle2 className="w-2.5 h-2.5" /> Finalizado
      </span>
    );
  }

  // Activo solo si tiene ambas fechas; si falta alguna → "Sin fechas"
  if (!fechaInicio || !fechaEntrega) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <AlertCircle className="w-2.5 h-2.5" /> Sin fechas
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
      <PlayCircle className="w-2.5 h-2.5" /> Activo
    </span>
  );
}

export function EstadoAlumnoPill({
  estado,
  puntuacion,
}: {
  estado?: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';
  puntuacion?: number | null;
}) {
  if (!estado) return null;

  if (puntuacion !== null && puntuacion !== undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
        ★ Evaluado ({puntuacion}/5)
      </span>
    );
  }

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

// Tarjeta Carpeta

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
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar carpeta"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Tarjeta Database

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
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Fila Partida

export function FilaPartida({ archivo, esProfesor, onClick, onToggleVisibilidad, onEliminar, onFechaEntrega, selected, onToggleSelect }: any) {
  const metaEj = archivo.metadata_ejercicio;
  const partida = archivo.metadata?.partidas?.[0];

  const ahora = new Date();
  const esVencido = metaEj?.fecha_entrega ? ahora > new Date(metaEj.fecha_entrega) : false;
  const esFuturo = metaEj?.fecha_inicio  ? ahora < new Date(metaEj.fecha_inicio)  : false;

  const estaBloqueadoParaAlumno = !esProfesor && esFuturo;

  const handleClick = () => {
    if (estaBloqueadoParaAlumno) {
      alert(`Este ejercicio no estará disponible hasta el ${formatFecha(metaEj.fecha_inicio)}`);
      return;
    }
    if (onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative bg-white border rounded-xl px-5 py-4 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4
      ${selected ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'}
      ${estaBloqueadoParaAlumno ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:shadow-md hover:border-blue-200'}
      ${!archivo.visible ? 'opacity-70' : ''}`}
    >
      {/* Zona izquierda icono e info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">

        {/* Checkbox de selección múltiple */}
        {esProfesor && onToggleSelect && (
          <div
            onClick={e => { e.stopPropagation(); onToggleSelect(); }}
            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-slate-300 hover:border-blue-400 bg-white'
            }`}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}

        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors
          ${estaBloqueadoParaAlumno ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white'}`}>
          <FileText className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <p className={`font-bold truncate text-sm transition-colors ${estaBloqueadoParaAlumno ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600'}`}
            title={archivo.nombre}>
            {archivo.nombre}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {/* Nombre del profesor — mismo patrón que TarjetaCarpeta y TarjetaDatabase */}
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" />{nombreProfesor(archivo.usuarios)}
            </span>

            <CategoriaTag categoria={archivo.categoria} />

            {metaEj ? (
              <>
                <EstadoEjercicioPill
                  fechaInicio={metaEj.fecha_inicio}
                  fechaEntrega={metaEj.fecha_entrega}
                  solucionPgn={metaEj.solucion_pgn}
                />
                {esFuturo ? (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3" /> Disponible el: {formatFecha(metaEj.fecha_inicio)}
                  </span>
                ) : (metaEj.fecha_inicio && metaEj.fecha_entrega) ? (
                  <span className={`text-[11px] flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${esVencido ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    <Clock className="w-3 h-3" /> {esVencido ? 'Vencido' : `Vence: ${formatFecha(metaEj.fecha_entrega)}`}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{formatFecha(archivo.created_at)}
              </span>
            )}

            {esProfesor && <VisibilidadPill visible={archivo.visible} />}
          </div>
        </div>
      </div>

      {/* Zona derecha jugadores, estado del alumno y botones */}
      <div className="flex items-center flex-wrap gap-3 shrink-0">

        {/* Jugadores siempre que haya partida */}
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
        {!esProfesor && metaEj && !estaBloqueadoParaAlumno && (
          <EstadoAlumnoPill
            estado={metaEj.estado_alumno}
            puntuacion={metaEj.puntuacion_alumno}
          />
        )}

        {/* Botones del profesor */}
        {esProfesor && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onFechaEntrega && (
              <button
                onClick={e => { e.stopPropagation(); onFechaEntrega(); }}
                title="Establecer fechas"
                className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}
            <BtnVisibilidad visible={archivo.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
            <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo"
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}