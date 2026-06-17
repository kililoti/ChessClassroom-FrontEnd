'use client';

import { useParams, useRouter } from 'next/navigation';
import { Swords, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function JugarPage() {
  const params  = useParams();
  const router  = useRouter();
  const claseId = params.id as string;

  const opciones = [
    {
      titulo: 'Partidas',
      icono: <Swords className="w-10 h-10" />,
      color: 'amber',
      desc: 'Juega partidas en vivo contra tus compañeros o crea una partida abierta.',
      ruta: `/clases/${claseId}/partidas`,
    },
    {
      titulo: 'Torneos',
      icono: <Trophy className="w-10 h-10" />,
      color: 'orange',
      desc: 'Compite en torneos arena donde el sistema te empareja automáticamente.',
      ruta: `/clases/${claseId}/torneos`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Cabecera */}
        <div className="mb-10 flex items-center gap-4">
          <button
            onClick={() => router.push(`/clases/${claseId}`)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="text-3xl">♟️</span> Jugar
            </h1>
            <p className="mt-1 text-slate-500 font-medium">¿Qué quieres hacer?</p>
          </div>
        </div>

        {/* Opciones */}
        <div className="grid sm:grid-cols-2 gap-5">
          {opciones.map((op) => (
            <Link
              key={op.ruta}
              href={op.ruta}
              className={`group bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center gap-5 cursor-pointer
                ${op.color === 'amber'  ? 'hover:border-amber-300'  : ''}
                ${op.color === 'orange' ? 'hover:border-orange-300' : ''}
              `}
            >
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm
                ${op.color === 'amber'  ? 'bg-amber-50  text-amber-500  group-hover:bg-amber-500  group-hover:text-white' : ''}
                ${op.color === 'orange' ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white' : ''}
              `}>
                {op.icono}
              </div>
              <div>
                <h2 className={`text-2xl font-extrabold text-slate-900 transition-colors
                  ${op.color === 'amber'  ? 'group-hover:text-amber-600'  : ''}
                  ${op.color === 'orange' ? 'group-hover:text-orange-600' : ''}
                `}>
                  {op.titulo}
                </h2>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{op.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}