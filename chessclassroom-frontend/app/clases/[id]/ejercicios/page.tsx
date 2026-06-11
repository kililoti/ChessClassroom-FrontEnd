'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookMarked } from 'lucide-react';
import ExploradorArchivos from '@/components/explorador/ExploradorArchivos';
import ChatContainer from '@/components/chat/ChatContainer';
import { Archivo } from '@/types/explorador';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export default function EjerciciosPage() {
  const params  = useParams();
  const router  = useRouter();
  const claseId = params.id as string;

  const [salaEjercicioId, setSalaEjercicioId] = useState<string | null>(null);

  useEffect(() => {
    if (!claseId) return;
    fetch('http://localhost:3001/api/chats', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        const salas: any[] = d.data ?? [];
        const sala = salas.find(s => s.clase_id === claseId && s.tipo === 'clase_ejercicio');
        if (sala) setSalaEjercicioId(sala.id);
      })
      .catch(() => {});
  }, [claseId]);

  // Siempre navegar con router.push para no acumular historial del ejercicio
  const handleAbrirEjercicio = (archivo: Archivo) => {
    router.push(`/clases/${claseId}/ejercicios/ejercicio/${archivo.id}`);
  };

  const chatSlot = salaEjercicioId ? (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h2 className="font-bold text-slate-800">Chat de Ejercicios</h2>
      </div>
      <div className="h-[500px]">
        <ChatContainer salaId={salaEjercicioId} />
      </div>
    </div>
  ) : undefined;

  return (
    <ExploradorArchivos
      modulo="ejercicio"
      titulo="Ejercicios"
      icono={<BookMarked className="w-6 h-6 text-emerald-600" />}
      claseId={claseId}
      basePath={`/clases/${claseId}/ejercicios`}
      rutaVolver={`/clases/${claseId}`}
      onAbrirPartida={handleAbrirEjercicio}
      chatSlot={chatSlot}
    />
  );
}