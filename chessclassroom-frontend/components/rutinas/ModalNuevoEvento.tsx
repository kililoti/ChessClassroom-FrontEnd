'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface Props {
  claseId: string;
  alumnoId: string | null;
  onCrear: (evento: any) => void;
  onCerrar: () => void;
}

const DIAS = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'X', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 7 },
];

export default function ModalNuevoEvento({ onCrear, onCerrar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'clase' | 'torneo' | 'deberes'>('clase');
  const [seRepite, setSeRepite] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [rangoInicio, setRangoInicio] = useState('');
  const [rangoFin, setRangoFin] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errores, setErrores] = useState<string[]>([]);

  const esDeberes = tipo === 'deberes';

  const toggleDia = (dia: number) => {
    setDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const validar = (): string[] => {
    const errs: string[] = [];
    if (!titulo.trim()) errs.push('El título es obligatorio.');
    if (!esDeberes) {
      if (!horaInicio) errs.push('La hora de inicio es obligatoria.');
      if (seRepite) {
        if (!rangoInicio) errs.push('La fecha de inicio del rango es obligatoria.');
        if (!rangoFin) errs.push('La fecha de fin del rango es obligatoria.');
        if (diasSemana.length === 0) errs.push('Selecciona al menos un día de la semana.');
        if (rangoInicio && rangoFin && rangoFin < rangoInicio)
          errs.push('La fecha de fin debe ser posterior a la de inicio.');
      } else {
        if (!fechaInicio) errs.push('La fecha del evento es obligatoria.');
      }
    } else {
      if (!deadline) errs.push('La fecha límite es obligatoria.');
    }
    return errs;
  };

  const handleCrear = () => {
    const errs = validar();
    if (errs.length > 0) { setErrores(errs); return; }
    setErrores([]);

    const fechaBase = seRepite ? rangoInicio : fechaInicio;

    onCrear({
      titulo: titulo.trim(),
      tipo,
      fecha_inicio: esDeberes ? `${deadline}T00:00:00` : `${fechaBase}T${horaInicio}:00`,
      fecha_fin: !esDeberes && horaFin ? `${fechaBase}T${horaFin}:00` : null,
      deadline: esDeberes ? `${deadline}T23:59:00` : null,
      se_repite: seRepite,
      rango_inicio: seRepite ? rangoInicio : null,
      rango_fin: seRepite ? rangoFin : null,
      dias_semana: seRepite ? diasSemana : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Nuevo evento</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Errores */}
        {errores.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
            {errores.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> {e}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Título */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Clase online, Torneo de primavera..."
              className={`w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-300
                ${errores.some(e => e.includes('título')) ? 'border-red-300' : 'border-slate-200'}
              `}
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Tipo <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(['clase', 'torneo', 'deberes'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTipo(t); setSeRepite(false); setErrores([]); }}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors capitalize
                    ${tipo === t
                      ? t === 'clase'   ? 'bg-blue-500 text-white border-blue-500'
                        : t === 'torneo' ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle repetición */}
          {!esDeberes && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSeRepite(!seRepite)}
                className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none
                  ${seRepite ? 'bg-blue-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all
                  ${seRepite ? 'left-5' : 'left-1'}`}
                />
              </button>
              <span className="text-sm text-slate-700">Se repite semanalmente</span>
            </div>
          )}

          {/* Días de la semana */}
          {seRepite && !esDeberes && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Días <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                {DIAS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => toggleDia(d.value)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors
                      ${diasSemana.includes(d.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rango fechas */}
          {seRepite && !esDeberes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Desde <span className="text-red-500">*</span>
                </label>
                <input type="date" value={rangoInicio} onChange={e => setRangoInicio(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Hasta <span className="text-red-500">*</span>
                </label>
                <input type="date" value={rangoFin} onChange={e => setRangoFin(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
          )}

          {/* Fecha puntual */}
          {!seRepite && !esDeberes && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          )}

          {/* Horas — formato 24h forzado con lang */}
          {!esDeberes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Hora inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  lang="es-ES"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className={`w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-300
                    ${errores.some(e => e.includes('hora')) ? 'border-red-300' : 'border-slate-200'}
                  `}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Hora fin</label>
                <input
                  type="time"
                  lang="es-ES"
                  value={horaFin}
                  onChange={e => setHoraFin(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          )}

          {/* Deadline deberes */}
          {esDeberes && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Fecha límite <span className="text-red-500">*</span>
              </label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className={`w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-300
                  ${errores.some(e => e.includes('límite')) ? 'border-red-300' : 'border-slate-200'}
                `}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
          >
            Crear evento
          </button>
        </div>
      </div>
    </div>
  );
}