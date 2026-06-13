'use client';

import { PresenciaProvider, usePresencia } from '@/contexts/PresenciaContext';
import { LiveKitProvider } from '@/contexts/LiveKitContext';
import WidgetVoz from '@/components/aula/WidgetVoz';

function ClaseLayoutInner({ children }: { children: React.ReactNode }) {
  const { actualizarEnVoz, limpiar } = usePresencia();

  return (
    <LiveKitProvider onSalir={() => {
      actualizarEnVoz(false);
      // No limpiar aquí — AulaPage se encarga cuando sale del aula
    }}>
      {children}
      <WidgetVoz />
    </LiveKitProvider>
  );
}

export default function ClaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <PresenciaProvider>
      <ClaseLayoutInner>
        {children}
      </ClaseLayoutInner>
    </PresenciaProvider>
  );
}