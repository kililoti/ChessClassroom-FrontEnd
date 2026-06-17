'use client';
 
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Check, X } from 'lucide-react';
import { EventoCalendario, RutinaChecklist } from '@/types/rutinas';
 
interface Props {
  eventos: EventoCalendario[];
  rutinas: RutinaChecklist[];
  esProfesor: boolean;
  esVistaGrupal: boolean;
  onEliminar: (eventoId: string, soloEste: boolean, desdeGrupo: boolean) => void;
  onMesCambiado?: (anio: number, mes: number) => void;
}
 
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['L','M','X','J','V','S','D'];
 
const colorTipo = {
  clase:   'bg-blue-100 text-blue-700 border-blue-200',
  torneo:  'bg-purple-100 text-purple-700 border-purple-200',
  deberes: 'bg-amber-100 text-amber-700 border-amber-200',
};
 
const extraerFechaLocal = (fechaStr: string): { anio: number; mes: number; dia: number } => {
  const soloFecha = fechaStr.substring(0, 10);
  const [a, m, d] = soloFecha.split('-').map(Number);
  return { anio: a, mes: m - 1, dia: d };
};
 
const parsearFechaLocal = (fechaStr: string): Date => {
  if (!fechaStr.endsWith('Z') && !fechaStr.includes('+')) {
    const [fecha, hora] = fechaStr.split('T');
    const [a, m, d] = fecha.split('-').map(Number);
    const [h, mi] = (hora ?? '00:00').split(':').map(Number);
    return new Date(a, m - 1, d, h, mi);
  }
  return new Date(fechaStr);
};
 
const getLunesDeSemana = (anio: number, mes: number, dia: number): string => {
  const d = new Date(anio, mes, dia);
  const diaSemana = d.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
 
const formatHora = (fechaStr: string): string =>
  parsearFechaLocal(fechaStr).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', hour12: false
  });
 
