'use client';

import { useState } from 'react';
import { useLiveKit } from '@/contexts/LiveKitContext';

interface Props {
  aulaId: string;
  esProfesor: boolean;
}

function BarrasVoz({ hablando }: { hablando: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[6, 14, 10, 12].map((h, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            borderRadius: '2px',
            height: hablando ? `${h}px` : '4px',
            background: hablando ? '#22c55e' : '#d1d5db',
            transition: 'height 0.15s ease, background 0.15s ease',
            animation: hablando ? `bar${i} 0.7s ease-in-out infinite ${i * 0.1}s` : 'none'
          }}
        />
      ))}
      <style>{`
        @keyframes bar0 { 0%,100%{height:6px} 50%{height:14px} }
        @keyframes bar1 { 0%,100%{height:14px} 50%{height:6px} }
        @keyframes bar2 { 0%,100%{height:10px} 50%{height:16px} }
        @keyframes bar3 { 0%,100%{height:12px} 50%{height:5px} }
      `}</style>
    </div>
  );
}

function TarjetaParticipante({
  participante,
  esProfesor,
  muteadoPorProfesor,
  onMutear,
  onExpulsar,
  onVolumen,
  volumen
}: {
  participante: { identity: string; nombre: string; isSpeaking: boolean; isMuted: boolean; isLocal: boolean };
  esProfesor: boolean;
  muteadoPorProfesor: boolean;
  onMutear?: (identity: string, muted: boolean) => void;
  onExpulsar?: (identity: string) => void;
  onVolumen?: (identity: string, vol: number) => void;
  volumen: number;
}) {
  const silenciado = participante.isLocal
    ? participante.isMuted || muteadoPorProfesor
    : participante.isMuted;

  return (
    <div className={`p-2.5 rounded-xl border transition-colors ${
      participante.isSpeaking && !silenciado
        ? 'bg-green-50 border-green-200'
        : silenciado
        ? 'bg-red-50 border-red-200'
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className="relative shrink-0">
          {participante.isSpeaking && !silenciado && (
            <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
          )}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative z-10 ${
            participante.isSpeaking && !silenciado
              ? 'bg-green-100 text-green-700 outline outline-2 outline-green-400 outline-offset-1'
              : silenciado
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {participante.nombre.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Nombre y estado */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${
            participante.isSpeaking && !silenciado ? 'text-green-700' :
            silenciado ? 'text-red-700' : 'text-slate-800'
          }`}>
            {participante.nombre}
            {participante.isLocal && <span className="text-slate-400 font-normal"> (tú)</span>}
          </p>
          <p className={`text-[10px] ${
            participante.isSpeaking && !silenciado ? 'text-green-600' :
            silenciado ? 'text-red-500' : 'text-slate-400'
          }`}>
            {participante.isLocal && muteadoPorProfesor
              ? 'Silenciado por el profesor'
              : silenciado ? 'Silenciado'
              : participante.isSpeaking ? 'Hablando...'
              : 'Conectado'}
          </p>
        </div>

        {/* Barras de voz */}
        {!silenciado && (
          <BarrasVoz hablando={participante.isSpeaking} />
        )}

        {/* Icono mute */}
        {silenciado && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
          </svg>
        )}
      </div>

      {/* Control de volumen — solo para otros usuarios */}
      {!participante.isLocal && onVolumen && (
        <div className="mt-2 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#94a3b8">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volumen}
            onChange={e => onVolumen(participante.identity, parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 w-7 text-right">
            {Math.round(volumen * 100)}%
          </span>
        </div>
      )}

      {/* Controles profesor */}
{esProfesor && !participante.isLocal && onMutear && onExpulsar && (
  <div className="mt-2 flex gap-1">
    <button
      onClick={() => onMutear(participante.identity, !participante.isMuted)}
      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
        participante.isMuted
          ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
      }`}
    >
      {participante.isMuted ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
          </svg>
          Activar
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
          </svg>
          Silenciar
        </>
      )}
    </button>
    <button
      onClick={() => onExpulsar(participante.identity)}
      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border-red-200 border hover:bg-red-200 transition-colors cursor-pointer "
    >
      ✕ Expulsar
    </button>
  </div>
)}
    </div>
  );
}

export default function SalaVozPanel({ aulaId, esProfesor }: Props) {
  const {
    conectado, conectando, micActivo, muteadoPorProfesor,
    participantesVoz, unirse, salir, toggleMic,
    mutearParticipante, expulsarParticipante,
    setVolumenParticipante, error
  } = useLiveKit();

  const [volumenes, setVolumenes] = useState<Record<string, number>>({});

  const getVolumen = (identity: string) => volumenes[identity] ?? 1;

  const handleVolumen = (identity: string, vol: number) => {
    setVolumenes(prev => ({ ...prev, [identity]: vol }));
    setVolumenParticipante(identity, vol);
  };

  const yo = participantesVoz.find(p => p.isLocal);
  const otros = participantesVoz.filter(p => !p.isLocal);
  const micBloqueado = muteadoPorProfesor;
  const micVisible = micActivo && !muteadoPorProfesor;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Cabecera */}
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
            {/* Tarjeta propia */}
            {yo && (
              <TarjetaParticipante
                participante={yo}
                esProfesor={esProfesor}
                muteadoPorProfesor={muteadoPorProfesor}
                volumen={1}
              />
            )}

            {/* Controles propios */}
            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                disabled={micBloqueado}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  !micVisible
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  {micVisible
                    ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/></>
                    : <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  }
                </svg>
                {muteadoPorProfesor ? 'Silenciado' : micActivo ? 'Mic' : 'Silenciado'}
              </button>

              <button
                onClick={salir}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
                Salir
              </button>
            </div>

            {/* Lista scrolleable de otros participantes */}
            {otros.length > 0 && (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  En la sala ({otros.length})
                </p>
                {otros.map(p => (
                  <TarjetaParticipante
                    key={p.identity}
                    participante={p}
                    esProfesor={esProfesor}
                    muteadoPorProfesor={false}
                    onMutear={esProfesor ? mutearParticipante : undefined}
                    onExpulsar={esProfesor ? expulsarParticipante : undefined}
                    onVolumen={handleVolumen}
                    volumen={getVolumen(p.identity)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => unirse(aulaId)}
            disabled={conectando}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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