'use client';

import { createContext, useContext, useState } from 'react';

interface TorneoActivoContextValue {
  torneoActivoId: string | null;
  setTorneoActivoId: (id: string | null) => void;
  pingActivo: boolean;
  setPingActivo: (activo: boolean) => void;
}

const TorneoActivoContext = createContext<TorneoActivoContextValue>({
  torneoActivoId: null,
  setTorneoActivoId: () => {},
  pingActivo: false,
  setPingActivo: () => {},
});

export function useTorneoActivo() {
  return useContext(TorneoActivoContext);
}

export function TorneoActivoProvider({ children }: { children: React.ReactNode }) {
  const [torneoActivoId, setTorneoActivoId] = useState<string | null>(null);
  const [pingActivo, setPingActivo]         = useState(false);

  return (
    <TorneoActivoContext.Provider value={{ torneoActivoId, setTorneoActivoId, pingActivo, setPingActivo }}>
      {children}
    </TorneoActivoContext.Provider>
  );
}