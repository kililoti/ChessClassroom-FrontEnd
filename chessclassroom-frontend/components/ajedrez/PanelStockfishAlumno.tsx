'use client';

import type { LineaAnalisis } from '@/hooks/useStockfish';

interface Props {
  lineas: LineaAnalisis[];
  turnoBlancas: boolean;
  numeroJugada: number;
}

const BG_LINEAS  = ['bg-blue-50 border-blue-200', 'bg-emerald-50 border-emerald-200', 'bg-amber-50 border-amber-200'];
const DOT_LINEAS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

export default function PanelStockfishAlumno({ lineas, turnoBlancas, numeroJugada }: Props) {
  if (lineas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 flex items-center gap-2">
        <span className="text-blue-400 text-sm">🧠</span>
        <span className="text-sm font-bold text-white">Análisis del profesor</span>
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse ml-1" />
      </div>

      <div className="flex flex-col gap-2">
        {lineas.map((linea, i) => {
          const eval_abs = turnoBlancas ? linea.evaluacion : -linea.evaluacion;
          const etiqueta = linea.mate !== null
            ? `M${linea.mate > 0 ? '' : '-'}${Math.abs(linea.mate)}`
            : `${eval_abs > 0 ? '+' : ''}${eval_abs.toFixed(2)}`;

          return (
            <div key={linea.multipv} className={`rounded-xl p-3 border ${BG_LINEAS[i] ?? BG_LINEAS[2]}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_LINEAS[i] ?? DOT_LINEAS[2]}`} />
                <span className="text-xs font-extrabold font-mono text-slate-700">{etiqueta}</span>
              </div>
              <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                {linea.san.slice(0, 8).map((mov, j) => (
                  <span key={j} className={`text-xs font-mono ${j === 0 ? 'text-slate-900 font-extrabold' : 'text-slate-600 font-semibold'}`}>
                    {mov}
                  </span>
                ))}
                {linea.san.length > 8 && <span className="text-[10px] text-slate-400">...</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}