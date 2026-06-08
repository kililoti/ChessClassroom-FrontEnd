'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import ExploradorArchivos from '@/components/explorador/ExploradorArchivos';
import JuegoAjedrez from '@/components/ajedrez/JuegoAjedrez';
import { Archivo } from '@/types/explorador';

export default function EstudiosCarpetaPage() {
  const params     = useParams();
  const claseId    = params.id as string;
  const carpetaId = params.carpeta_id as string;
  const [visorPgn, setVisorPgn] = useState<string | null>(null);

  const handleAbrirPartida = async (archivo: Archivo, indexPartida: number = 0) => {
    try {
      const token     = localStorage.getItem('token') ?? '';
      const archivoId = archivo.id.includes('-p-') ? archivo.id.split('-p-')[0] : archivo.id;

      const res  = await fetch(`http://localhost:3001/api/recursos/descargar/${archivoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fileRes = await fetch(data.url);
      let pgnTexto  = await fileRes.text();

      if (archivo.metadata.es_base_datos) {
        const bloques = pgnTexto.split(/(?=\[Event ")/g).filter(b => b.trim().startsWith('[Event'));
        pgnTexto = bloques[indexPartida] ?? pgnTexto;
      }

      setVisorPgn(pgnTexto.trim());
    } catch { alert('No se pudo cargar la partida.'); }
  };

  if (visorPgn !== null) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <JuegoAjedrez
          pgnInicial={visorPgn}
          onClose={() => setVisorPgn(null)}
          chatSalaId="75e576a4-b261-4dfa-8416-a09cd15e2125"
        />
      </div>
    );
  }

  return (
    <ExploradorArchivos
      modulo="estudio"
      titulo="Material de Estudio"
      icono={<BookOpen className="w-6 h-6 text-blue-600" />}
      claseId={claseId}
      carpetaId={carpetaId}
      basePath={`/clases/${claseId}/estudios`}
      onAbrirPartida={handleAbrirPartida}
    />
  );
}