import { useState, useEffect, useRef, useCallback } from 'react';

export interface LineaAnalisis {
  multipv: number;
  profundidad: number;
  evaluacion: number;
  jugadas: string[];
  san: string[];
  mate: number | null;
}

export interface FletchaStockfish {
  desde: string;
  hasta: string;
  color?: string;
}

interface UseStockfishReturn {
  activo: boolean;
  cargando: boolean;
  profundidad: number;
  setProfundidad: (d: number) => void;
  lineas: LineaAnalisis[];
  flechas: FletchaStockfish[];
  activar: () => void;
  desactivar: () => void;
  analizarFen: (fen: string) => void;
}

function uciAsan(uciMoves: string[], fenInicial: string): string[] {
  try {
    const { Chess } = require('chess.js');
    const game = new Chess(fenInicial);
    const san: string[] = [];
    for (const uci of uciMoves) {
      const from = uci.slice(0, 2);
      const to   = uci.slice(2, 4);
      const prom = uci.length === 5 ? uci[4] : undefined;
      try {
        const move = game.move({ from, to, promotion: prom });
        if (move) san.push(move.san);
        else break;
      } catch { break; }
    }
    return san;
  } catch { return uciMoves; }
}

function parsearLineaInfo(linea: string, fenActual: string): LineaAnalisis | null {
  if (!linea.startsWith('info') || !linea.includes(' pv ')) return null;
  if (!linea.includes('multipv')) return null;

  const depthMatch   = linea.match(/depth (\d+)/);
  const multipvMatch = linea.match(/multipv (\d+)/);
  const scoreMatch   = linea.match(/score (cp|mate) (-?\d+)/);
  const pvMatch      = linea.match(/ pv (.+)/);

  if (!depthMatch || !multipvMatch || !scoreMatch || !pvMatch) return null;

  const profundidad = parseInt(depthMatch[1]);
  const multipv     = parseInt(multipvMatch[1]);
  const scoreType   = scoreMatch[1];
  const scoreVal    = parseInt(scoreMatch[2]);
  const jugadasUci  = pvMatch[1].trim().split(' ');

  const evaluacion = scoreType === 'cp' ? scoreVal / 100 : (scoreVal > 0 ? 9999 : -9999);
  const mate       = scoreType === 'mate' ? scoreVal : null;
  const san        = uciAsan(jugadasUci, fenActual);

  return { multipv, profundidad, evaluacion, jugadas: jugadasUci, san, mate };
}

const COLORES_FLECHAS = [
  'rgba(0, 128, 255, 0.85)',
  'rgba(0, 200, 100, 0.65)',
  'rgba(255, 160, 0, 0.55)',
];

