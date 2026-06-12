'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat/ChatContainer';
import VistaAula from '@/components/aula/vistaAula';
import ModalCargarPartida from '@/components/aula/ModalCargarPartida';
import ModalGuardarPartida from '@/components/aula/ModalGuardarPartida';
import ListaParticipantes from '@/components/aula/ListaParticipantes';
import { useLiveKit } from '@/contexts/LiveKitContext';
import { useAulaPresencia } from '@/hooks/useAulaPresencia';

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

function SalaVozPanel({ aulaId, esProfesor }: { aulaId: string; esProfesor: boolean }) {
  const {
    conectado, conectando, micActivo, ensordecido,
    ensordecidoPorProfesor, participantesVoz,
    unirse, salir, toggleMic, toggleEnsordecido, error
  } = useLiveKit();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎙️</span>
          <h2 className="font-bold text-slate-800">Sala de voz</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {conectado ? `${participantesVoz.length} conectados` : '0 conectados'}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
        )}

        {conectado ? (
          <>
            {(() => {
              const yo = participantesVoz.find(p => p.isLocal);
              const silenciado = !micActivo || ensordecidoPorProfesor;
              return (
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  yo?.isSpeaking ? 'bg-green-50 border-green-200' :
                  silenciado ? 'bg-red-50 border-red-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="relative w-8 h-8 shrink-0">
                    {yo?.isSpeaking && (
                      <div className="absolute inset-0 rounded-full bg-green-400 opacity-40 animate-ping" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative z-10 ${
                      yo?.isSpeaking ? 'bg-green-100 text-green-700' :
                      silenciado ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {yo?.nombre?.slice(0, 2).toUpperCase() ?? 'YO'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${
                      yo?.isSpeaking ? 'text-green-700' :
                      silenciado ? 'text-red-700' :
                      'text-slate-700'
                    }`}>
                      {yo?.nombre ?? 'Tú'}
                    </p>
                    <p className={`text-xs ${
                      yo?.isSpeaking ? 'text-green-600' :
                      silenciado ? 'text-red-600' :
                      'text-slate-400'
                    }`}>
                      {ensordecidoPorProfesor ? 'Silenciado por profesor' :
                       yo?.isSpeaking ? 'Hablando...' :
                       silenciado ? 'Silenciado' : 'Conectado'}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                disabled={ensordecidoPorProfesor}
                title={micActivo ? 'Silenciar' : 'Activar micrófono'}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  !micActivo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  {micActivo
                    ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/></>
                    : <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  }
                </svg>
                {micActivo ? 'Mic' : 'Muteado'}
              </button>

              <button
                onClick={toggleEnsordecido}
                title={ensordecido ? 'Activar audio' : 'Ensordecer'}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  ensordecido ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1C7.03 1 3 5.03 3 10v4c0 1.1.9 2 2 2h1v-6H4v-1c0-4.42 3.58-8 8-8s8 3.58 8 8v1h-2v6h1c1.1 0 2-.9 2-2v-4c0-4.97-4.03-9-9-9zM9 14H7v4h2v-4zm8 0h-2v4h2v-4z"/>
                </svg>
                {ensordecido ? 'Sordo' : 'Audio'}
              </button>

              <button
                onClick={salir}
                title="Salir de la sala"
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
                Salir
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => unirse(aulaId)}
            disabled={conectando}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {conectando ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
              </svg>
            )}
            {conectando ? 'Conectando...' : 'Unirse a la sala'}
          </button>
        )}
      </div>
    </div>
  );
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

  const { presentes, actualizarEnVoz } = useAulaPresencia(aula?.id ?? null);
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

  // Actualizar presencia cuando cambia estado de voz
  useEffect(() => {
    actualizarEnVoz(conectado);
  }, [conectado, actualizarEnVoz]);

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
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm text-slate-600"
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
              onCargarPartida={() => setModalCargar(true)}
              onGuardar={() => setModalGuardar(true)}
              onPgnChange={setPgnActual}
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
            />
          </div>

        </div>
      </div>
    </div>
  );
}