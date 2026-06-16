'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Plus, History, Swords, Calendar } from 'lucide-react';
import TarjetaTorneo from '@/components/torneos/TarjetaTorneo';
import ModalCrearTorneo from '@/components/torneos/ModalCrearTorneo';
import ModalEditarTorneo from '@/components/torneos/ModalEditarTorneo';
import { useTorneosRealtime } from '@/hooks/useTorneoRealtime';

const API = 'http://localhost:3001/api';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

export interface Torneo {
  id: string;
  nombre: string;
  estado: 'configurando' | 'programado' | 'activo' | 'finalizado';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tiempo_ms: number;
  incremento_ms: number;
  creador_id: string;
  creador: { id: string; font: string; nombre: string; apellidos: string };
  torneo_participantes: { usuario_id: string }[];
}

export default function TorneosPage() {
  const params  = useParams();
  const router  = useRouter();
  const claseId = params.id as string;

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  const [tab, setTab]               = useState<'activos' | 'historial'>('activos');
  const [torneos, setTorneos]       = useState<Torneo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [torneoEditarId, setTorneoEditarId] = useState<string | null>(null);

  const fetchTorneos = useCallback(async () => {
    setLoading(true);
    try {
      const historial = tab === 'historial';
      const res = await fetch(`${API}/torneos/clase/${claseId}?historial=${historial}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (res.ok) setTorneos(d.torneos ?? []);
    } catch {}
    finally { setLoading(false); }
  }, [claseId, tab]);

  useEffect(() => { fetchTorneos(); }, [fetchTorneos]);

  // Actualización en tiempo real de la lista
  useTorneosRealtime({ claseId, onCambio: fetchTorneos });

  const configurando = torneos.filter(t => t.estado === 'configurando');
  const enCurso      = torneos.filter(t => t.estado === 'activo');
  const programados  = torneos.filter(t => t.estado === 'programado');

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
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Torneos</h1>
                <p className="text-sm text-slate-500">Formato arena · todos contra todos</p>
              </div>
            </div>
          </div>
          {esProfesor && (
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo torneo
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto">

          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
            <button
              onClick={() => setTab('activos')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === 'activos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Activos</span>
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

          {loading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">Cargando torneos...</div>
          ) : tab === 'activos' ? (
            <div className="space-y-8">

              {/* En configuración */}
              {esProfesor && configurando.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    En configuración
                  </h2>
                  <div className="space-y-3">
                    {configurando.map(t => (
                      <TarjetaTorneo
                        key={t.id}
                        torneo={t}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/torneos/${t.id}`)}
                        onEliminado={fetchTorneos}
                        onEditar={() => setTorneoEditarId(t.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* En curso */}
              {enCurso.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-blue-700" /> Activo
                  </h2>
                  <div className="space-y-3">
                    {enCurso.map(t => (
                      <TarjetaTorneo
                        key={t.id}
                        torneo={t}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/torneos/${t.id}`)}
                        onEliminado={fetchTorneos}
                        onEditar={() => setTorneoEditarId(t.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Programados */}
              {programados.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" /> Programados
                  </h2>
                  <div className="space-y-3">
                    {programados.map(t => (
                      <TarjetaTorneo
                        key={t.id}
                        torneo={t}
                        usuarioId={usuario?.id}
                        esProfesor={esProfesor}
                        onEntrar={() => router.push(`/clases/${claseId}/torneos/${t.id}`)}
                        onEliminado={fetchTorneos}
                        onEditar={() => setTorneoEditarId(t.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {configurando.length === 0 && enCurso.length === 0 && programados.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay torneos activos</p>
                  {esProfesor && <p className="text-sm mt-1">¡Crea un nuevo torneo para empezar!</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {torneos.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay torneos finalizados</p>
                </div>
              ) : (
                torneos.map(t => (
                  <TarjetaTorneo
                    key={t.id}
                    torneo={t}
                    usuarioId={usuario?.id}
                    esProfesor={esProfesor}
                    onEntrar={() => router.push(`/clases/${claseId}/torneos/${t.id}`)}
                    onEliminado={fetchTorneos}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {torneoEditarId && (
        <ModalEditarTorneo
          torneoId={torneoEditarId}
          claseId={claseId}
          onClose={() => setTorneoEditarId(null)}
          onEditado={() => { setTorneoEditarId(null); fetchTorneos(); }}
        />
      )}

      {modalCrear && (
        <ModalCrearTorneo
          claseId={claseId}
          onClose={() => setModalCrear(false)}
          onCreado={() => { fetchTorneos(); }} 
        />
      )}
    </div>
  );
}