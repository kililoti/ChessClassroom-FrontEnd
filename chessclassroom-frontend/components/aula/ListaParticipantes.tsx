'use client';

import { useLiveKit } from '@/contexts/LiveKitContext';
import { PresenciaUsuario } from '@/hooks/useAulaPresencia';

interface PermisosTablero {
  alumno_id: string;
  puede_mover_blancas: boolean;
  puede_mover_negras: boolean;
}

interface Props {
  aulaId: string;
  presentes: PresenciaUsuario[];
  esProfesor: boolean;
  permisos: PermisosTablero[];
  onPermisosChange: () => void;
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export default function ListaParticipantes({
  aulaId, presentes, esProfesor, permisos, onPermisosChange
}: Props) {
  const { participantesVoz, mutearParticipante, ensordecer } = useLiveKit();

  const estaEnVoz = (usuarioId: string) =>
    participantesVoz.some(p => p.identity === usuarioId);

  const estaHablando = (usuarioId: string) =>
    participantesVoz.find(p => p.identity === usuarioId)?.isSpeaking ?? false;

  const estaMuteado = (usuarioId: string) =>
    participantesVoz.find(p => p.identity === usuarioId)?.isMuted ?? false;

  const getPermisos = (alumnoId: string) =>
    permisos.find(p => p.alumno_id === alumnoId) ?? {
      alumno_id: alumnoId,
      puede_mover_blancas: false,
      puede_mover_negras: false
    };

  const togglePermiso = async (
    alumnoId: string,
    tipo: 'blancas' | 'negras'
  ) => {
    const actual = getPermisos(alumnoId);
    const body = {
      puede_mover_blancas: tipo === 'blancas' ? !actual.puede_mover_blancas : actual.puede_mover_blancas,
      puede_mover_negras:  tipo === 'negras'  ? !actual.puede_mover_negras  : actual.puede_mover_negras,
    };
    try {
      await fetch(`http://localhost:3001/api/aula/${aulaId}/permisos/${alumnoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      });
      onPermisosChange();
    } catch (e) { console.error(e); }
  };

  const profesores = presentes.filter(p => p.rol === 'profesor');
  const alumnos   = presentes.filter(p => p.rol === 'alumno');

  const renderParticipante = (p: PresenciaUsuario, esYo: boolean) => {
    const enVoz     = estaEnVoz(p.usuario_id);
    const hablando  = estaHablando(p.usuario_id);
    const muteado   = estaMuteado(p.usuario_id);
    const permisosP = p.rol === 'alumno' ? getPermisos(p.usuario_id) : null;

    return (
      <div
        key={p.usuario_id}
        className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-colors ${
          hablando
            ? 'bg-green-50 border-green-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Fila principal */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="relative shrink-0">
            {hablando && (
              <div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
            )}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold relative z-10 ${
              hablando   ? 'bg-green-100 text-green-700 outline outline-2 outline-green-400 outline-offset-1' :
              enVoz      ? 'bg-blue-100 text-blue-700' :
              'bg-slate-200 text-slate-600'
            }`}>
              {p.nombre.slice(0, 1)}{p.apellidos.slice(0, 1)}
            </div>
          </div>

          {/* Nombre */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {p.nombre} {p.apellidos}
              {esYo && <span className="text-slate-400 font-normal"> (tú)</span>}
            </p>
            <p className="text-[10px] text-slate-400">
              {p.rol === 'profesor' ? 'Profesor' : 'Alumno'}
            </p>
          </div>

          {/* Iconos estado voz */}
          <div className="flex items-center gap-1 shrink-0">
            {enVoz && (
              <span title="En sala de voz">
                <svg width="12" height="12" viewBox="0 0 24 24" fill={hablando ? '#22c55e' : '#94a3b8'}>
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </span>
            )}
            {enVoz && muteado && (
              <span title="Muteado">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Controles profesor sobre este participante */}
        {esProfesor && !esYo && (
          <div className="flex flex-col gap-1.5">

            {/* Permisos tablero — solo alumnos */}
            {p.rol === 'alumno' && permisosP && (
              <div className="flex gap-1">
                <button
                  onClick={() => togglePermiso(p.usuario_id, 'blancas')}
                  title="Permiso mover blancas"
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors border ${
                    permisosP.puede_mover_blancas
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  ♙ B
                </button>
                <button
                  onClick={() => togglePermiso(p.usuario_id, 'negras')}
                  title="Permiso mover negras"
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors border ${
                    permisosP.puede_mover_negras
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  ♟ N
                </button>
              </div>
            )}

            {/* Controles voz — solo si está en sala */}
            {enVoz && (
              <div className="flex gap-1">
                <button
                  onClick={() => mutearParticipante(p.usuario_id)}
                  title="Mutear micrófono"
                  className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  🔇 Mutear
                </button>
                <button
                  onClick={() => ensordecer(p.usuario_id, true)}
                  title="Ensordecer"
                  className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  🔕 Sordo
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    );
  };

  const usuarioId = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('usuario') ?? '{}').id
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          <h2 className="font-bold text-slate-800">Participantes</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">{presentes.length} conectados</span>
      </div>

      <div className="p-3 flex flex-col gap-3 max-h-[600px] overflow-y-auto">

        {/* Profesores */}
        {profesores.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Profesores</p>
            {profesores.map(p => renderParticipante(p, p.usuario_id === usuarioId))}
          </div>
        )}

        {/* Alumnos */}
        {alumnos.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Alumnos</p>
            {alumnos.map(p => renderParticipante(p, p.usuario_id === usuarioId))}
          </div>
        )}

        {presentes.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-sm italic">
            Nadie conectado aún
          </div>
        )}
      </div>
    </div>
  );
}