import { Brain, Zap, ZapOff } from 'lucide-react';
import { LineaAnalisis } from '@/hooks/useStockfish';

interface Props {
  activo: boolean;
  cargando: boolean;
  profundidad: number;
  lineas: LineaAnalisis[];
  turnoBlancas: boolean;
  numeroJugada: number;
  bloqueado?: boolean;         // ← nuevo
  onActivar: () => void;
  onDesactivar: () => void;
  onCambiarProfundidad: (d: number) => void;
}

const PROFUNDIDADES = [10, 14, 18, 22, 26];

const BG_LINEAS  = ['bg-blue-50 border-blue-200', 'bg-emerald-50 border-emerald-200', 'bg-amber-50 border-amber-200'];
const DOT_LINEAS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

function EtiquetaEval({ linea, turnoBlancas }: { linea: LineaAnalisis; turnoBlancas: boolean }) {
  if (linea.mate !== null) {
    const signo = linea.mate > 0 ? '' : '-';
    return <span className="text-xs font-extrabold text-amber-600 font-mono">M{signo}{Math.abs(linea.mate)}</span>;
  }
  const eval_abs = turnoBlancas ? linea.evaluacion : -linea.evaluacion;
  const signo = eval_abs > 0 ? '+' : '';
  const color = eval_abs > 0.3 ? 'text-emerald-600' : eval_abs < -0.3 ? 'text-slate-500' : 'text-slate-600';
  return <span className={`text-xs font-extrabold font-mono ${color}`}>{signo}{eval_abs.toFixed(2)}</span>;
}

function formatearVariante(san: string[], turnoBlancas: boolean, numeroInicial: number) {
  const tokens: { texto: string; tipo: 'numero' | 'jugada'; esActual: boolean }[] = [];
  let numero = numeroInicial;
  let blancasJuegan = turnoBlancas;

  san.forEach((mov, i) => {
    if (blancasJuegan) {
      tokens.push({ texto: `${numero}.`, tipo: 'numero', esActual: false });
    } else if (i === 0) {
      tokens.push({ texto: `${numero}...`, tipo: 'numero', esActual: false });
    }
    tokens.push({ texto: mov, tipo: 'jugada', esActual: i === 0 });

    if (!blancasJuegan) numero++;
    blancasJuegan = !blancasJuegan;
  });

  return tokens;
}

export default function PanelStockfish({
  activo, cargando, profundidad, lineas, turnoBlancas, numeroJugada,
  bloqueado = false,
  onActivar, onDesactivar, onCambiarProfundidad,
}: Props) {
  return (
    <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3">

      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">Stockfish</span>
            {cargando && <span className="text-[10px] text-slate-400 animate-pulse">Cargando...</span>}
            {activo && !cargando && lineas[0] && (
              <span className="text-[10px] text-slate-400">prof. {lineas[0].profundidad}</span>
            )}
          </div>
          <button
            onClick={activo ? onDesactivar : onActivar}
            disabled={bloqueado}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${bloqueado
                ? 'bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed'
                : activo
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
              }`}
          >
            {activo ? <><ZapOff className="w-3 h-3" /> Parar</> : <><Zap className="w-3 h-3" /> Analizar</>}
          </button>
        </div>

        {!activo && (
          <p className="text-xs text-slate-500 text-center py-2">
            {bloqueado ? 'No disponible en este contexto' : 'Pulsa Analizar para activar el motor'}
          </p>
        )}
        {activo && !cargando && lineas.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2 animate-pulse">Analizando posición...</p>
        )}
      </div>

      {activo && lineas.length > 0 && (
        <div className="flex flex-col gap-2">
          {lineas.map((linea, i) => {
            const tokens = formatearVariante(linea.san.slice(0, 8), turnoBlancas, numeroJugada);
            return (
              <div key={linea.multipv} className={`rounded-xl p-3 border ${BG_LINEAS[i] ?? BG_LINEAS[2]}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_LINEAS[i] ?? DOT_LINEAS[2]}`} />
                  <EtiquetaEval linea={linea} turnoBlancas={turnoBlancas} />
                </div>

                <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {tokens.map((t, j) => (
                    <span
                      key={j}
                      className={`text-xs font-mono
                        ${t.tipo === 'numero' ? 'text-slate-400' : ''}
                        ${t.esActual ? 'text-slate-900 font-extrabold' : t.tipo === 'jugada' ? 'text-slate-600 font-semibold' : ''}
                      `}
                    >
                      {t.texto}
                    </span>
                  ))}
                  {linea.san.length > 8 && <span className="text-[10px] text-slate-400">...</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activo && (
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-700">
          <p className="text-[10px] text-slate-300 mb-2 font-bold uppercase tracking-wider">Profundidad</p>
          <div className="flex gap-1.5 flex-wrap">
            {PROFUNDIDADES.map(d => (
              <button
                key={d}
                onClick={() => onCambiarProfundidad(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border
                  ${profundidad === d
                    ? 'bg-blue-500 text-white border-blue-400'
                    : 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}