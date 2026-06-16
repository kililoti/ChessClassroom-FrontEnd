'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Swords, Plus, Clock, CheckCircle, History, Filter } from 'lucide-react';
import TarjetaPartida from '@/components/partidas/TarjetaPartida';
import ModalCrearPartida from '@/components/partidas/ModalCrearPartida';
import { usePartidasRealtime } from '@/hooks/usePartidaRealtime';
import type { Partida } from '@/types/partidas';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  rol: string;
}

export default function PartidasPage() {
  const params  = useParams();
  const router  = useRouter();
  const claseId = params.id as string;

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  const [tab, setTab]                       = useState<'activas' | 'historial'>('activas');
  const [partidas, setPartidas]             = useState<Partida[]>([]);
  const [loading, setLoading]               = useState(true);
  const [modalCrear, setModalCrear]         = useState(false);
  
  const [miembros, setMiembros]             = useState<Usuario[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('todos');

  const fetchPartidas = useCallback(async () => {
    setLoading(true);
    try {
      const historial = tab === 'historial';
      const res = await fetch(`${API}/partidas/clase/${claseId}?historial=${historial}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (res.ok) setPartidas(d.partidas ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [claseId, tab]);

  useEffect(() => {
    fetch(`${API}/clases/${claseId}/miembros`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setMiembros(d.miembros ?? d.data ?? []))
      .catch(() => {});
  }, [claseId]);

  useEffect(() => { fetchPartidas(); }, [fetchPartidas]);

  // Actualización en tiempo real: recarga la lista cuando cambia cualquier partida de la clase
  usePartidasRealtime({ claseId, onCambio: fetchPartidas });

  const misPartidas = partidas.filter(p =>
    p.jugador_blancas_id === usuario?.id || p.jugador_negras_id === usuario?.id
  );
  const otrasPartidas = partidas.filter(p =>
    p.jugador_blancas_id !== usuario?.id && p.jugador_negras_id !== usuario?.id
  );
  const esperando = otrasPartidas.filter(p => p.estado === 'esperando');
  const iniciadas = otrasPartidas.filter(p => p.estado === 'iniciada');

  const partidasHistorialFiltradas = partidas.filter(p => {
    if (filtroUsuarioId === 'todos') return true;
    return p.jugador_blancas_id === filtroUsuarioId || p.jugador_negras_id === filtroUsuarioId;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Cabecera */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/clases/${claseId}`)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Swords className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Partidas</h1>
                <p className="text-sm text-slate-500">Juega en vivo contra otros</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva partida
          </button>
        </div>

        {/* Contenedor centralizado para las listas */}
        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
              <button
                onClick={() => { setTab('activas'); setFiltroUsuarioId('todos'); }} // Resetea filtro al volver
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'activas' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2"><Swords className="w-4 h-4" /> Activas</span>
              </button>
              <button
                onClick={() => setTab('historial')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'historial' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2"><History className="w-4 h-4" /> Historial</span>
              </button>
            </div>

            {tab === 'historial' && miembros.length > 0 && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto animate-in fade-in duration-200">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer pr-4"
                  value={filtroUsuarioId}
                  onChange={(e) => setFiltroUsuarioId(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {miembros.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.apellidos} {m.rol === 'profesor' ? '(Profesor)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">Cargando partidas...</div>
          ) : tab === 'activas' ? (
            <div className="space-y-8">

              {/* Mis partidas */}
              {misPartidas.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" /> Mis partidas
                  </h2>
                  <div className="space-y-3">
                    {misPartidas.map(p => (
                      <TarjetaPartida
                        key={p.id}
                        partida={p}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}`)}
                        onEliminada={fetchPartidas}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Partidas en espera */}
              {esperando.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> En espera de jugador
                  </h2>
                  <div className="space-y-3">
                    {esperando.map(p => (
                      <TarjetaPartida
                        key={p.id}
                        partida={p}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}`)}
                        onEliminada={fetchPartidas}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Partidas iniciadas (espectador) */}
              {iniciadas.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-blue-500" /> Activas — puedes espectar
                  </h2>
                  <div className="space-y-3">
                    {iniciadas.map(p => (
                      <TarjetaPartida
                        key={p.id}
                        partida={p}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}`)}
                        onEliminada={fetchPartidas}
                      />
                    ))}
                  </div>
                </section>
              )}

              {misPartidas.length === 0 && esperando.length === 0 && iniciadas.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Swords className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay partidas activas</p>
                  <p className="text-sm mt-1">¡Crea una nueva partida para empezar!</p>
                </div>
              )}
            </div>
          ) : (
            // Historial con filtro aplicado
            <div className="space-y-3">
              {partidasHistorialFiltradas.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {filtroUsuarioId === 'todos' 
                      ? 'No hay partidas finalizadas' 
                      : 'Este participante no tiene partidas finalizadas registradas'}
                  </p>
                </div>
              ) : (
                partidasHistorialFiltradas.map(p => (
                  <TarjetaPartida
                    key={p.id}
                    partida={p}
                    usuarioId={usuario?.id}
                    esProfesor={esProfesor}
                    onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}`)}
                    onEliminada={fetchPartidas}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {modalCrear && (
        <ModalCrearPartida
          claseId={claseId}
          esProfesor={esProfesor}
          onClose={() => setModalCrear(false)}
          onCreada={(id) => router.push(`/clases/${claseId}/partidas/${id}`)}
        />
      )}
    </div>
  );
}