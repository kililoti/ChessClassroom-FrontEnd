'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/chat/ChatContainer';
import VistaAula from '@/components/aula/vistaAula';
import ModalCargarPartida from '@/components/aula/ModalCargarPartida';
import ModalGuardarPartida from '@/components/aula/ModalGuardarPartida';

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

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

      {/* Modal cargar partida */}
      {modalCargar && (
        <ModalCargarPartida
          claseId={claseId}
          onClose={() => setModalCargar(false)}
          onCargar={(pgn) => {
            setPgnCargado(pgn);
            setModalCargar(false);
          }}
        />
      )}

      {/* Modal guardar partida */}
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

      {/* Layout: chat | tablero+planilla */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Chat — izquierda */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Chat */}
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

            {/* Sala de voz */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎙️</span>
                  <h2 className="font-bold text-slate-800">Sala de voz</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">0 conectados</span>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participantes</p>
                  <div className="text-sm text-slate-400 italic text-center py-2">
                    Nadie conectado aún
                  </div>
                </div>
                <button className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                  </svg>
                  Unirse a la sala
                </button>
              </div>
            </div>

          </div>

          {/* Tablero — centro */}
          <div className="lg:col-span-9">
            <VistaAula
              aulaId={aula.id}
              pgnInicial={pgnCargado}
              esProfesor={esProfesor}
              onCargarPartida={() => setModalCargar(true)}
              onGuardar={() => setModalGuardar(true)}
              onPgnChange={setPgnActual}
            />
          </div>

        </div>
      </div>
    </div>
  );
}