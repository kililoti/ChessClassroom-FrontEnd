'use client';

import { useLiveKit } from '@/contexts/LiveKitContext';

interface Props {
  aulaId: string;
}

export default function SalaVozPanel({ aulaId }: Props) {
  const {
    conectado, conectando, micActivo, muteadoPorProfesor,
    ensordecido, participantesVoz,
    unirse, salir, toggleMic, toggleEnsordecido, error
  } = useLiveKit();

  const yo = participantesVoz.find(p => p.isLocal);
  const micBloqueado = muteadoPorProfesor;
  const micVisible = micActivo && !muteadoPorProfesor;
  const silenciado = !micActivo || muteadoPorProfesor;

  const estadoTexto = () => {
    if (muteadoPorProfesor) return '🔇 Muteado por el profesor';
    if (!micActivo) return '🔇 Micrófono silenciado';
    if (ensordecido) return '🔕 Audio silenciado';
    if (yo?.isSpeaking) return 'Hablando...';
    return 'Conectado';
  };

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
            {/* Estado propio */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              yo?.isSpeaking    ? 'bg-green-50 border-green-200' :
              silenciado        ? 'bg-red-50 border-red-200' :
              ensordecido       ? 'bg-amber-50 border-amber-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <div className="relative w-8 h-8 shrink-0">
                {yo?.isSpeaking && (
                  <div className="absolute inset-0 rounded-full bg-green-400 opacity-40 animate-ping" />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative z-10 ${
                  yo?.isSpeaking ? 'bg-green-100 text-green-700' :
                  silenciado     ? 'bg-red-100 text-red-700' :
                  ensordecido    ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {yo?.nombre?.slice(0, 2).toUpperCase() ?? 'YO'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${
                  yo?.isSpeaking ? 'text-green-700' :
                  silenciado     ? 'text-red-700' :
                  ensordecido    ? 'text-amber-700' :
                  'text-slate-700'
                }`}>
                  {yo?.nombre ?? 'Tú'}
                </p>
                <p className={`text-xs ${
                  yo?.isSpeaking ? 'text-green-600' :
                  silenciado     ? 'text-red-600' :
                  ensordecido    ? 'text-amber-600' :
                  'text-slate-400'
                }`}>
                  {estadoTexto()}
                </p>
              </div>
            </div>

            {/* Controles */}
            <div className="flex gap-2">
              {/* Mic */}
              <button
                onClick={toggleMic}
                disabled={micBloqueado}
                title={micBloqueado ? 'Muteado por el profesor' : micActivo ? 'Silenciar micrófono' : 'Activar micrófono'}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  !micVisible ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  {micVisible
                    ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/></>
                    : <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  }
                </svg>
                {muteadoPorProfesor ? 'Muteado' : micActivo ? 'Mic' : 'Muteado'}
              </button>

              {/* Audio */}
              <button
                onClick={toggleEnsordecido}
                title={ensordecido ? 'Activar audio' : 'Silenciar audio'}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  ensordecido ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1C7.03 1 3 5.03 3 10v4c0 1.1.9 2 2 2h1v-6H4v-1c0-4.42 3.58-8 8-8s8 3.58 8 8v1h-2v6h1c1.1 0 2-.9 2-2v-4c0-4.97-4.03-9-9-9zM9 14H7v4h2v-4zm8 0h-2v4h2v-4z"/>
                </svg>
                {ensordecido ? 'Sordo' : 'Audio'}
              </button>

              {/* Salir */}
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