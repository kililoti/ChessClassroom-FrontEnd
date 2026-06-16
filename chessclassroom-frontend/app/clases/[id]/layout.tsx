'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PresenciaProvider, usePresencia } from '@/contexts/PresenciaContext';
import { LiveKitProvider } from '@/contexts/LiveKitContext';
import { ChallengesProvider } from '@/contexts/ChallengesContext';
import { TorneoActivoProvider, useTorneoActivo } from '@/contexts/TorneoActivoContext';
import WidgetVoz from '@/components/aula/WidgetVoz';
import WidgetChallenge from '@/components/partidas/WidgetChallenge';
import WidgetEmparejamiento from '@/components/torneos/WidgetEmparejamiento';

function ClaseLayoutInner({ children, claseId }: { children: React.ReactNode; claseId: string }) {
  const { actualizarEnVoz } = usePresencia();
  const { torneoActivoId, pingActivo } = useTorneoActivo();

  // Heartbeat: solo pinga cuando el jugador está activo (en torneo o en partida en curso)
  useEffect(() => {
    if (!torneoActivoId || !pingActivo || !claseId) return;
    const ping = () => fetch(`http://localhost:3001/api/torneos/${torneoActivoId}/ping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''}`,
      },
    }).catch(() => {});
    ping();
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, [torneoActivoId, pingActivo, claseId]);

  return (
    <LiveKitProvider onSalir={() => { actualizarEnVoz(false); }}>
      <ChallengesProvider claseId={claseId}>
        {children}
        <WidgetVoz />
        <WidgetChallenge />
        <WidgetEmparejamiento torneoId={torneoActivoId} claseId={claseId} />
      </ChallengesProvider>
    </LiveKitProvider>
  );
}

export default function ClaseLayout({ children }: { children: React.ReactNode }) {
  const params  = useParams();
  const claseId = params?.id as string;

  return (
    <PresenciaProvider>
      <TorneoActivoProvider>
        <ClaseLayoutInner claseId={claseId}>
          {children}
        </ClaseLayoutInner>
      </TorneoActivoProvider>
    </PresenciaProvider>
  );
}