export function useStockfish(): UseStockfishReturn {
  const [activo, setActivo]           = useState(false);
  const [cargando, setCargando]       = useState(false);
  const [profundidad, setProfundidad] = useState(18);
  const [lineas, setLineas]           = useState<LineaAnalisis[]>([]);
  const [flechas, setFlechas]         = useState<FletchaStockfish[]>([]);

  const workerRef      = useRef<Worker | null>(null);
  const fenActualRef   = useRef<string>('');
  const fenPendienteRef = useRef<string | null>(null);  // FEN que espera ser analizado
  const lineasRef      = useRef<Map<number, LineaAnalisis>>(new Map());
  const listoRef       = useRef<boolean>(false);   // uciok recibido
  const buscandoRef    = useRef<boolean>(false);   // go en curso, esperando bestmove
  const activoRef      = useRef<boolean>(false);
  const profRef        = useRef<number>(18);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { activoRef.current = activo; }, [activo]);
  useEffect(() => { profRef.current = profundidad; }, [profundidad]);

  // Lanza el análisis del FEN pendiente, solo si el motor no está buscando
  const lanzarPendiente = useCallback((worker: Worker) => {
    const fen = fenPendienteRef.current;
    if (!fen || buscandoRef.current) return;

    fenPendienteRef.current = null;
    fenActualRef.current = fen;
    lineasRef.current.clear();
    setLineas([]);
    setFlechas([]);
    buscandoRef.current = true;
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${profRef.current}`);
  }, []);

  const crearWorker = useCallback(() => {
    if (workerRef.current) {
      try { workerRef.current.postMessage('quit'); } catch {}
      workerRef.current.terminate();
      workerRef.current = null;
    }
    listoRef.current = false;
    buscandoRef.current = false;
    setCargando(true);

    const worker = new Worker('/stockfish/stockfish-18-lite-single.js');

    worker.onmessage = (e: MessageEvent) => {
      const msg: string = typeof e.data === 'string' ? e.data : '';

      if (msg === 'uciok') {
        worker.postMessage('setoption name MultiPV value 3');
        listoRef.current = true;
        setCargando(false);
        if (activoRef.current) lanzarPendiente(worker);
        return;
      }

      // Motor terminó la búsqueda actual → comprobar si hay un FEN pendiente
      if (msg.startsWith('bestmove')) {
        buscandoRef.current = false;
        if (activoRef.current && fenPendienteRef.current) {
          lanzarPendiente(worker);
        }
        return;
      }

      if (msg.startsWith('info') && msg.includes(' pv ')) {
        const linea = parsearLineaInfo(msg, fenActualRef.current);
        if (linea && linea.profundidad >= 5) {
          lineasRef.current.set(linea.multipv, linea);
          const arr = Array.from(lineasRef.current.values())
            .sort((a, b) => a.multipv - b.multipv);
          setLineas([...arr]);

          const nuevasFlechas: FletchaStockfish[] = arr
            .filter(l => l.jugadas.length >= 1)
            .map((l, i) => ({
              desde: l.jugadas[0].slice(0, 2),
              hasta: l.jugadas[0].slice(2, 4),
              color: COLORES_FLECHAS[i] ?? COLORES_FLECHAS[2],
            }))
            .filter((f, i, self) =>
              i === self.findIndex(x => x.desde === f.desde && x.hasta === f.hasta)
            );
          setFlechas(nuevasFlechas);
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish worker error:', err.message, err.filename, err.lineno);
      listoRef.current = false;
      buscandoRef.current = false;
      if (activoRef.current) {
        console.warn('Stockfish crasheó, reiniciando worker...');
        // Poner el FEN actual como pendiente para que se reanude tras el reinicio
        fenPendienteRef.current = fenActualRef.current || fenPendienteRef.current;
        setTimeout(() => {
          if (activoRef.current) crearWorker();
        }, 800);
      } else {
        setCargando(false);
      }
    };

    workerRef.current = worker;
    worker.postMessage('uci');
  }, [lanzarPendiente]);

  const activar = useCallback(() => {
    setActivo(true);
    activoRef.current = true;
    crearWorker();
  }, [crearWorker]);

  const desactivar = useCallback(() => {
    setActivo(false);
    activoRef.current = false;
    listoRef.current = false;
    buscandoRef.current = false;
    fenPendienteRef.current = null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (workerRef.current) {
      try { workerRef.current.postMessage('quit'); } catch {}
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setLineas([]);
    setFlechas([]);
    lineasRef.current.clear();
    setCargando(false);
  }, []);

  const analizarFen = useCallback((fen: string) => {
    if (!activoRef.current) return;

    // Debounce: acumula cambios rápidos y solo procesa el último
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fenPendienteRef.current = fen;
      // Si el motor no está buscando, lanzar ahora; si está buscando,
      // el bestmove handler lo lanzará cuando termine
      if (listoRef.current && !buscandoRef.current && workerRef.current) {
        lanzarPendiente(workerRef.current);
      }
      // Si está buscando, mandar stop para que termine antes
      else if (listoRef.current && buscandoRef.current && workerRef.current) {
        workerRef.current.postMessage('stop');
        // bestmove llegará enseguida y lanzará el pendiente
      }
    }, 150);
  }, [lanzarPendiente]);

  // Cambio de profundidad: poner FEN actual como pendiente y parar búsqueda actual
  useEffect(() => {
    if (!activo || !listoRef.current || !fenActualRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fenPendienteRef.current = fenActualRef.current;
      if (buscandoRef.current && workerRef.current) {
        workerRef.current.postMessage('stop');
        // bestmove llegará y relanzará con la nueva profundidad
      } else if (workerRef.current) {
        lanzarPendiente(workerRef.current);
      }
    }, 150);
  }, [profundidad, activo, lanzarPendiente]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      desactivar();
    };
  }, [desactivar]);

  return {
    activo, cargando, profundidad, setProfundidad,
    lineas, flechas, activar, desactivar, analizarFen,
  };
}