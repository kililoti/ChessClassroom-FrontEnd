'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '../../../components/chat/ChatContainer';
import Link from 'next/link';

interface DatosClase {
  id: string;
  nombre: string;
  tipo: 'grupal' | 'particular';
  salaIdPrincipal: string;
}

export default function VistaClasePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  
  const [clase, setClase] = useState<DatosClase | null>(null);

  useEffect(() => {
    const cargarDatosClase = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        const res = await fetch(`http://localhost:3001/api/clases/${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('No se pudo cargar la información de la clase');

        const data = await res.json();
        setClase({
          id: data.id,
          nombre: data.nombre,
          tipo: data.tipo,
          salaIdPrincipal: data.salaIdPrincipal
        });
      } catch (err: any) {
        console.error("Error de conexión:", err);
      }
    };

    cargarDatosClase();
  }, [id, router]);

  if (!clase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando entorno de clase...</div>
      </div>
    );
  }

  const secciones = [
    { titulo: 'Aula Virtual', ruta: `/clases/${clase.id}/aula`, icono: '💻', color: 'blue', desc: 'Pizarra interactiva y videollamada' },
    { titulo: 'Estudio', ruta: `/clases/${clase.id}/estudios`, icono: '📚', color: 'indigo', desc: 'Archivos PDF, teoría y recursos' },
    { titulo: 'Ejercicios', ruta: `/clases/${clase.id}/ejercicios`, icono: '🧩', color: 'emerald', desc: 'Problemas y tácticas asignadas' },
    { titulo: 'Partidas', ruta: `/clases/${clase.id}/partidas`, icono: '♟️', color: 'amber', desc: 'Juega en vivo o revisa el historial' },
    { titulo: 'Datos y ELO', ruta: `/clases/${clase.id}/estadisticas`, icono: '📊', color: 'purple', desc: 'Gráficas de rendimiento y evolución' },
    { titulo: 'Objetivos', ruta: `/clases/${clase.id}/objetivos`, icono: '🎯', color: 'rose', desc: 'Metas a superar a corto y largo plazo' },
    { titulo: 'Rutina', ruta: `/clases/${clase.id}/rutinas`, icono: '📅', color: 'cyan', desc: 'Calendario de entrenamiento semanal' },
  ];
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Cabecera */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm text-slate-600"
              title="Volver al dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                {clase.tipo === 'particular' ? (
                  <><span className="text-3xl">👤</span> Alumno: {clase.nombre}</>
                ) : (
                  <><span className="text-3xl">👥</span> Grupo: {clase.nombre}</>
                )}
              </h1>
              <p className="mt-1 text-slate-500 font-medium">Panel de control de la clase</p>
            </div>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Chat */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1">
              <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h2 className="font-bold text-slate-800">Chat de la clase</h2>
              </div>
              <div className="p-4">
                <ChatContainer salaId={clase.salaIdPrincipal} />
              </div>
            </div>
          </div>

          {/* Menú de navegación */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="grid sm:grid-cols-2 gap-5">
              {secciones.map((seccion, index) => (
                <Link
                  key={index}
                  href={seccion.ruta}
                  className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex items-start gap-4 cursor-pointer"
                >
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 shadow-sm
                    ${seccion.color === 'blue'    ? 'bg-blue-50    text-blue-600    group-hover:bg-blue-600    group-hover:text-white' : ''}
                    ${seccion.color === 'indigo'  ? 'bg-indigo-50  text-indigo-600  group-hover:bg-indigo-600  group-hover:text-white' : ''}
                    ${seccion.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : ''}
                    ${seccion.color === 'amber'   ? 'bg-amber-50   text-amber-600   group-hover:bg-amber-600   group-hover:text-white' : ''}
                    ${seccion.color === 'purple'  ? 'bg-purple-50  text-purple-600  group-hover:bg-purple-600  group-hover:text-white' : ''}
                    ${seccion.color === 'rose'    ? 'bg-rose-50    text-rose-600    group-hover:bg-rose-600    group-hover:text-white' : ''}
                    ${seccion.color === 'cyan'    ? 'bg-cyan-50    text-cyan-600    group-hover:bg-cyan-600    group-hover:text-white' : ''}
                  `}>
                    {seccion.icono}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold text-slate-900 transition-colors
                      ${seccion.color === 'blue'    ? 'group-hover:text-blue-600'    : ''}
                      ${seccion.color === 'indigo'  ? 'group-hover:text-indigo-600'  : ''}
                      ${seccion.color === 'emerald' ? 'group-hover:text-emerald-600' : ''}
                      ${seccion.color === 'amber'   ? 'group-hover:text-amber-600'   : ''}
                      ${seccion.color === 'purple'  ? 'group-hover:text-purple-600'  : ''}
                      ${seccion.color === 'rose'    ? 'group-hover:text-rose-600'    : ''}
                      ${seccion.color === 'cyan'    ? 'group-hover:text-cyan-600'    : ''}
                    `}>
                      {seccion.titulo}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{seccion.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}