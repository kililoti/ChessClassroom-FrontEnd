'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import ExploradorArchivos from '@/components/explorador/ExploradorArchivos';
import JuegoAjedrez from '@/components/ajedrez/JuegoAjedrez';
import ChatContainer from '@/components/chat/ChatContainer';
import { Archivo } from '@/types/explorador';

const API = `${process.env.NEXT_PUBLIC_API_URL}/recursos`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export default function EstudiosCarpetaPage() {
  const params    = useParams();
  const claseId   = params.id as string;
  const carpetaId = params.carpeta_id as string;

  const [visorPgn, setVisorPgn]           = useState<string | null>(null);
  const [archivoActual, setArchivoActual] = useState<Archivo | null>(null);
  const [salaCarpetaId, setSalaCarpetaId] = useState<string | null>(null);

  useEffect(() => {
    if (!carpetaId) return;
    fetch(`${API}/carpetas/${carpetaId}/sala-chat`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success && d.salaId) setSalaCarpetaId(d.salaId); })
      .catch(() => {});
  }, [carpetaId]);

  const handleAbrirPartida = async (archivo: Archivo, indexPartida: number = 0) => {
    try {
      const token     = getToken();
      const archivoId = archivo.id.includes('-p-') ? archivo.id.split('-p-')[0] : archivo.id;
      const res       = await fetch(`${API}/descargar/${archivoId}`, {
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

      setArchivoActual(archivo);
      setVisorPgn(pgnTexto.trim());
    } catch { alert('No se pudo cargar la partida.'); }
  };

  if (visorPgn !== null) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <JuegoAjedrez
          pgnInicial={visorPgn}
          onClose={() => { setVisorPgn(null); setArchivoActual(null); }}
          mostrarStockfish={true}
        />
      </div>
    );
  }

  const chatSlot = salaCarpetaId ? (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h2 className="font-bold text-slate-800">Chat de la carpeta</h2>
      </div>
      <div className="h-[500px]">
        <ChatContainer salaId={salaCarpetaId} />
      </div>
    </div>
  ) : undefined;

  return (
    <ExploradorArchivos
      modulo="estudio"
      titulo="Material de Estudio"
      icono={<BookOpen className="w-6 h-6 text-blue-600" />}
      claseId={claseId}
      carpetaId={carpetaId}
      basePath={`/clases/${claseId}/estudios`}
      onAbrirPartida={handleAbrirPartida}
      chatSlot={chatSlot}
    />
  );
}