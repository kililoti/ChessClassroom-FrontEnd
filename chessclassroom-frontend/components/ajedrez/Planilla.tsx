'use client';

import React, { useEffect, useRef } from 'react';

// Interfaz que define estrictamente qué datos y funciones recibe del padre
export interface PlanillaProps {
  historialMovimientos: any[];
  indiceVista: number;
  setIndiceVista: (indice: number) => void;
  estamosEnElPresente: boolean;
  irAlInicio: () => void;
  irAtras: () => void;
  irAdelante: () => void;
  irAlFinal: () => void;
}

export default function Planilla({
  historialMovimientos,
  indiceVista,
  setIndiceVista,
  estamosEnElPresente,
  irAlInicio,
  irAtras,
  irAdelante,
  irAlFinal
}: PlanillaProps) {
  
  // Referencia para poder hacer scroll automático
  const historialRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay un movimiento nuevo en el presente
  useEffect(() => {
    if (estamosEnElPresente && historialRef.current) {
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
    }
  }, [historialMovimientos.length, estamosEnElPresente]);

  // Agrupamos los movimientos en pares (Turno: Blancas, Negras)
  const paresMovimientos = [];
  for (let i = 0; i < historialMovimientos.length; i += 2) {
    paresMovimientos.push({
      turno: Math.floor(i / 2) + 1,
      blancas: historialMovimientos[i],
      indiceBlancas: i + 1,
      negras: historialMovimientos[i + 1] ? historialMovimientos[i + 1] : null,
      indiceNegras: i + 2,
    });
  }

  return (
    <div className="flex flex-col w-full h-full min-h-[400px] bg-[#262421] text-[#bababa] rounded-lg shadow-inner overflow-hidden font-sans border border-[#302e2c]">
      
      {/* Cabecera de la planilla */}
      <div className="bg-[#1e1c1a] p-3 text-xs font-semibold text-center border-b border-[#302e2c] uppercase tracking-wider text-slate-400">
        Registro de Jugadas
      </div>

      {/* Lista de movimientos con Scroll */}
      <div ref={historialRef} className="flex-1 overflow-y-auto bg-[#262421]">
        {paresMovimientos.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-[#5f5d5b] italic">
            La partida no ha comenzado
          </div>
        ) : (
          paresMovimientos.map((par, idx) => (
            <div key={idx} className="flex text-sm hover:bg-[#302e2c] transition-colors border-b border-[#302e2c]/30">
              
              {/* Número de turno */}
              <div className="w-12 text-center py-2 bg-[#302e2c] text-[#6b6b6b] select-none">
                {par.turno}
              </div>
              
              {/* Jugada Blanca */}
              <div 
                onClick={() => setIndiceVista(par.indiceBlancas)}
                className={`flex-1 px-4 py-2 cursor-pointer transition-colors ${
                  indiceVista === par.indiceBlancas 
                    ? 'bg-[#20688c] text-white font-medium' // Azul brillante si es el turno actual
                    : 'hover:bg-[#383634]'
                }`}
              >
                {par.blancas.san}
              </div>
              
              {/* Jugada Negra */}
              <div 
                onClick={() => par.negras && setIndiceVista(par.indiceNegras)}
                className={`flex-1 px-4 py-2 cursor-pointer transition-colors ${!par.negras ? 'cursor-default' : ''} ${
                  indiceVista === par.indiceNegras 
                    ? 'bg-[#20688c] text-white font-medium' 
                    : par.negras ? 'hover:bg-[#383634]' : ''
                }`}
              >
                {par.negras?.san}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Controles de Navegación Inferiores */}
      <div className="flex bg-[#1e1c1a] border-t border-[#302e2c] text-[#8e8c8a] shrink-0">
        
        {/* Botón Ir al Inicio */}
        <button 
          onClick={irAlInicio} 
          disabled={indiceVista === 0} 
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center"
        >
          {/* ICONO INTERCAMBIADO (Antes estaba en Ir al Final) */}
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 12.5v6H4v-13h2v6l10-6v13zM18 5.5h-2v13h2z"/>
          </svg>
        </button>
        
        {/* Botón Atrás */}
        <button 
          onClick={irAtras} 
          disabled={indiceVista === 0} 
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50"
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16 5.5l-10 6.5 10 6.5z"/></svg>
        </button>
        
        {/* Botón Adelante */}
        <button 
          onClick={irAdelante} 
          disabled={estamosEnElPresente} 
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50"
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M8 18.5l10-6.5-10-6.5z"/></svg>
        </button>
        
        {/* Botón Ir al Final */}
        <button 
          onClick={irAlFinal} 
          disabled={estamosEnElPresente} 
          className="flex-1 py-3 hover:bg-[#302e2c] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex justify-center border-l border-[#302e2c]/50"
        >
          {/* ICONO INTERCAMBIADO (Antes estaba en Ir al Inicio) */}
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 11.5v-6h2v13h-2v-6l-10 6v-13zM6 5.5h2v13H6z"/>
          </svg>
        </button>
        
      </div>
    </div>
  );
}