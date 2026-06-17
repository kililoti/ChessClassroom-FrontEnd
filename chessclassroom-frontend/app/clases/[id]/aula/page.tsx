'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import ChatContainer from '@/components/chat/ChatContainer';
import VistaAula from '@/components/aula/vistaAula';
import ModalCargarPartida from '@/components/aula/ModalCargarPartida';
import ModalGuardarPartida from '@/components/aula/ModalGuardarPartida';
import ListaParticipantes from '@/components/aula/ListaParticipantes';
import SalaVozPanel from '@/components/aula/SalaVozPanel';
import PanelStockfish from '@/components/ajedrez/PanelStockfish';
import PanelStockfishAlumno from '@/components/ajedrez/PanelStockfishAlumno';
import { useStockfish } from '@/hooks/useStockfish';
import { useLiveKit } from '@/contexts/LiveKitContext';
import { usePresencia } from '@/contexts/PresenciaContext';
import { EventoAula } from '@/hooks/useAulaRealtime';

interface DatosAula {
  id: string;
  clase_id: string;
  fen_actual: string;
  pgn_actual: string;
  orientacion: 'white' | 'black';
  activa: boolean;
}

interface DatosClase {
  id: string;
  nombre: string;
  tipo: 'grupal' | 'particular';
}

interface Usuario {
  id: string;
  rol: 'profesor' | 'alumno';
  nombre: string;
  apellidos: string;
}

