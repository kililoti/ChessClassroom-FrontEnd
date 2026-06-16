import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePartidaTimerOptions {
  tiempoInicialBlancasMs: number;
  tiempoInicialNegrasMs: number;
  turnoInicial: 'w' | 'b';
  activo: boolean;
  onTiempoAgotado?: (colorSinTiempo: 'w' | 'b') => void;
}

export function usePartidaTimer({
  tiempoInicialBlancasMs,
  tiempoInicialNegrasMs,
  turnoInicial,
  onTiempoAgotado,
}: UsePartidaTimerOptions) {
  const [tiempoBlancasMs, setTiempoBlancasMs] = useState(tiempoInicialBlancasMs);
  const [tiempoNegrasMs, setTiempoNegrasMs]   = useState(tiempoInicialNegrasMs);
  const [turno, setTurno]                     = useState<'w' | 'b'>(turnoInicial);

  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const ultimoTickRef      = useRef<number>(Date.now());
  const turnoRef           = useRef<'w' | 'b'>(turnoInicial);
  const corriendoRef       = useRef(false);
  const agotadoRef         = useRef(false); // evitar notificar múltiples veces
  const onTiempoAgotadoRef = useRef(onTiempoAgotado);

  useEffect(() => { turnoRef.current = turno; }, [turno]);
  useEffect(() => { onTiempoAgotadoRef.current = onTiempoAgotado; }, [onTiempoAgotado]);

  const detener = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    corriendoRef.current = false;
  }, []);

  const iniciarInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    ultimoTickRef.current = Date.now();
    corriendoRef.current  = true;
    agotadoRef.current    = false;

    intervalRef.current = setInterval(() => {
      const ahora   = Date.now();
      const elapsed = ahora - ultimoTickRef.current;
      ultimoTickRef.current = ahora;

      if (turnoRef.current === 'w') {
        setTiempoBlancasMs(prev => {
          const nuevo = Math.max(0, prev - elapsed);
          if (nuevo === 0 && !agotadoRef.current) {
            agotadoRef.current = true;
            onTiempoAgotadoRef.current?.('w');
          }
          return nuevo;
        });
      } else {
        setTiempoNegrasMs(prev => {
          const nuevo = Math.max(0, prev - elapsed);
          if (nuevo === 0 && !agotadoRef.current) {
            agotadoRef.current = true;
            onTiempoAgotadoRef.current?.('b');
          }
          return nuevo;
        });
      }
    }, 100);
  }, []);

  const iniciar = useCallback(() => {
    iniciarInterval();
  }, [iniciarInterval]);

  const sincronizar = useCallback((
    nuevoTiempoBlancasMs: number,
    nuevoTiempoNegrasMs: number,
    nuevoTurno: 'w' | 'b',
  ) => {
    turnoRef.current = nuevoTurno;
    setTurno(nuevoTurno);
    setTiempoBlancasMs(nuevoTiempoBlancasMs);
    setTiempoNegrasMs(nuevoTiempoNegrasMs);
    iniciarInterval();
  }, [iniciarInterval]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return {
    tiempoBlancasMs,
    tiempoNegrasMs,
    turno,
    iniciar,
    detener,
    sincronizar,
    setTurno,
    setTiempos: (b: number, n: number) => {
      setTiempoBlancasMs(b);
      setTiempoNegrasMs(n);
    },
  };
}

export function formatTiempoReloj(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeg = Math.ceil(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}