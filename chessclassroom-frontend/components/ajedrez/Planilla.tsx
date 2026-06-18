'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { NodoMovimiento } from '@/hooks/useChessGame';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilaMovimiento {
  tipo: 'fila';
  numDisplay: string;            // "1", "2", "5.a", "5.a.a"
  nodoBlancasId: string | null;
  nodoNegrasId:  string | null;
  profundidad: number;           // 0 = main line, 1 = variant, 2 = nested variant
}

interface CabeceraVariante {
  tipo: 'cabecera';
  label: string;                 // "5.a", "5.a.a"
  profundidad: number;
}

type ElementoPlanilla = FilaMovimiento | CabeceraVariante;

// ── Row generator ─────────────────────────────────────────────────────────────
// Traverses the move tree depth-first and produces a flat list of display rows.

function generarElementos(
  nodos: Record<string, NodoMovimiento>,
  startId: string | null,
  varLabel: string,  // "" = main line | "a" = 1st variant | "a.a" = nested
  prof: number
): ElementoPlanilla[] {
  const elems: ElementoPlanilla[] = [];
  let id: string | null = startId;

  while (id) {
    const n = nodos[id];
    if (!n) break;

    // ── Line starting with black (variant starts on black's move) ───────────
    if (n.color === 'b') {
      const nd = varLabel ? `${n.numJugada}.${varLabel}` : `${n.numJugada}`;
      elems.push({ tipo: 'fila', numDisplay: nd, nodoBlancasId: null, nodoNegrasId: id, profundidad: prof });

      // Sub-variants: alternative white next moves
      for (let i = 1; i < n.hijos.length; i++) {
        const vn = nodos[n.hijos[i]];
        const vl = varLabel ? `${varLabel}.${'abcdefgh'[i - 1]}` : 'abcdefgh'[i - 1];
        elems.push({ tipo: 'cabecera', label: `${vn.numJugada}.${vl}`, profundidad: prof + 1 });
        elems.push(...generarElementos(nodos, n.hijos[i], vl, prof + 1));
      }

      id = n.hijos[0] ?? null;
      continue;
    }

    // ── White move — pair with black's response ───────────────────────────────
    const negroId   = n.hijos[0] ?? null;
    const negroNodo = negroId ? nodos[negroId] : null;
    const nd        = varLabel ? `${n.numJugada}.${varLabel}` : `${n.numJugada}`;

    elems.push({ tipo: 'fila', numDisplay: nd, nodoBlancasId: id, nodoNegrasId: negroId, profundidad: prof });

    // Variants: alternative black responses after this white move
    for (let i = 1; i < n.hijos.length; i++) {
      const vl     = varLabel ? `${varLabel}.${'abcdefgh'[i - 1]}` : 'abcdefgh'[i - 1];
      const hLabel = `${n.numJugada}.${vl}`;
      elems.push({ tipo: 'cabecera', label: hLabel, profundidad: prof + 1 });
      // First row: same white move + variant black response
      elems.push({ tipo: 'fila', numDisplay: hLabel, nodoBlancasId: id, nodoNegrasId: n.hijos[i], profundidad: prof + 1 });
      // Continue variant from black's continuation
      elems.push(...generarElementos(nodos, nodos[n.hijos[i]].hijos[0] ?? null, vl, prof + 1));
    }

    // Variants: alternative white moves after black's response
    if (negroNodo) {
      for (let i = 1; i < negroNodo.hijos.length; i++) {
        const vn = nodos[negroNodo.hijos[i]];
        const vl = varLabel ? `${varLabel}.${'abcdefgh'[i - 1]}` : 'abcdefgh'[i - 1];
        elems.push({ tipo: 'cabecera', label: `${vn.numJugada}.${vl}`, profundidad: prof + 1 });
        elems.push(...generarElementos(nodos, negroNodo.hijos[i], vl, prof + 1));
      }
      id = negroNodo.hijos[0] ?? null;
    } else {
      break;
    }
  }

  return elems;
}

// ── Styling helpers ───────────────────────────────────────────────────────────

// Returns classes for the ROW/HEADER container at a given variant depth.
// Level 0 = main line (no indent, no border).
// Level 1+ = indented with a colored left border acting as the vertical |.
function variantClasses(prof: number): string {
  if (prof === 0) return '';
  const indent = prof === 1 ? 'pl-3' : prof === 2 ? 'pl-6' : 'pl-9';
  const border  = prof === 1
    ? 'border-l-[3px] border-l-[#20688c]/70'
    : prof === 2
      ? 'border-l-[3px] border-l-purple-400/60'
      : 'border-l-[3px] border-l-amber-400/50';
  const bg = prof === 1 ? 'bg-[#1e1c1a]' : prof === 2 ? 'bg-[#1c1a18]' : 'bg-[#1a1816]';
  return `${indent} ${border} ${bg}`;
}

const DEPTH_TEXT: Record<number, string> = { 0: 'text-[#bababa]', 1: 'text-[#909090]', 2: 'text-[#707070]' };
const getTextColor = (d: number) => DEPTH_TEXT[d] ?? 'text-[#606060]';

const DEPTH_HEADER_COLOR: Record<number, string> = { 1: 'text-[#20688c]', 2: 'text-purple-400' };
const getHeaderColor = (d: number) => DEPTH_HEADER_COLOR[d] ?? 'text-amber-400';

// ── Component ─────────────────────────────────────────────────────────────────

export interface PlanillaProps {
  nodos: Record<string, NodoMovimiento>;
  nodoActualId: string;
  irANodo: (id: string) => void;
  estamosEnElPresente: boolean;
  irAlInicio: () => void;
  irAtras: () => void;
  irAdelante: () => void;
  irAlFinal: () => void;
}

