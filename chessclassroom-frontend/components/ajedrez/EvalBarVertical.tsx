interface Props {
  evaluacion: number;          // desde perspectiva de quien mueve (igual que LineaAnalisis.evaluacion)
  mate: number | null;         // idem, desde perspectiva de quien mueve
  turnoBlancas: boolean;       // true si en la posición actual mueven blancas
  orientation: 'white' | 'black';
  activo: boolean;
}

export default function EvalBarVertical({ evaluacion, mate, turnoBlancas, orientation, activo }: Props) {
  const evalBlancas = turnoBlancas ? evaluacion : -evaluacion;
  const mateBlancas = mate !== null ? (turnoBlancas ? mate : -mate) : null;

  let pctBlancas: number;
  if (mateBlancas !== null) {
    pctBlancas = mateBlancas > 0 ? 98 : 2;
  } else if (!activo) {
    pctBlancas = 50;
  } else {
    const clamped = Math.max(-10, Math.min(10, evalBlancas));
    pctBlancas = 50 + (clamped / 10) * 48;
  }

  const pctMostrado = orientation === 'black' ? 100 - pctBlancas : pctBlancas;

  const etiqueta = !activo
    ? ''
    : mateBlancas !== null
      ? `M${Math.abs(mateBlancas)}`
      : (evalBlancas > 0 ? '+' : '') + evalBlancas.toFixed(1);

  const etiquetaEnBlanco = orientation === 'black' ? pctMostrado < 50 : pctMostrado > 50;

  return (
    <div className="relative w-full h-full bg-slate-800 flex flex-col-reverse">
      <div
        className="w-full bg-white transition-all duration-500"
        style={{ height: `${pctMostrado}%` }}
      />
      {etiqueta && (
        <div
          className={`absolute left-0 right-0 text-center text-[10px] font-bold py-0.5
            ${etiquetaEnBlanco ? 'text-slate-800' : 'text-slate-200'}`}
          style={{
            [orientation === 'black'
              ? (pctMostrado < 50 ? 'top' : 'bottom')
              : (pctMostrado > 50 ? 'bottom' : 'top')]: 0,
          }}
        >
          {etiqueta}
        </div>
      )}
    </div>
  );
}