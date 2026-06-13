'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLiveKit } from '@/contexts/LiveKitContext';

function IconMic({ activo }: { activo: boolean }) {
  if (activo) return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
    </svg>
  );
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    </svg>
  );
}

function BarrasVoz({ hablando }: { hablando: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: '3px',
          borderRadius: '2px',
          background: hablando ? '#22c55e' : '#d1d5db',
          height: hablando ? `${[6, 14, 10, 12][i]}px` : '4px',
          transition: 'height 0.15s ease, background 0.15s ease',
          animation: hablando ? `bar${i} 0.7s ease-in-out infinite ${i * 0.1}s` : 'none'
        }} />
      ))}
      <style>{`
        @keyframes bar0 { 0%,100%{height:6px} 50%{height:14px} }
        @keyframes bar1 { 0%,100%{height:14px} 50%{height:6px} }
        @keyframes bar2 { 0%,100%{height:10px} 50%{height:16px} }
        @keyframes bar3 { 0%,100%{height:12px} 50%{height:5px} }
      `}</style>
    </div>
  );
}

export default function WidgetVoz() {
  const pathname = usePathname();
  const {
    conectado, micActivo, muteadoPorProfesor,
    participantesVoz, salir, toggleMic
  } = useLiveKit();

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, initLeft: 0, initTop: 0 });
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const guardada = localStorage.getItem('widget-voz-pos');
    if (guardada) {
      setPos(JSON.parse(guardada));
    } else {
      setPos({ left: window.innerWidth - 260, top: window.innerHeight - 180 });
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initLeft: rect.left,
      initTop: rect.top
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth - 240, dragRef.current.initLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - 160, dragRef.current.initTop + dy));
      setPos({ left: newLeft, top: newTop });
    };

    const onMouseUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      setPos(prev => {
        if (prev) localStorage.setItem('widget-voz-pos', JSON.stringify(prev));
        return prev;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // No mostrar si no está conectado, no tiene posición, o está en la página del aula
  if (!conectado || !pos || pathname.includes('/aula')) return null;

  const yo = participantesVoz.find(p => p.isLocal);
  const micBloqueado = muteadoPorProfesor;
  const micVisible = micActivo && !muteadoPorProfesor;
  const silenciado = !micActivo || muteadoPorProfesor;

  const bordeColor = yo?.isSpeaking && !silenciado ? '#22c55e' : silenciado ? '#ef4444' : '#e2e8f0';
  const bgAvatar = yo?.isSpeaking && !silenciado ? '#dcfce7' : silenciado ? '#fee2e2' : '#eff6ff';
  const colorAvatar = yo?.isSpeaking && !silenciado ? '#15803d' : silenciado ? '#b91c1c' : '#1d4ed8';

  const estadoTexto = () => {
    if (muteadoPorProfesor) return 'Muteado por el profesor';
    if (!micActivo) return 'Micrófono silenciado';
    if (yo?.isSpeaking) return 'Hablando...';
    return 'Conectado';
  };

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
        width: '236px',
        background: 'white',
        border: `2px solid ${bordeColor}`,
        borderRadius: '16px',
        padding: '10px 12px',
        transition: 'border-color 0.2s ease',
        userSelect: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
      }}
    >
      {/* Cabecera arrastrable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px', cursor: 'grab'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Sala de voz</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {participantesVoz.length} conectados
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8">
            <circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/>
            <circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/>
          </svg>
        </div>
      </div>

      {/* Info usuario */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 8px', borderRadius: '10px',
        background: yo?.isSpeaking && !silenciado ? '#f0fdf4' : silenciado ? '#fef2f2' : '#f8fafc',
        border: `1px solid ${yo?.isSpeaking && !silenciado ? '#bbf7d0' : silenciado ? '#fecaca' : '#e2e8f0'}`,
        marginBottom: '10px'
      }}>
        <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
          {yo?.isSpeaking && !silenciado && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: '#22c55e', opacity: 0.3,
              animation: 'pulse-ring 1.2s ease-out infinite'
            }} />
          )}
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: bgAvatar, color: colorAvatar,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 600, position: 'relative', zIndex: 1,
            outline: yo?.isSpeaking && !silenciado ? '2px solid #22c55e' : 'none',
            outlineOffset: '2px'
          }}>
            {yo?.nombre?.slice(0, 2).toUpperCase() ?? 'YO'}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '12px', fontWeight: 600, margin: 0,
            color: yo?.isSpeaking && !silenciado ? '#15803d' : silenciado ? '#b91c1c' : '#0f172a',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {yo?.nombre ?? 'Tú'}
          </p>
          <p style={{
            fontSize: '11px', margin: 0,
            color: yo?.isSpeaking && !silenciado ? '#16a34a' : silenciado ? '#dc2626' : '#64748b'
          }}>
            {estadoTexto()}
          </p>
        </div>

        <BarrasVoz hablando={!!yo?.isSpeaking && micVisible} />
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Mic */}
        <button
          onClick={toggleMic}
          disabled={micBloqueado}
          title={micBloqueado ? 'Muteado por el profesor' : micActivo ? 'Silenciar' : 'Activar micrófono'}
          style={{
            flex: 1, padding: '6px', borderRadius: '8px',
            cursor: micBloqueado ? 'not-allowed' : 'pointer',
            background: !micActivo || micBloqueado ? '#fee2e2' : '#f1f5f9',
            color: !micActivo || micBloqueado ? '#b91c1c' : '#475569',
            border: `0.5px solid ${!micActivo || micBloqueado ? '#fca5a5' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: micBloqueado ? 0.6 : 1
          }}
        >
          <IconMic activo={micVisible} />
        </button>

        {/* Salir */}
        <button
          onClick={salir}
          title="Salir de la sala"
          style={{
            flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer',
            background: '#fee2e2', color: '#b91c1c',
            border: '0.5px solid #fca5a5',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}