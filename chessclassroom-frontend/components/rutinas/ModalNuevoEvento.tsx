'use client';
 
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Clock, ChevronDown } from 'lucide-react';
 
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
 
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTOS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
 
type CampoError = 'titulo' | 'horaInicio' | 'fechaInicio' | 'rangoInicio' | 'rangoFin' | 'diasSemana' | 'deadline' | 'rangoFechas';
 
// ── Dropdown con portal — se renderiza en <body> para escapar del overflow ──
function DropdownNumero({
  valor,
  opciones,
  placeholder,
  onChange,
  tieneError = false,
}: {
  valor: string;
  opciones: string[];
  placeholder: string;
  onChange: (v: string) => void;
  tieneError?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
 
  // Calcular posición del botón en pantalla al abrir
  const abrir = () => {
    if (botonRef.current) {
      const r = botonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    }
    setAbierto(true);
  };
 
  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (botonRef.current?.contains(target)) return;
      if (listaRef.current?.contains(target)) return;
      setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abierto]);
 
  // Scroll al valor seleccionado cuando se abre
  useEffect(() => {
    if (abierto && valor && listaRef.current) {
      const el = listaRef.current.querySelector(`[data-val="${valor}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [abierto]);
 
  const lista = abierto && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={listaRef}
          className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 64),   // ← width en vez de minWidth
            maxWidth: 80,                       // ← máximo 80px, se ajusta al selector
            maxHeight: 180,                     // ← un poco menos de alto
            zIndex: 9999,
          }}
        >
          {opciones.map(op => (
            <button
              key={op}
              data-val={op}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(op); setAbierto(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors cursor-pointer
                ${op === valor ? 'bg-blue-500 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {op}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;
 
  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => abierto ? setAbierto(false) : abrir()}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[52px] justify-between cursor-pointer
          ${tieneError
            ? 'border border-red-300 bg-red-50 text-red-500'
            : abierto
              ? 'border border-blue-300 bg-blue-50 text-blue-700'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
      >
        <span>{valor || <span className="text-slate-400 text-xs">{placeholder}</span>}</span>
        <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ml-0.5
          ${abierto ? 'rotate-180' : ''}
          ${tieneError ? 'text-red-400' : 'text-slate-400'}`}
        />
      </button>
      {lista}
    </>
  );
}
 
// ── Selector HH:MM ────────────────────────────────────────
function SelectorHora({
  value,
  onChange,
  tieneError = false,
}: {
  value: string;
  onChange: (v: string) => void;
  tieneError?: boolean;
}) {
  const [hh, mm] = value ? value.split(':') : ['', ''];
  const setHH = (h: string) => onChange(mm ? `${h}:${mm}` : `${h}:00`);
  const setMM = (m: string) => onChange(hh ? `${hh}:${m}` : `00:${m}`);
 
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-colors
      ${tieneError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}
    `}>
      <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${tieneError ? 'text-red-400' : 'text-slate-400'}`} />
      <DropdownNumero valor={hh} opciones={HORAS} placeholder="HH" onChange={setHH} tieneError={tieneError} />
      <span className={`text-sm font-bold ${tieneError ? 'text-red-400' : 'text-slate-400'}`}>:</span>
      <DropdownNumero valor={mm} opciones={MINUTOS} placeholder="MM" onChange={setMM} tieneError={tieneError} />
    </div>
  );
}
 
