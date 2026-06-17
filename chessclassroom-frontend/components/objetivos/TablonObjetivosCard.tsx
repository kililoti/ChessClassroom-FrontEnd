'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Calendar, Pencil } from 'lucide-react';
import ObjetivoItem from './ObjetivoItem';
import FormNuevoObjetivo from './FormNuevoObjetivo';
import ModalEditarTablon from './ModalEditarTablon';
import { TablonObjetivos } from '@/types/objetivos';

interface Props {
  tablon: TablonObjetivos;
  esProfesor: boolean;
  esVistaGrupal: boolean;
  claseId: string;
  onToggleObjetivo: (id: string) => void;
  onEliminarObjetivo: (id: string) => void;
  onAnadirObjetivo: (tablonId: string, titulo: string, fechaLimite: string) => void;
  onAnadirObjetivoGrupal: (tablonTitulo: string, titulo: string, fechaLimite: string) => void;
  onEliminarTablon: (id: string) => void;
  onEditarTablon: (tablonId: string, titulo: string, descripcion: string, fechaLimite: string) => void;
}

export default function TablonObjetivosCard({
  tablon, esProfesor, esVistaGrupal, claseId, onToggleObjetivo, onEliminarObjetivo,
  onAnadirObjetivo, onAnadirObjetivoGrupal, onEliminarTablon, onEditarTablon
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  const completados = tablon.objetivos.filter(o => o.completado).length;
  const total = tablon.objetivos.length;

  return (
    <>
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">

        {/* Cabecera */}
        <div
          className="flex items-center justify-between px-5 py-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => setAbierto(!abierto)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-slate-400 flex-shrink-0">
              {abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 truncate block">{tablon.titulo}</span>
              {tablon.fecha_limite && (
                <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(tablon.fecha_limite).toLocaleDateString('es-ES')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {total > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {completados}/{total}
                </span>
            )}
            {esProfesor && (
                <>
                <button
                    onClick={(e) => { e.stopPropagation(); setMostrarModalEditar(true); }}
                    className="text-slate-300 hover:text-blue-400 transition-colors cursor-pointer"
                    title="Editar tablón"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onEliminarTablon(tablon.id); }}
                    className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                    title="Eliminar tablón"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                </>
            )}
            </div>
        </div>

        {/* Contenido desplegable */}
        {abierto && (
            <div className="px-5 py-4 space-y-2">
                {tablon.descripcion && (
                <p className="text-sm text-slate-500 italic pb-2 border-b border-slate-100">
                    {tablon.descripcion}
                </p>
                )}

                {tablon.objetivos.length === 0 && !mostrarForm && (
                <p className="text-sm text-slate-400 py-2 text-center">No hay objetivos en este tablón.</p>
                )}

                {tablon.objetivos.map(obj => (
                <ObjetivoItem
                    key={obj.id}
                    objetivo={obj}
                    esProfesor={esProfesor}
                    onToggle={onToggleObjetivo}
                    onEliminar={onEliminarObjetivo}
                />
                ))}

                {esProfesor && (
                mostrarForm ? (
                    <FormNuevoObjetivo
                    onGuardar={(titulo, fecha) => {
                        if (esVistaGrupal) {
                        onAnadirObjetivoGrupal(tablon.titulo, titulo, fecha);
                        } else {
                        onAnadirObjetivo(tablon.id, titulo, fecha);
                        }
                        setMostrarForm(false);
                    }}
                    onCancelar={() => setMostrarForm(false)}
                    />
                ) : (
                    <button
                    onClick={() => setMostrarForm(true)}
                    className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-700 mt-1 transition-colors cursor-pointer"
                    >
                    <Plus className="w-4 h-4" />
                    {esVistaGrupal ? 'Añadir objetivo a todos' : 'Añadir objetivo'}
                    </button>
                )
                )}
            </div>
            )}
      </div>

      {/* Modal editar — fuera del div principal para evitar problemas de z-index */}
      {mostrarModalEditar && (
        <ModalEditarTablon
          tablon={tablon}
          onGuardar={(titulo, descripcion, fechaLimite) => {
            onEditarTablon(tablon.id, titulo, descripcion, fechaLimite);
            setMostrarModalEditar(false);
          }}
          onCerrar={() => setMostrarModalEditar(false)}
        />
      )}
    </>
  );
}