export default function AulaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: claseId } = React.use(params);

  const [clase, setClase]       = useState<DatosClase | null>(null);
  const [aula, setAula]         = useState<DatosAula | null>(null);
  const [salaChat, setSalaChat] = useState<string | null>(null);
  const [usuario, setUsuario]   = useState<Usuario | null>(null);
  const [loading, setLoading]   = useState(true);
  const [pgnCargado, setPgnCargado]   = useState('');
  const [modalCargar, setModalCargar] = useState(false);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [pgnActual, setPgnActual] = useState('');
  const [permisos, setPermisos]   = useState<any[]>([]);

  // FEN actual del tablero (notificado por VistaAula)
  const [fenActual, setFenActual] = useState('');

  // Análisis recibido del profesor (para alumnos)
  const [lineasAlumno, setLineasAlumno]   = useState<any[]>([]);
  const [flechasAlumno, setFlechasAlumno] = useState<any[]>([]);

  // Stockfish — solo corre en el navegador del profesor
  const stockfish = useStockfish();
  const [stockfishCompartido, setStockfishCompartido] = useState(false);

  const emitirRef = useRef<((evento: EventoAula) => void) | null>(null);

  const { presentes, iniciarPresencia, actualizarEnVoz, limpiar } = usePresencia();
  const { conectado } = useLiveKit();

  const esProfesor = usuario?.rol === 'profesor';

  // Analizar cuando el FEN cambia y Stockfish está activo
  useEffect(() => {
    if (esProfesor && stockfish.activo && fenActual) {
      stockfish.analizarFen(fenActual);
    }
  }, [fenActual, stockfish.activo, esProfesor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Difundir análisis cuando está compartido y las líneas se actualizan
  useEffect(() => {
    if (!esProfesor || !stockfishCompartido || !emitirRef.current) return;
    emitirRef.current({
      tipo: 'STOCKFISH',
      activo: true,
      lineas: stockfish.lineas,
      flechas: stockfish.flechas,
    });
  }, [stockfish.lineas, stockfishCompartido, esProfesor]);

  // Limpiar Stockfish al desmontar
  useEffect(() => {
    return () => { stockfish.desactivar(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCompartirStockfish = () => {
    const nuevo = !stockfishCompartido;
    setStockfishCompartido(nuevo);
    if (!nuevo) {
      emitirRef.current?.({ tipo: 'STOCKFISH', activo: false, lineas: [], flechas: [] });
    }
  };

  const cargarDatos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const usuarioStr = localStorage.getItem('usuario');
      if (!token || !usuarioStr) { router.push('/login'); return; }

      setUsuario(JSON.parse(usuarioStr));

      const [resClase, resAula] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/${claseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/aula/clase/${claseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!resClase.ok) throw new Error('No se pudo cargar la clase');
      if (!resAula.ok)  throw new Error('No se pudo cargar el aula');

      const dataClase = await resClase.json();
      const dataAula  = await resAula.json();

      setClase({ id: dataClase.id, nombre: dataClase.nombre, tipo: dataClase.tipo });
      setAula(dataAula);
      setPgnCargado(dataAula.pgn_actual ?? '');
      setPgnActual(dataAula.pgn_actual ?? '');

      const resChats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resChats.ok) {
        const dataChats = await resChats.json();
        const salaAula  = dataChats.data?.find(
          (s: any) => s.tipo === 'clase_aula' && s.clase_id === claseId
        );
        if (salaAula) setSalaChat(salaAula.id);
      }
    } catch (err: any) {
      console.error('Error cargando aula:', err);
    } finally {
      setLoading(false);
    }
  }, [claseId, router]);

  const cargarPermisos = useCallback(async () => {
    if (!aula) return;
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aula/${aula.id}/permisos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPermisos(data);
    } catch (e) { console.error(e); }
  }, [aula]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => { cargarPermisos(); }, [cargarPermisos]);

  useEffect(() => { if (aula) iniciarPresencia(aula.id); }, [aula, iniciarPresencia]);
  useEffect(() => { actualizarEnVoz(conectado); }, [conectado, actualizarEnVoz]);
  useEffect(() => { return () => { limpiar(); }; }, [limpiar]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando aula virtual...</div>
      </div>
    );
  }

  if (!clase || !aula) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-500 font-medium">No se pudo cargar el aula.</div>
      </div>
    );
  }

  const permisosAlumno = !esProfesor
    ? permisos.find((p: any) => p.alumno_id === usuario?.id)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {modalCargar && (
        <ModalCargarPartida
          claseId={claseId}
          onClose={() => setModalCargar(false)}
          onCargar={(pgn) => { setPgnCargado(pgn); setModalCargar(false); }}
        />
      )}
      {modalGuardar && (
        <ModalGuardarPartida
          claseId={claseId}
          pgn={pgnActual}
          onClose={() => setModalGuardar(false)}
          onGuardado={() => setModalGuardar(false)}
        />
      )}

      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/clases/${claseId}`)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm text-slate-600 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>💻</span>
                Aula Virtual — {clase.nombre}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {esProfesor ? 'Modo profesor' : 'Modo alumno'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-full shadow-sm">
            🟢 Aula activa
          </span>
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Izquierda: chat + sala de voz */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h2 className="font-bold text-slate-800">Chat del aula</h2>
              </div>
              {salaChat
                ? <ChatContainer salaId={salaChat} />
                : <div className="p-4 text-slate-400 text-sm text-center">Cargando chat...</div>
              }
            </div>
            <SalaVozPanel aulaId={aula.id} esProfesor={esProfesor} />
          </div>

          {/* Centro: tablero */}
          <div className="lg:col-span-7">
            <VistaAula
              aulaId={aula.id}
              pgnInicial={pgnCargado}
              esProfesor={esProfesor}
              usuarioId={usuario?.id}
              permisosIniciales={permisosAlumno}
              onCargarPartida={() => setModalCargar(true)}
              onGuardar={() => setModalGuardar(true)}
              onPgnChange={setPgnActual}
              onFenChange={setFenActual}
              onEmitirRef={(fn) => { emitirRef.current = fn; }}
              onStockfishRecibido={(lineas, flechas) => {
                if (!esProfesor) {
                  setLineasAlumno(lineas);
                  setFlechasAlumno(flechas);
                }
              }}
              onSolicitarStockfish={() => {
                // Un alumno se reconectó — reenviar el análisis si está compartido
                if (stockfishCompartido && stockfish.lineas.length > 0) {
                  emitirRef.current?.({
                    tipo: 'STOCKFISH',
                    activo: true,
                    lineas: stockfish.lineas,
                    flechas: stockfish.flechas,
                  });
                }
              }}
              // Props de Stockfish — solo cuando el profesor está activo
              flechasStockfish={esProfesor
                ? (stockfish.activo ? stockfish.flechas : [])
                : flechasAlumno
              }
              mostrarEvalBar={esProfesor && stockfish.activo && stockfish.lineas.length > 0}
              evalLinea={esProfesor ? (stockfish.lineas[0] ?? null) : null}
            />
          </div>

          {/* Derecha: participantes + Stockfish (profesor) */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Participantes con altura máxima y scroll */}
            
              <ListaParticipantes
                aulaId={aula.id}
                presentes={presentes}
                esProfesor={esProfesor}
                permisos={permisos}
                onPermisosChange={cargarPermisos}
                onEmitirPermiso={(alumnoId, blancas, negras) => {
                  emitirRef.current?.({
                    tipo: 'PERMISOS',
                    alumno_id: alumnoId,
                    puede_mover_blancas: blancas,
                    puede_mover_negras: negras
                  });
                }}
              />

            {/* Análisis recibido — solo para alumnos */}
            {!esProfesor && lineasAlumno.length > 0 && (
              <PanelStockfishAlumno
                lineas={lineasAlumno}
                turnoBlancas={fenActual.split(' ')[1] === 'w'}
                numeroJugada={parseInt(fenActual.split(' ')[5], 10) || 1}
              />
            )}

            {/* Panel Stockfish — solo para el profesor */}
            {esProfesor && (
              <div className="flex flex-col gap-3">
                <PanelStockfish
                  activo={stockfish.activo}
                  cargando={stockfish.cargando}
                  profundidad={stockfish.profundidad}
                  lineas={stockfish.lineas}
                  turnoBlancas={fenActual.split(' ')[1] === 'w'}
                  numeroJugada={parseInt(fenActual.split(' ')[5], 10) || 1}
                  onActivar={stockfish.activar}
                  onDesactivar={() => {
                    stockfish.desactivar();
                    if (stockfishCompartido) {
                      setStockfishCompartido(false);
                      emitirRef.current?.({ tipo: 'STOCKFISH', activo: false, lineas: [], flechas: [] });
                    }
                  }}
                  onCambiarProfundidad={stockfish.setProfundidad}
                />

                {stockfish.activo && (
                  <button
                    onClick={toggleCompartirStockfish}
                    className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      stockfishCompartido
                        ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                        : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {stockfishCompartido
                      ? <><Eye className="w-3.5 h-3.5" /> Visible para alumnos</>
                      : <><EyeOff className="w-3.5 h-3.5" /> Oculto para alumnos</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}