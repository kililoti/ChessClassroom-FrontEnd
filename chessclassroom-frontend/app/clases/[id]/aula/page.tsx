'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat/ChatContainer';
import VistaAula from '@/components/aula/vistaAula';
import ModalCargarPartida from '@/components/aula/ModalCargarPartida';
import ModalGuardarPartida from '@/components/aula/ModalGuardarPartida';
import ListaParticipantes from '@/components/aula/ListaParticipantes';
import SalaVozPanel from '@/components/aula/SalaVozPanel';
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

  const [clase, setClase] = useState<DatosClase | null>(null);
  const [aula, setAula] = useState<DatosAula | null>(null);
  const [salaChat, setSalaChat] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [pgnCargado, setPgnCargado] = useState('');
  const [modalCargar, setModalCargar] = useState(false);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [pgnActual, setPgnActual] = useState('');
  const [permisos, setPermisos] = useState<any[]>([]);

  const emitirRef = useRef<((evento: EventoAula) => void) | null>(null);

  const { presentes, iniciarPresencia, actualizarEnVoz, limpiar } = usePresencia();
  const { conectado } = useLiveKit();

  const cargarDatos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const usuarioStr = localStorage.getItem('usuario');
      if (!token || !usuarioStr) { router.push('/login'); return; }

      setUsuario(JSON.parse(usuarioStr));

      const [resClase, resAula] = await Promise.all([
        fetch(`http://localhost:3001/api/clases/${claseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/aula/clase/${claseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!resClase.ok) throw new Error('No se pudo cargar la clase');
      if (!resAula.ok) throw new Error('No se pudo cargar el aula');

      const dataClase = await resClase.json();
      const dataAula = await resAula.json();

      setClase({ id: dataClase.id, nombre: dataClase.nombre, tipo: dataClase.tipo });
      setAula(dataAula);
      setPgnCargado(dataAula.pgn_actual ?? '');
      setPgnActual(dataAula.pgn_actual ?? '');

      const resChats = await fetch(`http://localhost:3001/api/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resChats.ok) {
        const dataChats = await resChats.json();
        const salaAula = dataChats.data?.find(
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
      const res = await fetch(`http://localhost:3001/api/aula/${aula.id}/permisos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPermisos(data);
    } catch (e) { console.error(e); }
  }, [aula]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => { cargarPermisos(); }, [cargarPermisos]);

  // Iniciar presencia cuando se carga el aula
  useEffect(() => {
    if (aula) iniciarPresencia(aula.id);
  }, [aula, iniciarPresencia]);

  // Actualizar estado de voz en presencia
  useEffect(() => {
    actualizarEnVoz(conectado);
  }, [conectado, actualizarEnVoz]);

  // Limpiar presencia siempre al salir del aula
  useEffect(() => {
    return () => {
      limpiar();
    };
  }, [limpiar]);

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

  const esProfesor = usuario?.rol === 'profesor';

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
              title="Volver a la clase"
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
              {salaChat ? (
                <ChatContainer salaId={salaChat} />
              ) : (
                <div className="p-4 text-slate-400 text-sm text-center">Cargando chat...</div>
              )}
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
              onEmitirRef={(fn) => { emitirRef.current = fn; }}
            />
          </div>

          {/* Derecha: participantes */}
          <div className="lg:col-span-2">
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
          </div>

        </div>
      </div>
    </div>
  );
}