'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CalendarDays } from 'lucide-react';
import CalendarioMensual from '@/components/rutinas/CalendarioMensual';
import ChecklistRutinas from '@/components/rutinas/ChecklistRutinas';
import ModalNuevoEvento from '@/components/rutinas/ModalNuevoEvento';
import { EventoCalendario, RutinaChecklist } from '@/types/rutinas';

interface Alumno {
  id: string;
  nombre: string;
  apellidos: string;
}

const getLunes = (fecha: Date): string => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

export default function RutinasPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: claseId } = React.use(params);

  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [rutinas, setRutinas] = useState<RutinaChecklist[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [esProfesor, setEsProfesor] = useState(false);
  const [miId, setMiId] = useState('');
  const [mostrarModalEvento, setMostrarModalEvento] = useState(false);
  const [semanaActual, setSemanaActual] = useState(getLunes(new Date()));
  const [inicializado, setInicializado] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
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
          const res = await fetch(`http://localhost:3001/api/clases/${claseId}/alumnos`, { headers });
          if (res.ok) setAlumnos(await res.json());
        } else {
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

  const idParaQuery = esProfesor ? alumnoSeleccionado : miId;

  // ── Navegación de semanas ──────────────────────────────
  const semanaAnterior = () => {
    const d = new Date(semanaActual + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setSemanaActual(d.toISOString().split('T')[0]);
  };

  const semanaSiguiente = () => {
    const d = new Date(semanaActual + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setSemanaActual(d.toISOString().split('T')[0]);
  };

  const volverSemanaActual = () => {
    setSemanaActual(getLunes(new Date()));
  };

  // ── Cargar eventos ─────────────────────────────────────
  const cargarEventos = useCallback(async () => {
    if (!inicializado) return;
    if (!esProfesor && !miId) return;
    try {
      const url = idParaQuery
        ? `http://localhost:3001/api/rutinas/eventos/${claseId}?alumnoId=${idParaQuery}`
        : `http://localhost:3001/api/rutinas/eventos/${claseId}`;
      const res = await fetch(url, { headers });
      if (res.ok) setEventos(await res.json());
    } catch (err) {
      console.error('Error al cargar eventos:', err);
    }
  }, [claseId, idParaQuery, inicializado, esProfesor, miId]);

  // ── Cargar checklist ───────────────────────────────────
  const cargarRutinas = useCallback(async () => {
    if (!inicializado) return;
    if (!esProfesor && !miId) return;
    try {
      const url = idParaQuery
        ? `http://localhost:3001/api/rutinas/checklist/${claseId}?alumnoId=${idParaQuery}&semanaInicio=${semanaActual}`
        : `http://localhost:3001/api/rutinas/checklist/${claseId}`;
      const res = await fetch(url, { headers });
      if (res.ok) setRutinas(await res.json());
    } catch (err) {
      console.error('Error al cargar rutinas:', err);
    }
  }, [claseId, idParaQuery, semanaActual, inicializado, esProfesor, miId]);

  useEffect(() => { cargarEventos(); }, [cargarEventos]);
  useEffect(() => { cargarRutinas(); }, [cargarRutinas]);

  // ── Handlers ───────────────────────────────────────────

  const handleCrearEvento = async (evento: any) => {
    try {
      await fetch(`http://localhost:3001/api/rutinas/eventos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...evento,
          clase_id: claseId,
          alumno_id: alumnoSeleccionado || null,
        }),
      });
      setMostrarModalEvento(false);
      cargarEventos();
    } catch (err) {
      console.error('Error al crear evento:', err);
    }
  };

  const handleEliminarEvento = async (eventoId: string, soloEste: boolean, desdeGrupo: boolean) => {
    try {
      await fetch(
        `http://localhost:3001/api/rutinas/eventos/${eventoId}?soloEste=${soloEste}&desdeGrupo=${desdeGrupo}`,
        { method: 'DELETE', headers }
      );
      cargarEventos();
    } catch (err) {
      console.error('Error al eliminar evento:', err);
    }
  };

  const handleCrearRutina = async (titulo: string) => {
    try {
      await fetch(`http://localhost:3001/api/rutinas/checklist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clase_id: claseId,
          alumno_id: alumnoSeleccionado || null,
          titulo,
        }),
      });
      cargarRutinas();
    } catch (err) {
      console.error('Error al crear rutina:', err);
    }
  };

  const handleEliminarRutina = async (rutinaId: string) => {
    try {
      await fetch(`http://localhost:3001/api/rutinas/checklist/${rutinaId}`, { method: 'DELETE', headers });
      cargarRutinas();
    } catch (err) {
      console.error('Error al eliminar rutina:', err);
    }
  };

  const handleToggleRutina = async (semanaId: string) => {
    try {
      await fetch(`http://localhost:3001/api/rutinas/checklist/${semanaId}/toggle`, { method: 'PATCH', headers });
      cargarRutinas();
    } catch (err) {
      console.error('Error al toggle rutina:', err);
    }
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Cabecera */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-blue-500" /> Rutinas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {esProfesor
                  ? alumnoSeleccionado
                    ? `${alumnos.find(a => a.id === alumnoSeleccionado)?.nombre ?? ''} ${alumnos.find(a => a.id === alumnoSeleccionado)?.apellidos ?? ''}`
                    : 'Grupo completo'
                  : 'Mi calendario'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {esProfesor && alumnos.length > 0 && (
              <select
                value={alumnoSeleccionado}
                onChange={e => setAlumnoSeleccionado(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700"
              >
                <option value="">Grupo completo</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>
                ))}
              </select>
            )}

            {esProfesor && (
              <button
                onClick={() => setMostrarModalEvento(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo evento
              </button>
            )}
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <CalendarioMensual
              eventos={eventos}
              rutinas={rutinas}
              esProfesor={esProfesor}
              esVistaGrupal={esProfesor && !alumnoSeleccionado}
              onEliminar={handleEliminarEvento}
            />
          </div>

          <div className="lg:col-span-4">
            <ChecklistRutinas
              rutinas={rutinas}
              esProfesor={esProfesor}
              semanaActual={semanaActual}
              onToggle={handleToggleRutina}
              onEliminar={handleEliminarRutina}
              onCrear={handleCrearRutina}
              onSemanaAnterior={semanaAnterior}
              onSemanaSiguiente={semanaSiguiente}
              onVolverHoy={volverSemanaActual}
            />
          </div>
        </div>
      </div>

      {mostrarModalEvento && (
        <ModalNuevoEvento
          claseId={claseId}
          alumnoId={alumnoSeleccionado || null}
          onCrear={handleCrearEvento}
          onCerrar={() => setMostrarModalEvento(false)}
        />
      )}
    </div>
  );
}