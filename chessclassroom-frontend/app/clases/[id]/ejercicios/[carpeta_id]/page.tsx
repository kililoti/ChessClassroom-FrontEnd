'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookMarked } from 'lucide-react';
import ExploradorArchivos from '@/components/explorador/ExploradorArchivos';
import ChatContainer from '@/components/chat/ChatContainer';
import { Archivo } from '@/types/explorador';

const API = 'http://localhost:3001/api/recursos';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export default function EjerciciosCarpetaPage() {
  const params    = useParams();
  const router    = useRouter();
  const claseId   = params.id as string;
  const carpetaId = params.carpeta_id as string;

  const [salaCarpetaId, setSalaCarpetaId] = useState<string | null>(null);

  useEffect(() => {
    if (!carpetaId) return;
    fetch(`${API}/carpetas/${carpetaId}/sala-chat`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.salaId) setSalaCarpetaId(d.salaId); })
      .catch(() => {});
  }, [carpetaId]);

  const handleAbrirEjercicio = (archivo: Archivo) => {
    router.push(`/clases/${claseId}/ejercicios/${carpetaId}/ejercicio/${archivo.id}`);
  };

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
      modulo="ejercicio"
      titulo="Ejercicios"
      icono={<BookMarked className="w-6 h-6 text-emerald-600" />}
      claseId={claseId}
      carpetaId={carpetaId}
      basePath={`/clases/${claseId}/ejercicios`}
      onAbrirPartida={handleAbrirEjercicio}
      chatSlot={chatSlot}
    />
  );
}