// ── Modal principal ───────────────────────────────────────
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
  const [camposConError, setCamposConError] = useState<CampoError[]>([]);
  const [mensajesError, setMensajesError] = useState<string[]>([]);
 
  const esDeberes = tipo === 'deberes';
 
  const toggleDia = (dia: number) => {
    setDiasSemana(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
    setCamposConError(prev => prev.filter(c => c !== 'diasSemana'));
  };
 
  const tieneError = (campo: CampoError) => camposConError.includes(campo);
  const limpiarError = (...campos: CampoError[]) =>
    setCamposConError(prev => prev.filter(c => !campos.includes(c)));
 
  const validar = (): { errores: string[]; campos: CampoError[] } => {
    const errores: string[] = [];
    const campos: CampoError[] = [];
 
    if (!titulo.trim()) { errores.push('El título es obligatorio.'); campos.push('titulo'); }
    if (!esDeberes) {
      if (!horaInicio) { errores.push('La hora de inicio es obligatoria.'); campos.push('horaInicio'); }
      if (seRepite) {
        if (!rangoInicio) { errores.push('La fecha de inicio del rango es obligatoria.'); campos.push('rangoInicio'); }
        if (!rangoFin) { errores.push('La fecha de fin del rango es obligatoria.'); campos.push('rangoFin'); }
        if (diasSemana.length === 0) { errores.push('Selecciona al menos un día de la semana.'); campos.push('diasSemana'); }
        if (rangoInicio && rangoFin && rangoFin < rangoInicio) { errores.push('La fecha de fin debe ser posterior a la de inicio.'); campos.push('rangoFechas'); }
      } else {
        if (!fechaInicio) { errores.push('La fecha del evento es obligatoria.'); campos.push('fechaInicio'); }
      }
    } else {
      if (!deadline) { errores.push('La fecha límite es obligatoria.'); campos.push('deadline'); }
    }
    return { errores, campos };
  };
 
  const handleCrear = () => {
    const { errores, campos } = validar();
    if (errores.length > 0) { setMensajesError(errores); setCamposConError(campos); return; }
    setMensajesError([]); setCamposConError([]);
    const fechaBase = seRepite ? rangoInicio : fechaInicio;
    onCrear({
      titulo: titulo.trim(), tipo,
      fecha_inicio: esDeberes ? `${deadline}T00:00:00` : `${fechaBase}T${horaInicio}:00`,
      fecha_fin: !esDeberes && horaFin ? `${fechaBase}T${horaFin}:00` : null,
      deadline: esDeberes ? `${deadline}T23:59:00` : null,
      se_repite: seRepite,
      rango_inicio: seRepite ? rangoInicio : null,
      rango_fin: seRepite ? rangoFin : null,
      dias_semana: seRepite ? diasSemana : null,
    });
  };
 
  const inputClass = (campo: CampoError) =>
    `w-full text-black text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors
     ${tieneError(campo) ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-slate-200 focus:ring-blue-300'}`;
 
  return (
    // El modal NO tiene overflow-y-auto para no recortar los dropdowns
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
 
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Nuevo evento</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
 
        {mensajesError.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
            {mensajesError.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> {e}
              </div>
            ))}
          </div>
        )}
 
        <div className="flex flex-col gap-4">
 
          {/* Título */}
          <div>
            <label className={`text-sm font-medium mb-1 block ${tieneError('titulo') ? 'text-red-600' : 'text-slate-700'}`}>
              Título <span className="text-red-500">*</span>
            </label>
            <input type="text" value={titulo}
              onChange={e => { setTitulo(e.target.value); limpiarError('titulo'); }}
              placeholder="Ej: Clase online, Torneo de primavera..."
              className={inputClass('titulo')} autoFocus />
          </div>
 
          {/* Tipo */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {(['clase', 'torneo', 'deberes'] as const).map(t => (
                <button key={t}
                  onClick={() => { setTipo(t); setSeRepite(false); setMensajesError([]); setCamposConError([]); }}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors capitalize cursor-pointer
                    ${tipo === t
                      ? t === 'clase' ? 'bg-blue-500 text-white border-blue-500'
                        : t === 'torneo' ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >{t}</button>
              ))}
            </div>
          </div>
 
          {/* Toggle repetición */}
          {!esDeberes && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSeRepite(!seRepite)}
                className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none cursor-pointer ${seRepite ? 'bg-blue-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${seRepite ? 'left-5' : 'left-1'}`} />
              </button>
              <span className="text-sm text-slate-700">Se repite semanalmente</span>
            </div>
          )}
 
          {/* Días de la semana */}
          {seRepite && !esDeberes && (
            <div>
              <label className={`text-sm font-medium mb-2 block ${tieneError('diasSemana') ? 'text-red-600' : 'text-slate-700'}`}>
                Días <span className="text-red-500">*</span>
                {tieneError('diasSemana') && <span className="ml-2 text-xs font-normal">— Selecciona al menos uno</span>}
              </label>
              <div className={`flex gap-1.5 p-1.5 rounded-xl border transition-colors ${tieneError('diasSemana') ? 'border-red-300 bg-red-50' : 'border-transparent'}`}>
                {DIAS.map(d => (
                  <button key={d.value} onClick={() => toggleDia(d.value)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors cursor-pointer
                      ${diasSemana.includes(d.value) ? 'bg-blue-500 text-white'
                        : tieneError('diasSemana') ? 'bg-red-100 text-red-500 hover:bg-red-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >{d.label}</button>
                ))}
              </div>
            </div>
          )}
 
          {/* Rango fechas */}
          {seRepite && !esDeberes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-sm font-medium mb-1 block ${tieneError('rangoInicio') ? 'text-red-600' : 'text-slate-700'}`}>
                  Desde <span className="text-red-500">*</span>
                </label>
                <input type="date" value={rangoInicio}
                  onChange={e => { setRangoInicio(e.target.value); limpiarError('rangoInicio', 'rangoFechas'); }}
                  className={inputClass('rangoInicio')} />
              </div>
              <div>
                <label className={`text-sm font-medium mb-1 block ${tieneError('rangoFin') || tieneError('rangoFechas') ? 'text-red-600' : 'text-slate-700'}`}>
                  Hasta <span className="text-red-500">*</span>
                </label>
                <input type="date" value={rangoFin}
                  onChange={e => { setRangoFin(e.target.value); limpiarError('rangoFin', 'rangoFechas'); }}
                  className={inputClass(tieneError('rangoFechas') ? 'rangoFechas' : 'rangoFin')} />
              </div>
            </div>
          )}
 
          {/* Fecha puntual */}
          {!seRepite && !esDeberes && (
            <div>
              <label className={`text-sm font-medium mb-1 block ${tieneError('fechaInicio') ? 'text-red-600' : 'text-slate-700'}`}>
                Fecha <span className="text-red-500">*</span>
              </label>
              <input type="date" value={fechaInicio}
                onChange={e => { setFechaInicio(e.target.value); limpiarError('fechaInicio'); }}
                className={inputClass('fechaInicio')} />
            </div>
          )}
 
          {/* Selectores de hora */}
          {!esDeberes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-sm font-medium mb-1 block ${tieneError('horaInicio') ? 'text-red-600' : 'text-slate-700'}`}>
                  Hora inicio <span className="text-red-500">*</span>
                </label>
                <SelectorHora value={horaInicio}
                  onChange={v => { setHoraInicio(v); limpiarError('horaInicio'); }}
                  tieneError={tieneError('horaInicio')} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Hora fin</label>
                <SelectorHora value={horaFin} onChange={setHoraFin} />
              </div>
            </div>
          )}
 
          {/* Deadline deberes */}
          {esDeberes && (
            <div>
              <label className={`text-sm font-medium mb-1 block ${tieneError('deadline') ? 'text-red-600' : 'text-slate-700'}`}>
                Fecha límite <span className="text-red-500">*</span>
              </label>
              <input type="date" value={deadline}
                onChange={e => { setDeadline(e.target.value); limpiarError('deadline'); }}
                className={inputClass('deadline')} />
            </div>
          )}
        </div>
 
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleCrear}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium cursor-pointer">
            Crear evento
          </button>
        </div>
      </div>
    </div>
  );
}