export default function Planilla({
  nodos,
  nodoActualId,
  irANodo,
  estamosEnElPresente,
  irAlInicio,
  irAtras,
  irAdelante,
  irAlFinal,
}: PlanillaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const activeRowRef  = useRef<HTMLDivElement>(null);

  const elementos = useMemo(() => {
    const primerHijo = nodos['root']?.hijos[0] ?? null;
    return generarElementos(nodos, primerHijo, '', 0);
  }, [nodos]);

  const sinMovimientos = elementos.length === 0;
  const enRaiz = nodoActualId === 'root';

  useEffect(() => {
    if (estamosEnElPresente && contenedorRef.current) {
      contenedorRef.current.scrollTop = contenedorRef.current.scrollHeight;
    } else if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [nodoActualId, estamosEnElPresente]);

  return (
    <div className="flex flex-col w-full h-full bg-[#262421] text-[#bababa] rounded-lg shadow-inner overflow-hidden font-sans border border-[#302e2c]">

      {/* Title bar */}
      <div className="bg-[#1e1c1a] py-2.5 text-xs font-semibold text-center border-b border-[#302e2c] uppercase tracking-wider text-slate-400 shrink-0">
        Registro de Jugadas
      </div>

      {/* Column headers */}
      {!sinMovimientos && (
        <div className="grid grid-cols-[3.5rem_1fr_1fr] text-[10px] font-bold uppercase tracking-wider text-[#4a4845] bg-[#1e1c1a] border-b border-[#302e2c] shrink-0 select-none">
          <div className="px-2 py-1.5 text-center border-r border-[#302e2c]">#</div>
          <div className="px-3 py-1.5 border-r border-[#302e2c]/60">Blancas</div>
          <div className="px-3 py-1.5">Negras</div>
        </div>
      )}

      {/* Rows */}
      <div ref={contenedorRef} className="flex-1 overflow-y-auto">
        {sinMovimientos ? (
          <div className="h-full flex items-center justify-center text-sm text-[#5f5d5b] italic">
            La partida no ha comenzado
          </div>
        ) : (
          elementos.map((elem, i) => {

            // ── Variant header ────────────────────────────────────────────────
            if (elem.tipo === 'cabecera') {
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 py-1 pr-2 border-y border-[#302e2c]/60 ${variantClasses(elem.profundidad)}`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${getHeaderColor(elem.profundidad)}`}>
                    Var. {elem.label}
                  </span>
                  <div className="flex-1 h-px bg-[#302e2c]" />
                </div>
              );
            }

            // ── Move row ──────────────────────────────────────────────────────
            const esActivaB = elem.nodoBlancasId === nodoActualId;
            const esActivaN = elem.nodoNegrasId  === nodoActualId;
            const esActiva  = esActivaB || esActivaN;
            const textColor = getTextColor(elem.profundidad);

            return (
              <div
                key={i}
                ref={esActiva ? activeRowRef : undefined}
                className={`grid grid-cols-[3.5rem_1fr_1fr] border-b border-[#302e2c]/30 ${variantClasses(elem.profundidad)}`}
              >
                {/* Turn number */}
                <div className={`flex items-center justify-center px-1 border-r border-[#302e2c] select-none ${elem.profundidad === 0 ? 'py-2' : 'py-1'}`}>
                  <span className={`text-[#6b6b6b] leading-tight text-center tabular-nums ${elem.profundidad === 0 ? 'text-[10px]' : 'text-[9px]'}`}>
                    {elem.numDisplay}
                  </span>
                </div>

                {/* White move */}
                <button
                  onClick={() => elem.nodoBlancasId && irANodo(elem.nodoBlancasId)}
                  disabled={!elem.nodoBlancasId}
                  className={`px-3 text-left border-r border-[#302e2c]/60 transition-colors
                    ${elem.profundidad === 0 ? 'py-2 text-sm' : 'py-1 text-xs'}
                    ${esActivaB
                      ? 'bg-[#20688c] text-white font-semibold'
                      : elem.nodoBlancasId
                        ? `${textColor} hover:bg-[#383634] cursor-pointer`
                        : 'cursor-default'
                    }`}
                >
                  {elem.nodoBlancasId ? (nodos[elem.nodoBlancasId]?.san ?? '') : ''}
                </button>

                {/* Black move */}
                <button
                  onClick={() => elem.nodoNegrasId && irANodo(elem.nodoNegrasId)}
                  disabled={!elem.nodoNegrasId}
                  className={`px-3 text-left transition-colors
                    ${elem.profundidad === 0 ? 'py-2 text-sm' : 'py-1 text-xs'}
                    ${esActivaN
                      ? 'bg-[#20688c] text-white font-semibold'
                      : elem.nodoNegrasId
                        ? `${textColor} hover:bg-[#383634] cursor-pointer`
                        : 'cursor-default'
                    }`}
                >
                  {elem.nodoNegrasId ? (nodos[elem.nodoNegrasId]?.san ?? '') : ''}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex bg-[#1e1c1a] border-t border-[#302e2c] text-[#8e8c8a] shrink-0">
        <button onClick={irAlInicio} disabled={enRaiz}
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center cursor-pointer">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 12.5v6H4v-13h2v6l10-6v13zM18 5.5h-2v13h2z"/>
          </svg>
        </button>
        <button onClick={irAtras} disabled={enRaiz}
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50 cursor-pointer">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16 5.5l-10 6.5 10 6.5z"/></svg>
        </button>
        <button onClick={irAdelante} disabled={estamosEnElPresente}
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50 cursor-pointer">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 18.5l10-6.5-10-6.5z"/></svg>
        </button>
        <button onClick={irAlFinal} disabled={estamosEnElPresente}
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50 cursor-pointer">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 11.5v-6h2v13h-2v-6l-10 6v-13zM6 5.5h2v13H6z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}