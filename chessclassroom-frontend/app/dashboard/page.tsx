'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CalendarioMensualGlobal from '@/components/dashboard/CalendarioMensualGlobal';

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  // Efecto para verificar la sesión al cargar la página
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (!token || !usuarioGuardado) {
      // Si no hay sesión, se expulsa al login
      router.push('/login');
    } else {
      // Si hay sesión, carga sus datos
      setUsuario(JSON.parse(usuarioGuardado));
      setCargando(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    router.push('/login');
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando tu panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* --- BARRA SUPERIOR (NAVBAR PRIVADA) --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-slate-800">♞</span>
            <span className="font-bold text-slate-800 tracking-tight">
              Chess<span className="text-blue-600">Classroom</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-600 hidden sm:block">
              {usuario?.nombre}
            </span>
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              {usuario?.rol === 'profesor' ? 'Profesor' : 'Alumno'}
            </span>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Cabecera de bienvenida */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Hola, {usuario?.nombre} 👋
          </h1>
          <p className="mt-2 text-slate-500 text-lg">
            ¿Qué te gustaría gestionar hoy?
          </p>
        </div>

        {/* --- TARJETAS DE NAVEGACIÓN --- */}
        <div className="grid sm:grid-cols-2 gap-6">

          {/* Tarjeta 1: Alumnos Particulares */}
          <Link href="/dashboard/particulares" className="group">
            <div className="bg-white h-full border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                ♟️
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                Clases Particulares
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Gestiona tus clases 1 a 1, analiza el progreso individual de cada alumno, su ELO y el historial de sus partidas.
              </p>
            </div>
          </Link>

          {/* Tarjeta 2: Clases Grupales */}
          <Link href="/dashboard/grupales" className="group">
            <div className="bg-white h-full border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:indigo-300 transition-all duration-300 cursor-pointer flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                👥
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                Clases Grupales
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Organiza sesiones conjuntas, sube material didáctico, asigna tareas al grupo y planifica torneos de práctica.
              </p>
            </div>
          </Link>
        </div>

        {/* Calendario global — ancho completo, fuera del grid de 2 columnas */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📅 Mis eventos</h2>
          <CalendarioMensualGlobal />
        </div>

      </main>
    </div>
  );
}