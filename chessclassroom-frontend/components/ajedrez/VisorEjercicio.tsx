'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Video, Save, X, Loader2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useChessGame } from '@/hooks/useChessGame';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';
import { Chess } from 'chess.js';

const API = 'http://localhost:3001/api/ejercicios';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export interface VisorEjercicioProps {
  ejercicioId: string;
  esProfesor: boolean;
  pgnInicial?: string;
  solucionPgn?: string;
  comentarioSolucion?: string;
  fechaEntrega?: string | null;
  onClose?: () => void;
}

export default function VisorEjercicio({
  ejercicioId,
  esProfesor,
  pgnInicial = '',
  solucionPgn: solucionPgnProp = '',
  comentarioSolucion: comentarioSolucionProp = '',
  fechaEntrega = null,
  onClose,
}: VisorEjercicioProps) {

  const [orientacion, setOrientacion]       = useState<'white' | 'black'>('white');
  const [grabando, setGrabando]             = useState(false);
  const [guardandoSol, setGuardandoSol]     = useState(false);
  
  const [tieneSolucion, setTieneSolucion]   = useState(!!solucionPgnProp);
  const [solucionPgn, setSolucionPgn]       = useState(solucionPgnProp);
  const [comentarioSolucion, setComentarioSolucion] = useState(comentarioSolucionProp);
  
  const [comentarioGuardado, setComentarioGuardado] = useState(comentarioSolucionProp);
  
  const [mostrandoSolucion, setMostrandoSolucion]   = useState(false);

  // El alumno solo puede ver la solución una vez pasada la fecha de entrega.
  // El profesor siempre puede verla.
  const puedeVerSolucion = esProfesor ||
    (fechaEntrega ? new Date() > new Date(fechaEntrega) : false);

  const {
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos, gameActual,
    pendingPromotion,
    orientacionInicial,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    cargarPgn,
  } = useChessGame({ pgnInicial });

  useEffect(() => {
    setOrientacion(orientacionInicial);
  }, [orientacionInicial]);

  // Iniciar grabación
  const iniciarGrabacion = () => {
    cargarPgn(pgnInicial);
    setGrabando(true);
    setMostrandoSolucion(false);
  };

  // Cancelar grabación
  const cancelarGrabacion = () => {
    cargarPgn(pgnInicial);
    setGrabando(false);
  };

  // Reiniciar grabación sin salir del modo
  const reiniciarGrabacion = () => {
    cargarPgn(pgnInicial);
  };

  // Guardar solución
  const guardarSolucion = async () => {
    if (!pgn.trim()) return;
    setGuardandoSol(true);
    
    try {
      const gameOriginal = new Chess();
      let originalCargado = false;
      try { gameOriginal.loadPgn(pgnInicial.trim()); originalCargado = true; } catch {
        try { gameOriginal.load(pgnInicial.trim()); originalCargado = true; } catch {}
      }

      const gamePropuesto = new Chess();
      let propuestoCargado = false;
      try { gamePropuesto.loadPgn(pgn.trim()); propuestoCargado = true; } catch {}

      if (originalCargado && propuestoCargado) {
        // CHECK FEN base intacto
        const fenOrig = gameOriginal.header()['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fenProp = gamePropuesto.header()['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        if (fenOrig.trim() !== fenProp.trim()) {
          alert('❌ Error de Integridad: La solución no arranca desde la posición inicial del ejercicio. Parece que usaste la planilla para retroceder y borraste la configuración base del problema.');
          setGuardandoSol(false);
          return;
        }

        // CHECK Movimientos previos intactos
        const histOrig = gameOriginal.history();
        const histProp = gamePropuesto.history();

        if (histProp.length < histOrig.length) {
          alert('❌ Error: La solución contiene menos movimientos que los pasos iniciales obligatorios del ejercicio.');
          setGuardandoSol(false);
          return;
        }

        for (let i = 0; i < histOrig.length; i++) {
          if (histProp[i] !== histOrig[i]) {
            alert(`❌ Error: El movimiento inicial número ${i + 1} (${histProp[i]}) ha sido alterado. Debe ser (${histOrig[i]}). No puedes modificar las jugadas que configuran el problema.`);
            setGuardandoSol(false);
            return;
          }
        }

        // CHECK Solución nueva real
        if (histProp.length === histOrig.length) {
          alert('⚠ Atención: No has añadido ninguna jugada nueva. Mueve las piezas en el tablero para registrar la solución del ejercicio antes de guardar.');
          setGuardandoSol(false);
          return;
        }

        // CHECK Solucion nueva diferente a la registrada
        if (tieneSolucion) {
          const gameYaGuardado = new Chess();
          try { gameYaGuardado.loadPgn(solucionPgn); } catch {}
          
          // Extraemos la secuencia de jugadas (ej: "e4 e5 Nf3") para ignorar cabeceras y metadatos
          const secuenciaYaGuardada = gameYaGuardado.history().join(' ');
          const secuenciaPropuesta = gamePropuesto.history().join(' ');

          const mismoComentario = comentarioSolucion.trim() === comentarioGuardado.trim();
          
          if (secuenciaYaGuardada === secuenciaPropuesta && mismoComentario) {
            alert('ℹ No hay cambios. Las jugadas y el comentario son idénticos a los que ya están guardados en la base de datos.');
            setGrabando(false);
            cargarPgn(pgnInicial);
            setGuardandoSol(false);
            return;
          }
        }
      }

      // Si hay cambios reales, hacer fetch
      const res = await fetch(`${API}/${ejercicioId}/solucion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          solucion_pgn: pgn.trim(),
          comentarios_solucion: comentarioSolucion.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error al guardar');
      
      setSolucionPgn(pgn.trim());
      setComentarioGuardado(comentarioSolucion.trim());
      
      setTieneSolucion(true);
      setGrabando(false);
      cargarPgn(pgnInicial);

      if (d.regrabado) {
        alert('🔄 Solución modificada con éxito.\nEl progreso anterior de los alumnos ha sido borrado y se les ha reasignado el nuevo ejercicio desde cero.');
      } else if (fechaEntrega) {
        alert('✅ Solución guardada.\nAl tener una fecha límite establecida, el ejercicio ha sido asignado automáticamente a todos los alumnos.');
      } else {
        alert('✅ Solución guardada.\nRecuerda establecer una "Fecha de Entrega" desde el explorador para que el ejercicio se asigne automáticamente.');
      }

    } catch (e: any) {
      alert(e.message);
    } finally {
      setGuardandoSol(false);
    }
  };

  // Mostrar / ocultar solución
  const toggleSolucion = () => {
    if (mostrandoSolucion) {
      cargarPgn(pgnInicial);
      setMostrandoSolucion(false);
    } else {
      cargarPgn(solucionPgn);
      setMostrandoSolucion(true);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4 px-4 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            Ejercicio
            {grabando && (
              <span className="text-sm font-semibold text-red-600 animate-pulse">
                ● Grabando solución
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Modo grabación: Reiniciar + Guardar + Cancelar */}
          {esProfesor && grabando && (
            <>
              <button
                onClick={reiniciarGrabacion}
                title="Volver a la posición inicial del problema"
                className="flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </button>

              <button
                onClick={guardarSolucion}
                disabled={!pgn.trim() || guardandoSol}
                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-full text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {guardandoSol
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {guardandoSol ? 'Guardando...' : 'Guardar solución'}
              </button>

              <button
                onClick={cancelarGrabacion}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-200 text-slate-700 rounded-full text-sm font-semibold hover:bg-slate-300 transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}

          {/* Modo normal: botón Grabar + indicador de estado */}
          {esProfesor && !grabando && (
            <>
              <button
                onClick={iniciarGrabacion}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-sm font-semibold transition-colors"
              >
                <Video className="w-4 h-4" />
                {tieneSolucion ? 'Regrabar solución' : 'Grabar solución'}
              </button>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                tieneSolucion
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {tieneSolucion ? '✓ Solución grabada' : '⚠ Sin solución'}
              </span>
            </>
          )}

          {/* Botón Ver / Ocultar solución */}
          {puedeVerSolucion && tieneSolucion && !grabando && (
            <button
              onClick={toggleSolucion}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                mostrandoSolucion
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {mostrandoSolucion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {mostrandoSolucion ? 'Ocultar solución' : 'Ver solución'}
            </button>
          )}
        </div>
      </div>

      {/* Tablero + Planilla */}
      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-stretch justify-center">

        {/* Comentarios de la solución (solo visible al grabar) */}
        {esProfesor && grabando && (
          <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Comentario de la solución
            </label>
            <textarea
              className="flex-1 w-full p-3 border border-slate-300 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 min-h-[200px]"
              value={comentarioSolucion}
              onChange={e => setComentarioSolucion(e.target.value)}
              placeholder="Explica la idea principal de la solución, conceptos clave, errores comunes a evitar..."
            />
          </div>
        )}

        {/* Comentario de la solución (lectura) al ver la solución */}
        {mostrandoSolucion && comentarioSolucion && (
          <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Comentario de la solución
            </label>
            <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {comentarioSolucion}
            </div>
          </div>
        )}

        {/* Tablero */}
        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c]">
          <ChessboardCore
            fen={fenVisible}
            squareStyles={estilosCombinados}
            orientation={orientacion}
            allowDragging={grabando}
            onPieceDrop={onPieceDrop}
            onPieceDrag={onPieceDrag}
            onSquareClick={onSquareClick}
          />
        </div>

        {/* Planilla */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 relative h-[350px] lg:h-auto">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2">
              <Planilla
                historialMovimientos={historialMovimientos}
                indiceVista={indiceVista}
                setIndiceVista={setIndiceVista}
                estamosEnElPresente={estamosEnElPresente}
                irAlInicio={irAlInicio}
                irAtras={irAtras}
                irAdelante={irAdelante}
                irAlFinal={irAlFinal}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Controles inferiores */}
      <div className="w-full mt-6 px-4 flex justify-end">
        <button
          onClick={() => setOrientacion(o => o === 'white' ? 'black' : 'white')}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Girar Tablero
        </button>
      </div>
    </div>
  );
}