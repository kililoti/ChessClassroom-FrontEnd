'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Target } from 'lucide-react';
import TablonObjetivosCard from '@/components/objetivos/TablonObjetivosCard';
import ModalNuevoTablon from '@/components/objetivos/ModalNuevoTablon';
import { TablonObjetivos } from '@/types/objetivos';

interface Alumno {
  id: string;
  nombre: string;
  apellidos: string;
}

export default function ObjetivosPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: claseId } = React.use(params);

  const [tablones, setTablenes] = useState<TablonObjetivos[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<string>('');
  const [esProfesor, setEsProfesor] = useState(false);
  const [miId, setMiId] = useState<string>(''); // ← ID del alumno logueado
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [inicializado, setInicializado] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    const inicializar = async () => {
      try {
        if (!token) { router.push('/login'); return; }

        const usuarioGuardado = localStorage.getItem('usuario');
        if (!usuarioGuardado) { router.push('/login'); return; }

        const usuario = JSON.parse(usuarioGuardado);
        const esProf = usuario.rol === 'profesor';
        setEsProfesor(esProf);

        if (esProf) {
          // Profesor → cargar lista de alumnos
          const resAlumnos = await fetch(
            `http://localhost:3001/api/clases/${claseId}/alumnos`,
            { headers }
          );
          if (resAlumnos.ok) {
            const dataAlumnos = await resAlumnos.json();
            setAlumnos(dataAlumnos);
          }
        } else {
          // Alumno → guardar su propio ID
          setMiId(usuario.id);
        }
      } catch (err) {
        console.error('Error al inicializar:', err);
      } finally {
        setInicializado(true);
      }
    };
    inicializar();
  }, [claseId]);

  const cargarTablenes = useCallback(async () => {
    if (!inicializado) return;

    // Alumno siempre usa su propio ID
    // Profesor usa el alumno seleccionado (vacío = grupo completo)
    const idParaQuery = esProfesor ? alumnoSeleccionado : miId;

    // Si es alumno y aún no tenemos su ID, esperamos
    if (!esProfesor && !miId) return;

    try {
      setCargando(true);
      const url = idParaQuery
        ? `http://localhost:3001/api/objetivos/tablones/${claseId}?alumnoId=${idParaQuery}`
        : `http://localhost:3001/api/objetivos/tablones/${claseId}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      setTablenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar tablones:', err);
    } finally {
      setCargando(false);
    }
  }, [claseId, alumnoSeleccionado, esProfesor, inicializado, miId]);

  useEffect(() => {
    cargarTablenes();
  }, [cargarTablenes]);

  // ── Handlers ──────────────────────────────────────────────

  const handleCrearTablon = async (titulo: string, descripcion: string, fechaLimite: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/tablones`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clase_id: claseId,
          alumno_id: alumnoSeleccionado || null,
          titulo,
          descripcion: descripcion || null,
          fecha_limite: fechaLimite || null,
        }),
      });
      setMostrarModal(false);
      cargarTablenes();
    } catch (err) {
      console.error('Error al crear tablón:', err);
    }
  };

  const handleEliminarTablon = async (tablonId: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/tablones/${tablonId}`, {
        method: 'DELETE',
        headers,
      });
      cargarTablenes();
    } catch (err) {
      console.error('Error al eliminar tablón:', err);
    }
  };

  const handleAnadirObjetivo = async (tablonId: string, titulo: string, fechaLimite: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/${tablonId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titulo,
          fecha_limite: fechaLimite || null,
        }),
      });
      cargarTablenes();
    } catch (err) {
      console.error('Error al añadir objetivo:', err);
    }
  };

  const handleAnadirObjetivoGrupal = async (tablonTitulo: string, titulo: string, fechaLimite: string) => {
    try {
      await fetch(
        `http://localhost:3001/api/objetivos/grupo/${claseId}/${encodeURIComponent(tablonTitulo)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            titulo,
            fecha_limite: fechaLimite || null,
          }),
        }
      );
      cargarTablenes();
    } catch (err) {
      console.error('Error al añadir objetivo grupal:', err);
    }
  };

  const handleToggleObjetivo = async (objetivoId: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/${objetivoId}/toggle`, {
        method: 'PATCH',
        headers,
      });
      cargarTablenes();
    } catch (err) {
      console.error('Error al hacer toggle del objetivo:', err);
    }
  };

  const handleEliminarObjetivo = async (objetivoId: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/${objetivoId}`, {
        method: 'DELETE',
        headers,
      });
      cargarTablenes();
    } catch (err) {
      console.error('Error al eliminar objetivo:', err);
    }
  };

  const handleEditarTablon = async (tablonId: string, titulo: string, descripcion: string, fechaLimite: string) => {
    try {
      await fetch(`http://localhost:3001/api/objetivos/tablones/${tablonId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          titulo,
          descripcion: descripcion || null,
          fecha_limite: fechaLimite || null,
        }),
      });
      cargarTablenes();
    } catch (err) {
      console.error('Error al editar tablón:', err);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-rose-500" /> Objetivos
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {esProfesor
                  ? alumnoSeleccionado
                    ? `${alumnos.find(a => a.id === alumnoSeleccionado)?.nombre ?? ''} ${alumnos.find(a => a.id === alumnoSeleccionado)?.apellidos ?? ''}`
                    : 'Grupo completo'
                  : 'Mis objetivos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de alumno — solo profesor */}
            {esProfesor && alumnos.length > 0 && (
              <select
                value={alumnoSeleccionado}
                onChange={(e) => setAlumnoSeleccionado(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-700"
              >
                <option value="">Grupo completo</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellidos}
                  </option>
                ))}
              </select>
            )}

            {/* Botón nuevo tablón — solo profesor */}
            {esProfesor && (
              <button
                onClick={() => setMostrarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo tablón
              </button>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-20 text-slate-400 animate-pulse">Cargando objetivos...</div>
        ) : tablones.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No hay tablones de objetivos todavía.</p>
            {esProfesor && (
              <p className="text-sm text-slate-400 mt-1">
                {alumnoSeleccionado
                  ? 'Crea un tablón individual para este alumno.'
                  : 'Crea un tablón grupal para asignarlo a todos los alumnos.'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tablones.map(tablon => (
              <TablonObjetivosCard
                key={tablon.id}
                tablon={tablon}
                esProfesor={esProfesor}
                esVistaGrupal={esProfesor && !alumnoSeleccionado}
                claseId={claseId}
                onToggleObjetivo={handleToggleObjetivo}
                onEliminarObjetivo={handleEliminarObjetivo}
                onAnadirObjetivo={handleAnadirObjetivo}
                onAnadirObjetivoGrupal={handleAnadirObjetivoGrupal}
                onEliminarTablon={handleEliminarTablon}
                onEditarTablon={handleEditarTablon}
              />
            ))}
          </div>
        )}
      </div>

      {mostrarModal && (
        <ModalNuevoTablon
          claseId={claseId}
          alumnoId={alumnoSeleccionado || null}
          onCrear={handleCrearTablon}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  );
}