export default function CalendarioMensual({ eventos, rutinas, esProfesor, esVistaGrupal, onEliminar, onMesCambiado }: Props) {
  const hoy = new Date();
  const hoyDia = hoy.getDate();
  const hoyMes = hoy.getMonth();
  const hoyAnio = hoy.getFullYear();
 
  const [mes, setMes] = useState(hoyMes);
  const [anio, setAnio] = useState(hoyAnio);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoCalendario | null>(null);
  const [mostrarEventosDia, setMostrarEventosDia] = useState<{ dia: number; eventos: EventoCalendario[] } | null>(null);
 
  useEffect(() => {
    onMesCambiado?.(anio, mes);
  }, [anio, mes]);
 
  const primerDia = new Date(anio, mes, 1);
  const diaInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
  const totalDias = new Date(anio, mes + 1, 0).getDate();
 
  const celdas: (number | null)[] = Array.from({ length: diaInicio + totalDias }, (_, i) =>
    i < diaInicio ? null : i - diaInicio + 1
  );
  while (celdas.length % 7 !== 0) celdas.push(null);
 
  // Filas de 7 celdas
  const filas: (number | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7));
 
  const getEventosDia = (dia: number): EventoCalendario[] =>
    eventos.filter(e => {
      const fechaStr = e.tipo === 'deberes' && e.deadline ? e.deadline : e.fecha_inicio;
      const { anio: a, mes: m, dia: d } = extraerFechaLocal(fechaStr);
      return d === dia && m === mes && a === anio;
    });
 
  const getEstadoSemana = (primerDiaFila: number): 'completado' | 'expirado' | 'pendiente' | 'vacio' => {
    if (esVistaGrupal || rutinas.length === 0) return 'vacio';
 
    const lunesSemana = getLunesDeSemana(anio, mes, primerDiaFila);
    const domingoSemana = new Date(lunesSemana + 'T00:00:00');
    domingoSemana.setDate(domingoSemana.getDate() + 6);
    domingoSemana.setHours(23, 59, 59, 999);
 
    const rutinasEsaSemana = rutinas.filter(r => r.semana?.semana_inicio === lunesSemana);
    if (rutinasEsaSemana.length === 0) return 'vacio';
 
    if (rutinasEsaSemana.every(r => r.semana?.completado)) return 'completado';
    if (new Date() > domingoSemana) return 'expirado';
    return 'pendiente';
  };
 
  const anteriorMes = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
  };
 
  const siguienteMes = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
  };
 
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 
      {/* Cabecera mes */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <button onClick={anteriorMes} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">{MESES[mes]} {anio}</h2>
        <button onClick={siguienteMes} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
 
      {/* Cabecera días */}
      <div className="flex border-b border-slate-100">
        <div className="w-6 flex-shrink-0 border-r border-slate-100" />
        {DIAS_SEMANA.map(d => (
          <div key={d} className="flex-1 text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>
 
      {/* Filas — tick y celdas en el mismo flex para compartir altura real */}
      <div>
        {filas.map((fila, filaIdx) => {
          const primerDiaReal = fila.find(c => c !== null) ?? 1;
          const estado = getEstadoSemana(primerDiaReal);
 
          return (
            <div key={filaIdx} className="flex border-b border-slate-100 last:border-b-0">
 
              {/* Tick — ocupa la misma altura que la fila porque está en el mismo flex */}
              <div className="w-6 flex-shrink-0 border-r border-slate-100 flex items-center justify-center">
                {estado === 'completado' && (
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center" title="Rutinas completadas">
                    <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
                  </div>
                )}
                {estado === 'expirado' && (
                  <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center" title="Rutinas no completadas">
                    <X className="w-2.5 h-2.5 text-red-500" strokeWidth={3} />
                  </div>
                )}
              </div>
 
              {/* Celdas de días */}
              {fila.map((dia, diaIdx) => {
                const esHoy = dia === hoyDia && mes === hoyMes && anio === hoyAnio;
                const eventosDelDia = dia ? getEventosDia(dia) : [];
                const hayMas = eventosDelDia.length > 2;
 
                return (
                  <div
                    key={diaIdx}
                    className={`flex-1 min-h-[90px] p-1.5 border-r border-slate-100 last:border-r-0
                      ${!dia ? 'bg-slate-50/50' : 'hover:bg-slate-50/80'}
                    `}
                  >
                    {dia && (
                      <>
                        <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1
                          ${esHoy ? 'bg-blue-500 text-white' : 'text-slate-600'}
                        `}>
                          {dia}
                        </span>
                        <div className="space-y-0.5">
                          {eventosDelDia.slice(0, 2).map(e => (
                            <button
                              key={e.id}
                              onClick={() => setEventoSeleccionado(e)}
                              className={`w-full text-left text-[10px] font-medium px-1 py-0.5 rounded border truncate cursor-pointer ${colorTipo[e.tipo]}`}
                            >
                              {e.titulo}
                            </button>
                          ))}
                          {hayMas && (
                            <button
                              onClick={() => setMostrarEventosDia({ dia, eventos: eventosDelDia })}
                              className="text-[10px] text-blue-500 hover:text-blue-700 pl-1 font-medium cursor-pointer"
                            >
                              +{eventosDelDia.length - 2} más
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
 
      {/* Leyenda */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Clase</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Torneo</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Deberes</span>
        {!esVistaGrupal && (
          <>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Rutinas ok</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Sin completar</span>
          </>
        )}
      </div>
 
      {/* Modal lista completa de eventos de un día */}
      {mostrarEventosDia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setMostrarEventosDia(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Día {mostrarEventosDia.dia} de {MESES[mes]}</h3>
              <button onClick={() => setMostrarEventosDia(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <div className="space-y-2">
              {mostrarEventosDia.eventos.map(e => (
                <button key={e.id} onClick={() => { setEventoSeleccionado(e); setMostrarEventosDia(null); }}
                  className={`w-full text-left text-sm font-medium px-3 py-2 rounded-xl border cursor-pointer ${colorTipo[e.tipo]}`}>
                  <span className="capitalize font-semibold">{e.tipo}</span> — {e.titulo}
                  {e.tipo !== 'deberes' && (
                    <span className="block text-xs opacity-70 mt-0.5">
                      {formatHora(e.fecha_inicio)}{e.fecha_fin ? ` — ${formatHora(e.fecha_fin)}` : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
 
      {/* Modal detalle de un evento */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEventoSeleccionado(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                  ${eventoSeleccionado.tipo === 'clase' ? 'bg-blue-100 text-blue-700' : ''}
                  ${eventoSeleccionado.tipo === 'torneo' ? 'bg-purple-100 text-purple-700' : ''}
                  ${eventoSeleccionado.tipo === 'deberes' ? 'bg-amber-100 text-amber-700' : ''}
                `}>{eventoSeleccionado.tipo}</span>
                <h3 className="font-bold text-slate-800 mt-1">{eventoSeleccionado.titulo}</h3>
              </div>
              <button onClick={() => setEventoSeleccionado(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            {eventoSeleccionado.tipo !== 'deberes' && (
              <p className="text-sm text-slate-600">
                🕐 {formatHora(eventoSeleccionado.fecha_inicio)}
                {eventoSeleccionado.fecha_fin && ` — ${formatHora(eventoSeleccionado.fecha_fin)}`}
              </p>
            )}
            {eventoSeleccionado.deadline && (
              <p className="text-sm text-amber-600">
                📅 Entrega: {parsearFechaLocal(eventoSeleccionado.deadline).toLocaleDateString('es-ES')}
              </p>
            )}
            {esProfesor && (
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => { onEliminar(eventoSeleccionado.id, true, esVistaGrupal); setEventoSeleccionado(null); }}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                  <Trash2 className="w-4 h-4" /> Eliminar este día
                </button>
                {eventoSeleccionado.se_repite && (
                  <button onClick={() => { onEliminar(eventoSeleccionado.id, false, esVistaGrupal); setEventoSeleccionado(null); }}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 transition-colors font-medium cursor-pointer">
                    <Trash2 className="w-4 h-4" /> Eliminar todos los días
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}